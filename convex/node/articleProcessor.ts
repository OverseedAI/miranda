'use node';

import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { components, internal } from '../_generated/api';
import { Agent, createThread, createTool } from '@convex-dev/agent';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Id } from '../_generated/dataModel';

type ProcessResult =
    | { status: 'completed' }
    | { status: 'skipped'; articleId: Id<'articles'> }
    | { status: 'processed'; articleId: Id<'articles'> }
    | { status: 'error'; articleId: Id<'articles'>; error: string };

/**
 * Agent for extracting main content from news articles.
 * Uses AI to parse HTML and extract the relevant text.
 */
const contentExtractorAgent = new Agent(components.agent, {
    name: 'Article Content Extractor',
    languageModel: openai.chat('gpt-4o-mini'),
    instructions: `
    You are an AI tool that extracts the main content from news articles.
    Given the HTML content of a news article, extract:
    1. The main article text (remove ads, navigation, sidebars, comments)
    2. Keep the article structure (paragraphs, headings if relevant)
    3. Return clean, readable text

    Be concise and focus only on the article's actual content.
    `,
    tools: {
        fetchArticle: createTool({
            description: 'Fetches the HTML content of a news article given its URL.',
            args: z.object({
                url: z.string().url(),
            }),
            handler: async (_ctx, args) => {
                try {
                    const response = await fetch(args.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
                        },
                    });
                    if (!response.ok) {
                        return { error: `Failed to fetch: ${response.status} ${response.statusText}` };
                    }
                    const html = await response.text();
                    // Return truncated HTML to avoid token limits
                    return { html: html.slice(0, 50000) };
                } catch (error) {
                    return { error: `Fetch error: ${(error as Error).message}` };
                }
            },
        }),
    },
    maxSteps: 5,
});

/**
 * Processes the next article in the queue.
 * Fetches content, extracts main text via AI, then schedules the analyzer.
 */
export const processNextArticle = internalAction({
    args: {
        scanId: v.id('scans'),
    },
    returns: v.object({
        status: v.string(),
        articleId: v.optional(v.id('articles')),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args): Promise<ProcessResult> => {
        const { scanId } = args;

        // Get the next article from the queue
        const nextArticleId: Id<'articles'> | null = await ctx.runMutation(
            internal.services.queue.popNextArticle,
            { scanId }
        );

        if (!nextArticleId) {
            // Queue is empty, complete the scan
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: 'All articles processed. Completing scan...',
            });
            await ctx.runMutation(internal.services.scans.updateScanStatus, {
                scanId,
                status: 'completed',
            });
            return { status: 'completed' };
        }

        // Get article details
        const article = await ctx.runQuery(internal.services.articles.getArticleByIdInternal, {
            articleId: nextArticleId,
        });

        if (!article) {
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Article ${nextArticleId} not found, skipping...`,
            });
            // Schedule next article (recursive call via scheduler)
            await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                scanId,
            });
            return { status: 'skipped', articleId: nextArticleId };
        }

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Processing article: ${article.title}`,
        });

        // Update article status to processing
        await ctx.runMutation(internal.services.articles.updateArticleStatus, {
            articleId: nextArticleId,
            status: 'processing',
        });

        try {
            // Use AI agent to extract content
            const threadId = await createThread(ctx, components.agent);
            const result = await contentExtractorAgent.generateText(
                ctx,
                { threadId },
                {
                    prompt: `Fetch and extract the main content from the news article at: ${article.url}

                    Return only the extracted article text, nothing else.`,
                }
            );

            const extractedContent = result.text || '';

            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Extracted ${extractedContent.length} characters from article.`,
            });

            // Save the extracted content
            await ctx.runMutation(internal.services.articles.updateArticleContent, {
                articleId: nextArticleId,
                content: extractedContent.slice(0, 10000), // Limit content size
            });

            // Schedule the AI analyzer for this article
            await ctx.scheduler.runAfter(0, internal.node.aiAnalyzer.analyzeArticle, {
                scanId,
                articleId: nextArticleId,
            });

            return { status: 'processed', articleId: nextArticleId };
        } catch (error) {
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Error processing article ${article.title}: ${(error as Error).message}`,
            });

            // Mark article as failed
            await ctx.runMutation(internal.services.articles.updateArticleStatus, {
                articleId: nextArticleId,
                status: 'failed',
            });

            // Continue with next article despite error
            await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                scanId,
            });

            return { status: 'error', articleId: nextArticleId, error: (error as Error).message };
        }
    },
});
