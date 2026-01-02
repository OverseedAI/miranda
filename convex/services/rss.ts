import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

export const getRss = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const data = await ctx.db.query('rss').order('desc').paginate(args.paginationOpts);

        return data;
    },
});

export const getAllRss = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('rss').order('desc').collect();
    },
});

export const createRss = mutation({
    args: {
        name: v.string(),
        htmlUrl: v.string(),
        xmlUrl: v.string(),
        type: v.string(),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('rss', args);

        return id;
    },
});

export const deleteRss = mutation({
    args: {
        id: v.id('rss'),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const updateRss = mutation({
    args: {
        id: v.id('rss'),
        name: v.string(),
        htmlUrl: v.string(),
        xmlUrl: v.string(),
        type: v.string(),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        await ctx.db.patch(id, data);
    },
});

export const bulkCreateRss = mutation({
    args: {
        feeds: v.array(
            v.object({
                name: v.string(),
                htmlUrl: v.string(),
                xmlUrl: v.string(),
                type: v.string(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const ids = [];
        for (const feed of args.feeds) {
            // Check if feed with same xmlUrl already exists
            const existing = await ctx.db
                .query('rss')
                .filter((q) => q.eq(q.field('xmlUrl'), feed.xmlUrl))
                .first();

            if (!existing) {
                const id = await ctx.db.insert('rss', feed);
                ids.push(id);
            }
        }
        return ids;
    },
});

export const getRssFeed = internalQuery({
    args: {
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const rss = await ctx.db.query('rss').take(args.limit);
        return rss;
    },
});

/**
 * Updates feed status after a fetch attempt.
 */
export const updateFeedStatus = internalMutation({
    args: {
        feedId: v.id('rss'),
        success: v.boolean(),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const feed = await ctx.db.get(args.feedId);
        if (!feed) return;

        if (args.success) {
            await ctx.db.patch(args.feedId, {
                lastFetchedAt: new Date().toISOString(),
                lastError: undefined,
                failCount: 0,
            });
        } else {
            await ctx.db.patch(args.feedId, {
                lastFetchedAt: new Date().toISOString(),
                lastError: args.error,
                failCount: (feed.failCount ?? 0) + 1,
            });
        }
    },
});

/**
 * Gets feeds with errors (for UI display).
 */
export const getFeedsWithErrors = query({
    args: {},
    handler: async (ctx) => {
        const feeds = await ctx.db.query('rss').collect();
        return feeds.filter((f) => f.lastError || (f.failCount ?? 0) > 0);
    },
});

/**
 * Get all unique tags across all feeds.
 */
export const getAllTags = query({
    args: {},
    handler: async (ctx) => {
        const feeds = await ctx.db.query('rss').collect();
        const tagSet = new Set<string>();
        for (const feed of feeds) {
            if (feed.tags) {
                for (const tag of feed.tags) {
                    tagSet.add(tag);
                }
            }
        }
        return Array.from(tagSet).sort();
    },
});

/**
 * Get feeds filtered by tags (internal, for auto-scan).
 */
export const getFeedsByTags = internalQuery({
    args: {
        tags: v.array(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const feeds = await ctx.db.query('rss').collect();

        // If no tags specified, return all feeds
        if (args.tags.length === 0) {
            return args.limit ? feeds.slice(0, args.limit) : feeds;
        }

        // Filter feeds that have at least one of the specified tags
        const filtered = feeds.filter((feed) => {
            if (!feed.tags || feed.tags.length === 0) return false;
            return args.tags.some((tag) => feed.tags!.includes(tag));
        });

        return args.limit ? filtered.slice(0, args.limit) : filtered;
    },
});
