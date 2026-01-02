import { internalMutation, mutation, query } from '../_generated/server';
import { ConvexError, v } from 'convex/values';
import { api, internal } from '../_generated/api';
import { ScanStatus } from '../types';

/**
 * Queues a new scan to be executed.
 * Creates the scan record and schedules the RSS parsing action.
 */
export const queueScan = mutation({
    args: {
        rssCount: v.number(),
        daysBack: v.optional(v.number()),
        parallelism: v.optional(v.number()),
        delay: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Check for running scans
        const runningScan = await ctx.runQuery(api.services.scans.getRunningScan);

        if (runningScan) {
            throw new ConvexError('A scan is already running');
        }

        // Create the scan record with all options
        const scanId = await ctx.db.insert('scans', {
            status: ScanStatus.INITIALIZING,
            options: {
                rssCount: args.rssCount,
                daysBack: args.daysBack,
                parallelism: args.parallelism,
            },
        });

        // Schedule the RSS parsing action (start of the chain)
        await ctx.scheduler.runAfter(
            args.delay ?? 0,
            internal.node.rssParser.parseFeeds,
            {
                scanId,
                rssCount: args.rssCount,
                daysBack: args.daysBack,
                parallelism: args.parallelism,
            }
        );

        return scanId;
    },
});

/**
 * Gets a scan by its ID.
 */
export const getScanById = query({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.scanId);
    },
});

/**
 * Gets the currently running scan, if any.
 */
export const getRunningScan = query({
    args: {},
    handler: async (ctx) => {
        const runningScans = await ctx.db
            .query('scans')
            .filter((q) =>
                q.and(
                    q.neq(q.field('status'), ScanStatus.COMPLETED),
                    q.neq(q.field('status'), 'completed') // Handle legacy string
                )
            )
            .collect();

        return runningScans.length > 0 ? runningScans[0] : null;
    },
});

/**
 * Updates a scan's status (public mutation for UI updates).
 */
export const updateScan = mutation({
    args: {
        scanId: v.id('scans'),
        status: v.optional(v.string()),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: { status?: string; error?: string; completedAt?: string } = {};

        if (args.status) {
            updates.status = args.status;
            if (args.status === ScanStatus.COMPLETED || args.status === 'completed') {
                updates.completedAt = new Date().toISOString();
            }
        }

        if (args.error) {
            updates.error = args.error;
        }

        await ctx.db.patch(args.scanId, updates);
    },
});

/**
 * Updates a scan's status (internal mutation for actions).
 */
export const updateScanStatus = internalMutation({
    args: {
        scanId: v.id('scans'),
        status: v.string(),
        error: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: { status: string; error?: string; completedAt?: string } = {
            status: args.status,
        };

        if (args.error) {
            updates.error = args.error;
        }

        if (args.status === ScanStatus.COMPLETED || args.status === 'completed') {
            updates.completedAt = new Date().toISOString();
        }

        await ctx.db.patch(args.scanId, updates);
    },
});

/**
 * Updates scan progress (internal mutation for tracking).
 */
export const updateScanProgress = internalMutation({
    args: {
        scanId: v.id('scans'),
        status: v.optional(v.string()),
        totalArticles: v.optional(v.number()),
        processedArticles: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const updates: {
            status?: string;
            totalArticles?: number;
            processedArticles?: number;
            completedAt?: string;
        } = {};

        if (args.status) {
            updates.status = args.status;
            if (args.status === ScanStatus.COMPLETED || args.status === 'completed') {
                updates.completedAt = new Date().toISOString();
            }
        }

        if (args.totalArticles !== undefined) {
            updates.totalArticles = args.totalArticles;
        }

        if (args.processedArticles !== undefined) {
            updates.processedArticles = args.processedArticles;
        }

        await ctx.db.patch(args.scanId, updates);
    },
});

/**
 * Increments the processed articles count.
 */
export const incrementProcessedArticles = internalMutation({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        const scan = await ctx.db.get(args.scanId);
        if (!scan) return;

        await ctx.db.patch(args.scanId, {
            processedArticles: (scan.processedArticles ?? 0) + 1,
        });
    },
});

/**
 * Cancels a running scan.
 */
export const cancelScan = mutation({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        const scan = await ctx.db.get(args.scanId);

        if (!scan) {
            throw new ConvexError('Scan not found.');
        }

        if (scan.status === ScanStatus.COMPLETED || scan.status === 'completed') {
            throw new ConvexError('Cannot cancel a completed scan.');
        }

        // Update scan status
        await ctx.db.patch(args.scanId, {
            status: ScanStatus.COMPLETED,
            completedAt: new Date().toISOString(),
        });

        // Cancel the queue
        await ctx.runMutation(internal.services.queue.cancelQueue, {
            scanId: args.scanId,
        });

        return 'scan canceled';
    },
});

/**
 * Gets all scans (for listing).
 */
export const getAllScans = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query('scans').order('desc').take(50);
    },
});
