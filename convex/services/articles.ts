import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import { ArticleStatus } from '../types';
import type { Id } from '../_generated/dataModel';

/**
 * Bulk creates articles from RSS feed data.
 * Skips articles that already exist (based on guid).
 * Returns only NEW article IDs (not existing ones).
 */
export const bulkCreateArticles = internalMutation({
    args: {
        articles: v.array(
            v.object({
                title: v.string(),
                url: v.string(),
                sourceId: v.id('rss'),
                publishedAt: v.string(),
                guid: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const newArticleIds: Id<'articles'>[] = [];

        for (const article of args.articles) {
            // Check if article already exists using index
            const existingArticle = await ctx.db
                .query('articles')
                .withIndex('byGuid', (q) => q.eq('guid', article.guid))
                .first();

            if (existingArticle) {
                continue; // Skip existing articles
            }

            // Create new article
            const id = await ctx.db.insert('articles', {
                title: article.title,
                url: article.url,
                sourceId: article.sourceId,
                publishedAt: article.publishedAt,
                guid: article.guid,
                status: ArticleStatus.PENDING,
            });

            newArticleIds.push(id);
        }

        return newArticleIds;
    },
});

/**
 * Gets an article by ID (public query).
 */
export const getArticleById = query({
    args: {
        articleId: v.id('articles'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.articleId);
    },
});

/**
 * Gets an article by ID (internal query for actions).
 */
export const getArticleByIdInternal = internalQuery({
    args: {
        articleId: v.id('articles'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.articleId);
    },
});

/**
 * Updates an article's status.
 */
export const updateArticleStatus = internalMutation({
    args: {
        articleId: v.id('articles'),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.articleId, {
            status: args.status,
        });
    },
});

/**
 * Updates an article's extracted content (raw text from the article).
 */
export const updateArticleContent = internalMutation({
    args: {
        articleId: v.id('articles'),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.articleId, {
            extractedContent: args.content,
            status: ArticleStatus.PROCESSING,
        });
    },
});

/**
 * Updates an article with full analysis results.
 */
export const updateArticleAnalysis = internalMutation({
    args: {
        articleId: v.id('articles'),
        summary: v.string(),
        score: v.object({
            relevance: v.number(),
            relevanceSummary: v.string(),
            uniqueness: v.number(),
            uniquenessSummary: v.string(),
            engagement: v.number(),
            engagementSummary: v.string(),
            credibility: v.number(),
            credibilitySummary: v.string(),
        }),
        recommendation: v.string(),
        videoAngle: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.articleId, {
            summary: args.summary,
            score: args.score,
            recommendation: args.recommendation,
            videoAngle: args.videoAngle,
            status: args.status,
        });
    },
});

/**
 * Legacy mutation for backward compatibility.
 */
export const updateArticleSummary = internalMutation({
    args: {
        articleId: v.id('articles'),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.articleId, {
            summary: args.content,
            status: ArticleStatus.COMPLETED,
        });
    },
});

/**
 * Gets articles by status using index.
 */
export const getArticlesByStatus = query({
    args: {
        status: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('articles')
            .withIndex('byStatus', (q) => q.eq('status', args.status))
            .order('desc')
            .take(100);
    },
});

/**
 * Gets all articles with source info, sorted by publishedAt descending.
 */
export const getAllArticles = query({
    args: {},
    handler: async (ctx) => {
        const articles = await ctx.db.query('articles').order('desc').take(200);

        // Fetch source names for all articles
        const articlesWithSource = await Promise.all(
            articles.map(async (article) => {
                const source = await ctx.db.get(article.sourceId);
                return {
                    ...article,
                    sourceName: source?.name ?? 'Unknown',
                };
            })
        );

        return articlesWithSource;
    },
});

/**
 * Gets recommended articles (high scores).
 */
export const getRecommendedArticles = query({
    args: {},
    handler: async (ctx) => {
        const articles = await ctx.db
            .query('articles')
            .withIndex('byStatus', (q) => q.eq('status', ArticleStatus.COMPLETED))
            .order('desc')
            .take(100);

        // Filter to those with scores and sort by average score
        return articles
            .filter((a) => a.score)
            .sort((a, b) => {
                const avgA = a.score
                    ? (a.score.relevance + a.score.uniqueness + a.score.engagement + a.score.credibility) / 4
                    : 0;
                const avgB = b.score
                    ? (b.score.relevance + b.score.uniqueness + b.score.engagement + b.score.credibility) / 4
                    : 0;
                return avgB - avgA;
            });
    },
});

/**
 * Gets failed articles for retry UI.
 */
export const getFailedArticles = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('articles')
            .withIndex('byStatus', (q) => q.eq('status', ArticleStatus.FAILED))
            .order('desc')
            .take(100);
    },
});

/**
 * Retries a single failed article by resetting its status.
 */
export const retryArticle = mutation({
    args: {
        articleId: v.id('articles'),
    },
    handler: async (ctx, args) => {
        const article = await ctx.db.get(args.articleId);
        if (!article || article.status !== ArticleStatus.FAILED) {
            return { success: false, reason: 'Article not found or not failed' };
        }

        await ctx.db.patch(args.articleId, {
            status: ArticleStatus.PENDING,
            extractedContent: undefined,
            summary: undefined,
            score: undefined,
            recommendation: undefined,
            videoAngle: undefined,
        });

        return { success: true };
    },
});

/**
 * Retries all failed articles by resetting their status.
 */
export const retryAllFailedArticles = mutation({
    args: {},
    handler: async (ctx) => {
        const failedArticles = await ctx.db
            .query('articles')
            .withIndex('byStatus', (q) => q.eq('status', ArticleStatus.FAILED))
            .collect();

        for (const article of failedArticles) {
            await ctx.db.patch(article._id, {
                status: ArticleStatus.PENDING,
                extractedContent: undefined,
                summary: undefined,
                score: undefined,
                recommendation: undefined,
                videoAngle: undefined,
            });
        }

        return { count: failedArticles.length };
    },
});

/**
 * Deletes a single article.
 */
export const deleteArticle = mutation({
    args: {
        articleId: v.id('articles'),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.articleId);
        return { success: true };
    },
});

/**
 * Gets articles by source RSS feed.
 */
export const getArticlesBySource = query({
    args: {
        sourceId: v.id('rss'),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('articles')
            .withIndex('bySourceId', (q) => q.eq('sourceId', args.sourceId))
            .order('desc')
            .take(100);
    },
});

/**
 * Gets recommended articles that haven't been sent to Slack yet.
 * Returns articles sorted by average score descending.
 */
export const getUnnotifiedRecommendedArticles = internalQuery({
    args: {
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const articles = await ctx.db
            .query('articles')
            .withIndex('byStatus', (q) => q.eq('status', ArticleStatus.COMPLETED))
            .collect();

        // Filter to recommended articles that haven't been notified
        const filtered = articles.filter((a) => {
            if (!a.score) return false;
            if (a.slackNotifiedAt) return false;
            return a.recommendation === 'highly_recommended' || a.recommendation === 'recommended';
        });

        // Sort by average score descending
        const sorted = filtered.sort((a, b) => {
            const avgA = a.score
                ? (a.score.relevance + a.score.uniqueness + a.score.engagement + a.score.credibility) / 4
                : 0;
            const avgB = b.score
                ? (b.score.relevance + b.score.uniqueness + b.score.engagement + b.score.credibility) / 4
                : 0;
            return avgB - avgA;
        });

        return sorted.slice(0, args.limit);
    },
});

/**
 * Marks articles as notified to Slack.
 */
export const markArticlesAsSlackNotified = internalMutation({
    args: {
        articleIds: v.array(v.id('articles')),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();
        for (const id of args.articleIds) {
            await ctx.db.patch(id, { slackNotifiedAt: now });
        }
    },
});

/**
 * Counts articles matching the given filters for bulk delete preview.
 */
export const countArticlesByFilters = query({
    args: {
        statuses: v.optional(v.array(v.string())),
        recommendations: v.optional(v.array(v.string())),
        sourceIds: v.optional(v.array(v.id('rss'))),
    },
    handler: async (ctx, args) => {
        let articles = await ctx.db.query('articles').collect();

        // Filter by statuses
        if (args.statuses && args.statuses.length > 0) {
            articles = articles.filter((a) => args.statuses!.includes(a.status));
        }

        // Filter by recommendations
        if (args.recommendations && args.recommendations.length > 0) {
            articles = articles.filter((a) => {
                if (!a.recommendation) return args.recommendations!.includes('none');
                return args.recommendations!.includes(a.recommendation);
            });
        }

        // Filter by source IDs
        if (args.sourceIds && args.sourceIds.length > 0) {
            articles = articles.filter((a) => args.sourceIds!.includes(a.sourceId));
        }

        return { count: articles.length };
    },
});

/**
 * Bulk deletes articles matching the given filters.
 */
export const bulkDeleteArticles = mutation({
    args: {
        statuses: v.optional(v.array(v.string())),
        recommendations: v.optional(v.array(v.string())),
        sourceIds: v.optional(v.array(v.id('rss'))),
    },
    handler: async (ctx, args) => {
        let articles = await ctx.db.query('articles').collect();

        // Filter by statuses
        if (args.statuses && args.statuses.length > 0) {
            articles = articles.filter((a) => args.statuses!.includes(a.status));
        }

        // Filter by recommendations
        if (args.recommendations && args.recommendations.length > 0) {
            articles = articles.filter((a) => {
                if (!a.recommendation) return args.recommendations!.includes('none');
                return args.recommendations!.includes(a.recommendation);
            });
        }

        // Filter by source IDs
        if (args.sourceIds && args.sourceIds.length > 0) {
            articles = articles.filter((a) => args.sourceIds!.includes(a.sourceId));
        }

        // Delete all matching articles
        for (const article of articles) {
            await ctx.db.delete(article._id);
        }

        return { deletedCount: articles.length };
    },
});
