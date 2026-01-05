import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

/**
 * Watchdog cron job that checks for stalled scans.
 * Runs every 30 seconds to detect and restart jobs that may have failed silently.
 *
 * This is a fallback mechanism - the primary job driver is chain scheduling
 * where each action schedules the next one upon completion.
 */
crons.interval(
    'scan watchdog',
    { seconds: 30 },
    internal.services.watchdog.checkStalledScans,
    {}
);

/**
 * Auto-scan cron job that checks if a scheduled scan should be triggered.
 * Runs every minute and checks settings to determine if conditions are met.
 */
crons.interval(
    'auto scan check',
    { minutes: 1 },
    internal.services.autoScan.checkAndTriggerScan,
    {}
);

/**
 * Slack notification cron job that checks if a digest should be sent.
 * Runs every 5 minutes and checks settings to determine if conditions are met.
 */
crons.interval(
    'slack notification',
    { minutes: 5 },
    internal.node.slackService.checkAndSendDigest,
    {}
);

export default crons;
