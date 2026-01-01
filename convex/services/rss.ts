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
