import { internalQuery, mutation, query } from '../_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

export const getRss = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, args) => {
        const data = await ctx.db.query('rss').order('desc').paginate(args.paginationOpts);

        return data;
    },
});

export const createRss = mutation({
    args: {
        name: v.string(),
        htmlUrl: v.string(),
        xmlUrl: v.string(),
        type: v.string(),
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
        await ctx.db.delete('rss', args.id);
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
