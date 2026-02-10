'use node';

import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { components, internal } from '../_generated/api';
import { Agent, createThread } from '@convex-dev/agent';
import { openai } from '@ai-sdk/openai';
import type { Id } from '../_generated/dataModel';
import {
    DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG,
    normalizeVideoAnalyzerPromptConfig,
    VIDEO_ANALYZER_INSTRUCTIONS,
    videoAnalyzerPrompt,
} from '../prompts';
import { createUsageHandler } from './usage';

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
    instructions: VIDEO_ANALYZER_INSTRUCTIONS,
    maxSteps: 1,
});

interface ArticleScores {
    summary: string;
    relevance: number;
    relevanceSummary: string;
    uniqueness: number;
    uniquenessSummary: string;
    engagement: number;
    engagementSummary: string;
    credibility: number;
    credibilitySummary: string;
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

        const extractedContent = article.extractedContent?.trim() || '';
        const legacySummary = article.summary?.trim() || '';
        const analysisContent = extractedContent || legacySummary;
        const analysisSource = extractedContent
            ? 'extractedContent'
            : legacySummary
              ? 'legacySummary'
              : 'titleOnly';
        const promptConfigRaw = await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'aiAnalyzer.promptConfig',
        });
        const promptConfig = normalizeVideoAnalyzerPromptConfig(
            promptConfigRaw ?? DEFAULT_VIDEO_ANALYZER_PROMPT_CONFIG
        );

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Analyzer input source: ${analysisSource} (prompt v${promptConfig.version})`,
        });

        try {
            // Use AI agent to analyze the article
            const threadId = await createThread(ctx, components.agent);
            const result = await videoAnalyzerAgent.generateText(
                ctx,
                { threadId },
                {
                    prompt: videoAnalyzerPrompt({
                        title: article.title,
                        url: article.url,
                        publishedAt: article.publishedAt,
                        content: analysisContent,
                    }, promptConfig),
                },
                {
                    usageHandler: createUsageHandler({
                        scanId,
                        articleId,
                    }),
                }
            );

            // Parse the scores from the text response
            const scores = parseScores(result.text);

            if (scores) {
                // Save the analysis results including recommendation and videoAngle
                await ctx.runMutation(internal.services.articles.updateArticleAnalysis, {
                    articleId,
                    summary: scores.summary,
                    score: {
                        relevance: scores.relevance,
                        relevanceSummary: scores.relevanceSummary || '',
                        uniqueness: scores.uniqueness,
                        uniquenessSummary: scores.uniquenessSummary || '',
                        engagement: scores.engagement,
                        engagementSummary: scores.engagementSummary || '',
                        credibility: scores.credibility,
                        credibilitySummary: scores.credibilitySummary || '',
                    },
                    recommendation: scores.recommendation || 'maybe',
                    videoAngle: scores.videoAngle || '',
                    promptVersion: promptConfig.version,
                    status: 'completed',
                });

                const avgScore =
                    (scores.relevance +
                        scores.uniqueness +
                        scores.engagement +
                        scores.credibility) /
                    4;
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
