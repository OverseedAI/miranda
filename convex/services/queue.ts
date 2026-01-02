import { internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { ScanQueueStatus } from '../types';

/**
 * Creates a new processing queue for a scan.
 */
export const createQueue = internalMutation({
    args: {
        scanId: v.id('scans'),
        articleIds: v.array(v.id('articles')),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('scanQueue', {
            scanId: args.scanId,
            list: args.articleIds,
            status: ScanQueueStatus.PROCESSING,
        });
        return id;
    },
});

/**
 * Gets the queue for a specific scan.
 */
export const getQueueByScanId = internalQuery({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('scanQueue')
            .withIndex('byScanId', (q) => q.eq('scanId', args.scanId))
            .first();
    },
});

/**
 * Gets a queue that is awaiting processing (for watchdog).
 */
export const getAwaitingQueue = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('scanQueue')
            .filter((q) => q.eq(q.field('status'), ScanQueueStatus.AWAITING))
            .first();
    },
});

/**
 * Gets a queue that is currently processing (for watchdog stall detection).
 */
export const getProcessingQueue = internalQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query('scanQueue')
            .filter((q) => q.eq(q.field('status'), ScanQueueStatus.PROCESSING))
            .first();
    },
});

/**
 * Pops the next article ID from the queue.
 * Returns the article ID or null if queue is empty.
 */
export const popNextArticle = internalMutation({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        const queue = await ctx.db
            .query('scanQueue')
            .withIndex('byScanId', (q) => q.eq('scanId', args.scanId))
            .first();

        if (!queue || queue.list.length === 0) {
            // Queue is empty or doesn't exist
            if (queue) {
                await ctx.db.patch(queue._id, {
                    status: ScanQueueStatus.COMPLETED,
                });
            }
            return null;
        }

        const [nextArticleId, ...remainingList] = queue.list;

        await ctx.db.patch(queue._id, {
            list: remainingList,
            status: remainingList.length === 0 ? ScanQueueStatus.COMPLETED : ScanQueueStatus.PROCESSING,
        });

        return nextArticleId;
    },
});

/**
 * Gets the count of remaining articles in queue.
 */
export const getQueueLength = internalQuery({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        const queue = await ctx.db
            .query('scanQueue')
            .withIndex('byScanId', (q) => q.eq('scanId', args.scanId))
            .first();

        return queue?.list.length ?? 0;
    },
});

/**
 * Updates queue status.
 */
export const updateQueueStatus = internalMutation({
    args: {
        queueId: v.id('scanQueue'),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.queueId, {
            status: args.status,
        });
    },
});

/**
 * Cancels a queue by clearing its list and marking as completed.
 */
export const cancelQueue = internalMutation({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        const queue = await ctx.db
            .query('scanQueue')
            .withIndex('byScanId', (q) => q.eq('scanId', args.scanId))
            .first();

        if (queue) {
            await ctx.db.patch(queue._id, {
                status: ScanQueueStatus.COMPLETED,
                list: [],
            });
        }
    },
});
