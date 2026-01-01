import { internalAction, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { ScanStatus, ScanQueueStatus } from '../types';
import type { Doc } from '../_generated/dataModel';

/**
 * Gets all currently running (non-completed) scans.
 */
export const getRunningScans = internalQuery({
    args: {},
    returns: v.array(v.any()),
    handler: async (ctx): Promise<Doc<'scans'>[]> => {
        return await ctx.db
            .query('scans')
            .filter((q) =>
                q.and(
                    q.neq(q.field('status'), ScanStatus.COMPLETED),
                    q.neq(q.field('status'), 'completed')
                )
            )
            .collect();
    },
});

type WatchdogResult = {
    scansChecked: number;
};

/**
 * Watchdog action that checks for stalled scans and restarts them.
 * This runs on a cron schedule as a fallback mechanism.
 *
 * The primary job driver is chain scheduling (each action schedules the next).
 * This watchdog catches edge cases where the chain might break.
 */
export const checkStalledScans = internalAction({
    args: {},
    returns: v.object({
        scansChecked: v.number(),
    }),
    handler: async (ctx): Promise<WatchdogResult> => {
        // Check for running scans that might have stalled
        const runningScans: Doc<'scans'>[] = await ctx.runQuery(
            internal.services.watchdog.getRunningScans
        );

        for (const scan of runningScans) {
            // Check if this scan has a queue
            const queue = await ctx.runQuery(internal.services.queue.getQueueByScanId, {
                scanId: scan._id,
            });

            if (!queue) {
                // No queue yet - scan might be in RSS parsing phase
                // Check if it's been stuck in initializing for too long (> 5 minutes)
                const createdAt = new Date(scan._creationTime);
                const now = new Date();
                const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;

                if (scan.status === ScanStatus.INITIALIZING && minutesElapsed > 5) {
                    await ctx.runMutation(internal.services.logs.createLog, {
                        scanId: scan._id,
                        message: '[Watchdog] Scan stuck in initializing, marking as failed.',
                    });
                    await ctx.runMutation(internal.services.scans.updateScanStatus, {
                        scanId: scan._id,
                        status: ScanStatus.COMPLETED,
                        error: 'Scan timed out during initialization',
                    });
                }
                continue;
            }

            // Check if queue has items but status suggests it's not being processed
            if (queue.list.length > 0 && queue.status === ScanQueueStatus.COMPLETED) {
                // Queue was incorrectly marked as completed, restart processing
                await ctx.runMutation(internal.services.logs.createLog, {
                    scanId: scan._id,
                    message: '[Watchdog] Found queue with items marked as completed, restarting...',
                });
                await ctx.runMutation(internal.services.queue.updateQueueStatus, {
                    queueId: queue._id,
                    status: ScanQueueStatus.PROCESSING,
                });
                await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                    scanId: scan._id,
                });
            }

            // Check if scan has been running too long (> 30 minutes) with no progress
            if (scan.status === ScanStatus.RUNNING) {
                const createdAt = new Date(scan._creationTime);
                const now = new Date();
                const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;

                if (minutesElapsed > 30 && queue.list.length > 0) {
                    await ctx.runMutation(internal.services.logs.createLog, {
                        scanId: scan._id,
                        message: '[Watchdog] Scan running for >30min, attempting to restart processing...',
                    });
                    // Try to restart the processing chain
                    await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
                        scanId: scan._id,
                    });
                }
            }
        }

        return { scansChecked: runningScans.length };
    },
});
