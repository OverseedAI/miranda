'use node';

import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import Parser from 'rss-parser';
import type { Doc, Id } from '../_generated/dataModel';

const parser = new Parser();

type Article = {
    title: string;
    url: string;
    publishedAt: string;
    sourceId: Id<'rss'>;
    guid: string;
};

type ParseFeedsResult = {
    articlesFound: number;
    articlesSaved: number;
};

const DEFAULT_DAYS_BACK = 7;
const DEFAULT_PARALLELISM = 3;

/**
 * Parses RSS feeds and creates articles in the database.
 * This is the first step in the scan pipeline.
 * After completion, it schedules article processors based on parallelism setting.
 */
export const parseFeeds = internalAction({
    args: {
        scanId: v.id('scans'),
        rssCount: v.number(),
        daysBack: v.optional(v.number()),
        parallelism: v.optional(v.number()),
        filterTags: v.optional(v.array(v.string())),
    },
    returns: v.object({
        articlesFound: v.number(),
        articlesSaved: v.number(),
    }),
    handler: async (ctx, args): Promise<ParseFeedsResult> => {
        const { scanId, rssCount } = args;
        const daysBack = args.daysBack ?? DEFAULT_DAYS_BACK;
        const parallelism = args.parallelism ?? DEFAULT_PARALLELISM;
        const filterTags = args.filterTags ?? [];

        const tagInfo = filterTags.length > 0 ? `, tags: [${filterTags.join(', ')}]` : '';
        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Starting RSS feed parsing (${daysBack} days back, parallelism: ${parallelism}${tagInfo})...`,
        });

        // Get RSS feeds from database, optionally filtered by tags
        const rssFeeds = filterTags.length > 0
            ? await ctx.runQuery(internal.services.rss.getFeedsByTags, {
                  tags: filterTags,
                  limit: rssCount,
              })
            : await ctx.runQuery(internal.services.rss.getRssFeed, {
                  limit: rssCount,
              });

        // Parse all feeds
        const articles: Article[] = [];
        let successCount = 0;
        let failCount = 0;

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
                const feedArticles = extractArticles(feed, feedData, daysBack);
                articles.push(...feedArticles);
                successCount++;

                // Update feed success status
                await ctx.runMutation(internal.services.rss.updateFeedStatus, {
                    feedId: feed._id,
                    success: true,
                });
            } catch (error) {
                failCount++;
                const errorMessage = (error as Error).message;

                await ctx.runMutation(internal.services.logs.createLog, {
                    scanId,
                    message: `Failed to parse feed ${feed.name}: ${errorMessage}`,
                });

                // Update feed error status
                await ctx.runMutation(internal.services.rss.updateFeedStatus, {
                    feedId: feed._id,
                    success: false,
                    error: errorMessage,
                });
            }
        }

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Parsed ${successCount} feeds (${failCount} failed). Found ${articles.length} articles.`,
        });

        // Save articles to database
        const articleIds: Id<'articles'>[] = await ctx.runMutation(
            internal.services.articles.bulkCreateArticles,
            { articles }
        );

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: `Created ${articleIds.length} new articles (${articles.length - articleIds.length} already existed).`,
        });

        // Create the processing queue
        await ctx.runMutation(internal.services.queue.createQueue, {
            scanId,
            articleIds,
        });

        // Update scan status to RUNNING with progress tracking
        await ctx.runMutation(internal.services.scans.updateScanProgress, {
            scanId,
            status: 'running',
            totalArticles: articleIds.length,
            processedArticles: 0,
        });

        await ctx.runMutation(internal.services.logs.createLog, {
            scanId,
            message: 'Scan status updated to RUNNING. Starting article processing...',
        });

        // Schedule article processors based on parallelism
        if (articleIds.length > 0) {
            const processorsToStart = Math.min(parallelism, articleIds.length);
            for (let i = 0; i < processorsToStart; i++) {
                await ctx.scheduler.runAfter(i * 100, internal.node.articleProcessor.processNextArticle, {
                    scanId,
                });
            }
            await ctx.runMutation(internal.services.logs.createLog, {
                scanId,
                message: `Started ${processorsToStart} parallel article processors.`,
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
 * Filters to only include articles from the specified number of days back.
 */
function extractArticles(
    feed: Doc<'rss'>,
    feedData: Parser.Output<Record<string, unknown>>,
    daysBack: number
): Article[] {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return feedData.items
        .filter((item) => {
            const date = item.pubDate ? new Date(item.pubDate) : null;
            return date && date >= cutoffDate;
        })
        .map((item) => ({
            title: item.title || 'No title',
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            sourceId: feed._id,
            guid: item.guid || item.link || '',
        }));
}
