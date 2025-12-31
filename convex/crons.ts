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

export default crons;
