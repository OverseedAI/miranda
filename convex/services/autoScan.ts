import { internalAction, internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { internal, api } from '../_generated/api';
import { ScanStatus } from '../types';

type CheckResult =
    | { triggered: false; reason: string }
    | { triggered: true; config: { feedCount: number; daysBack: number; parallelism: number; filterTags: string[] } };

/**
 * Checks if an auto-scan should be triggered and triggers it if conditions are met.
 * This is called by a cron job every minute.
 *
 * Conditions for triggering:
 * 1. Auto-scan is enabled
 * 2. Configured interval has elapsed since last scan
 * 3. No scan is currently running
 */
export const checkAndTriggerScan = internalAction({
    args: {},
    handler: async (ctx): Promise<CheckResult> => {
        // Check if auto-scan is enabled
        const enabled = await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'autoScan.enabled',
        });

        if (!enabled) {
            return { triggered: false, reason: 'Auto-scan is disabled' };
        }

        // Check if a scan is already running
        const runningScan = await ctx.runQuery(api.services.scans.getRunningScan);

        if (runningScan) {
            return { triggered: false, reason: 'A scan is already running' };
        }

        // Get the interval and last run time
        const intervalMinutes = (await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'autoScan.intervalMinutes',
        })) as number | null;

        const lastRunAt = (await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'autoScan.lastRunAt',
        })) as string | null;

        const interval = intervalMinutes ?? 240; // Default 4 hours

        // Check if interval has elapsed
        if (lastRunAt) {
            const lastRunTime = new Date(lastRunAt).getTime();
            const now = Date.now();
            const elapsedMinutes = (now - lastRunTime) / (1000 * 60);

            if (elapsedMinutes < interval) {
                return {
                    triggered: false,
                    reason: `Interval not elapsed (${Math.round(elapsedMinutes)}/${interval} minutes)`,
                };
            }
        }

        // Get scan configuration
        const daysBack = ((await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'autoScan.daysBack',
        })) as number | null) ?? 7;

        const parallelism = ((await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'autoScan.parallelism',
        })) as number | null) ?? 3;

        const filterTags = ((await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'autoScan.filterTags',
        })) as string[] | null) ?? [];

        const feedsForScan = await ctx.runQuery(internal.services.rss.getFeedsForScan, {
            tags: filterTags.length > 0 ? filterTags : undefined,
        });
        const feedCount = feedsForScan.length;

        if (feedCount === 0) {
            return { triggered: false, reason: 'No RSS feeds available for the selected filters' };
        }

        // Update last run time before triggering
        await ctx.runMutation(internal.services.settings.setSettingInternal, {
            key: 'autoScan.lastRunAt',
            value: new Date().toISOString(),
        });

        // Trigger the scan using the internal mutation
        await ctx.runMutation(internal.services.autoScan.triggerAutoScan, {
            feedCount,
            daysBack,
            parallelism,
            filterTags,
        });

        return {
            triggered: true,
            config: { feedCount, daysBack, parallelism, filterTags },
        };
    },
});

/**
 * Internal mutation to create a scan and schedule the RSS parser.
 * This is called by the checkAndTriggerScan action.
 */
export const triggerAutoScan = internalMutation({
    args: {
        feedCount: v.number(),
        daysBack: v.number(),
        parallelism: v.number(),
        filterTags: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        // Create the scan record
        const scanId = await ctx.db.insert('scans', {
            status: ScanStatus.INITIALIZING,
            options: {
                rssCount: args.feedCount,
                daysBack: args.daysBack,
                parallelism: args.parallelism,
            },
        });

        // Schedule the RSS parsing action with tag filtering
        await ctx.scheduler.runAfter(0, internal.node.rssParser.parseFeeds, {
            scanId,
            rssCount: args.feedCount,
            daysBack: args.daysBack,
            parallelism: args.parallelism,
            filterTags: args.filterTags.length > 0 ? args.filterTags : undefined,
        });

        return scanId;
    },
});
