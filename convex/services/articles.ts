import { internalMutation, internalQuery, query } from '../_generated/server';
import { v } from 'convex/values';
import { ArticleStatus } from '../types';

/**
 * Bulk creates articles from RSS feed data.
 * Skips articles that already exist (based on guid).
 */
export const bulkCreateArticles = internalMutation({
    args: {
        articles: v.array(
            v.object({
                title: v.string(),
                url: v.string(),
                sourceId: v.string(),
                publishedAt: v.string(),
                guid: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const articleIds = [];

        for (const article of args.articles) {
            // Check if article already exists
            const existingArticle = await ctx.db
                .query('articles')
                .filter((q) => q.eq(q.field('guid'), article.guid))
                .first();

            if (existingArticle) {
                articleIds.push(existingArticle._id);
                continue;
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

            articleIds.push(id);
        }

        return articleIds;
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
 * Updates an article's extracted content.
 */
export const updateArticleContent = internalMutation({
    args: {
        articleId: v.id('articles'),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.articleId, {
            summary: args.content, // Using summary field for extracted content
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
            uniqueness: v.number(),
            engagement: v.number(),
            credibility: v.number(),
        }),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.articleId, {
            summary: args.summary,
            score: args.score,
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
 * Gets all articles for a scan (via their source).
 */
export const getArticlesByStatus = query({
    args: {
        status: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('articles')
            .filter((q) => q.eq(q.field('status'), args.status))
            .order('desc')
            .take(100);
    },
});

/**
 * Gets all articles, sorted by publishedAt descending.
 */
export const getAllArticles = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('articles').order('desc').take(200);
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
            .filter((q) => q.eq(q.field('status'), ArticleStatus.COMPLETED))
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
