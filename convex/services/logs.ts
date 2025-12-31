import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';

export const createLog = internalMutation({
    args: {
        scanId: v.id('scans'),
        message: v.string(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('scanLogs', {
            scanId: args.scanId,
            message: args.message,
        });

        return id;
    },
});

export const getLogs = query({
    args: {
        scanId: v.id('scans'),
    },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query('scanLogs')
            .withIndex('byScanId', (q) => q.eq('scanId', args.scanId))
            .order('asc')
            .collect();
        return logs;
    },
});
