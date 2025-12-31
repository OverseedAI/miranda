'use node';

import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import Parser from 'rss-parser';
import { Doc, Id } from '../_generated/dataModel';

const parser = new Parser();

type Article = {
    title: string;
    url: string;
    publishedAt: string;
    sourceId: string;
    guid: string;
};

type ParseFeedsResult = {
    articlesFound: number;
    articlesSaved: number;
};

/**
 * Parses RSS feeds and creates articles in the database.
 * This is the first step in the scan pipeline.
 * After completion, it schedules the first article for processing.
 */
export const parseFeeds = internalAction({
    args: {
        scanId: v.id('scans'),
        rssCount: v.number(),
    },
    returns: v.object({
        articlesFound: v.number(),
        articlesSaved: v.number(),
    }),
    handler: async (ctx, args): Promise<ParseFeedsResult> => {
        const { scanId, rssCount } = args;

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: 'Starting RSS feed parsing...',
        });

        // Get RSS feeds from database
        const rssFeeds = await ctx.runQuery(internal.services.rss.getRssFeed, {
            limit: rssCount,
        });

        // Parse all feeds
        const articles: Article[] = [];
        for (const feed of rssFeeds) {
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Processing feed: ${feed.name} - ${feed.xmlUrl}`,
            });

            if (!feed.xmlUrl) {
                continue;
            }

            try {
                const feedData = await parser.parseURL(feed.xmlUrl);
                const feedArticles = extractArticles(feed, feedData);
                articles.push(...feedArticles);
            } catch (error) {
                await ctx.runMutation(internal.services.logs.createLog, {
                    scanId,
                    message: `Failed to parse feed ${feed.name}: ${(error as Error).message}`,
                });
            }
        }

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Found ${articles.length} articles from RSS feeds.`,
        });

        // Save articles to database
        const articleIds: Id<'articles'>[] = await ctx.runMutation(
            internal.services.articles.bulkCreateArticles,
            { articles }
        );

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Inserted/Found ${articleIds.length} articles in the database.`,
        });

        // Create the processing queue
        await ctx.runMutation(internal.services.queue.createQueue, {
            scanId,
            articleIds,
        });

        // Update scan status to RUNNING
        await ctx.runMutation(internal.services.scans.updateScanStatus, {
            scanId,
            status: 'running',
        });

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: 'Scan status updated to RUNNING. Starting article processing...',
        });

        // Schedule the first article for processing (chain scheduling)
        if (articleIds.length > 0) {
            await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                scanId,
            });
        } else {
            // No articles to process, complete the scan
            await ctx.runMutation(internal.services.scans.updateScanStatus, {
                scanId,
                status: 'completed',
            });
        }

        return { articlesFound: articles.length, articlesSaved: articleIds.length };
    },
});

/**
 * Extracts articles from parsed RSS feed data.
 * Filters to only include articles from the last 7 days.
 */
function extractArticles(feed: Doc<'rss'>, feedData: Parser.Output<Record<string, unknown>>): Article[] {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return feedData.items
        .filter((item) => {
            const date = item.pubDate ? new Date(item.pubDate) : null;
            return date && date >= sevenDaysAgo;
        })
        .map((item) => ({
            title: item.title || 'No title',
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            sourceId: feed._id,
            guid: item.guid || item.link || '',
        }));
}
