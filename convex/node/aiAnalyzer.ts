'use node';

import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { components, internal } from '../_generated/api';
import { Agent, createThread } from '@convex-dev/agent';
import { openai } from '@ai-sdk/openai';
import type { Id } from '../_generated/dataModel';

type AnalysisResult =
    | { status: 'skipped' }
    | { status: 'analyzed'; articleId: Id<'articles'> }
    | { status: 'error'; articleId: Id<'articles'>; error: string };

/**
 * Agent for analyzing articles and scoring them for YouTube video potential.
 */
const videoAnalyzerAgent = new Agent(components.agent, {
    name: 'YouTube Video Analyzer',
    languageModel: openai.chat('gpt-4o-mini'),
    instructions: `
    You are an AI news analyst. Your job is to evaluate news articles and determine their potential for YouTube video content.

    For each article, score it on these criteria (1-10 scale):
    1. Relevance: Is it relevant to current events or trending topics?
    2. Uniqueness: Does it provide unique insights not widely covered?
    3. Engagement Potential: Would it engage viewers and spark discussion?
    4. Credibility: Is the source reputable and trustworthy?

    Respond with a JSON object in this exact format:
    {
        "summary": "Brief 2-3 sentence summary",
        "relevance": 7,
        "uniqueness": 8,
        "engagement": 6,
        "credibility": 9,
        "recommendation": "recommended",
        "videoAngle": "Suggested video hook"
    }

    The recommendation must be one of: "highly_recommended", "recommended", "maybe", "not_recommended"
    Scores must be integers from 1-10.
    `,
    maxSteps: 1,
});

interface ArticleScores {
    summary: string;
    relevance: number;
    uniqueness: number;
    engagement: number;
    credibility: number;
    recommendation: string;
    videoAngle: string;
}

function parseScores(text: string): ArticleScores | null {
    try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        if (
            typeof parsed.summary === 'string' &&
            typeof parsed.relevance === 'number' &&
            typeof parsed.uniqueness === 'number' &&
            typeof parsed.engagement === 'number' &&
            typeof parsed.credibility === 'number'
        ) {
            return parsed as ArticleScores;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Analyzes a single article for YouTube video potential.
 * After analysis, schedules the next article for processing.
 */
export const analyzeArticle = internalAction({
    args: {
        scanId: v.id('scans'),
        articleId: v.id('articles'),
    },
    returns: v.object({
        status: v.string(),
        articleId: v.optional(v.id('articles')),
        error: v.optional(v.string()),
    }),
    handler: async (ctx, args): Promise<AnalysisResult> => {
        const { scanId, articleId } = args;

        // Get the article with its content
        const article = await ctx.runQuery(internal.services.articles.getArticleByIdInternal, {
            articleId,
        });

        if (!article) {
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Article ${articleId} not found for analysis, skipping...`,
            });
            // Continue with next article - use scheduler.runAfter with function reference
            await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                scanId,
            });
            return { status: 'skipped' };
        }

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Analyzing article: ${article.title}`,
        });

        try {
            // Use AI agent to analyze the article
            const threadId = await createThread(ctx, components.agent);
            const result = await videoAnalyzerAgent.generateText(
                ctx,
                { threadId },
                {
                    prompt: `Analyze this news article for YouTube video potential:

Title: ${article.title}
URL: ${article.url}
Published: ${article.publishedAt}

Content:
${article.summary || 'No content available - analyze based on title only'}

Respond with the JSON analysis.`,
                }
            );

            // Parse the scores from the text response
            const scores = parseScores(result.text);

            if (scores) {
                // Save the analysis results
                await ctx.runMutation(internal.services.articles.updateArticleAnalysis, {
                    articleId,
                    summary: scores.summary,
                    score: {
                        relevance: scores.relevance,
                        uniqueness: scores.uniqueness,
                        engagement: scores.engagement,
                        credibility: scores.credibility,
                    },
                    status: 'completed',
                });

                const avgScore = (scores.relevance + scores.uniqueness + scores.engagement + scores.credibility) / 4;
                await ctx.runMutation(internal.services.logs.createLog, {
                    scanId,
                    message: `Article analyzed: ${scores.recommendation} (avg score: ${avgScore.toFixed(1)})`,
                });
            } else {
                // Fallback if parsing failed
                await ctx.runMutation(internal.services.articles.updateArticleStatus, {
                    articleId,
                    status: 'completed',
                });

                await ctx.runMutation(internal.services.logs.createLog, {
                    scanId,
                    message: `Article analysis completed without structured scores.`,
                });
            }

            // Schedule next article processing
            await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                scanId,
            });

            return { status: 'analyzed', articleId };
        } catch (error) {
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Error analyzing article ${article.title}: ${(error as Error).message}`,
            });

            // Mark as failed
            await ctx.runMutation(internal.services.articles.updateArticleStatus, {
                articleId,
                status: 'failed',
            });

            // Continue with next article
            await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                scanId,
            });

            return { status: 'error', articleId, error: (error as Error).message };
        }
    },
});
