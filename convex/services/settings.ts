import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { v } from 'convex/values';

/**
 * Get a single setting by key.
 */
export const getSetting = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const setting = await ctx.db
            .query('systemSettings')
            .withIndex('byKey', (q) => q.eq('key', args.key))
            .first();
        return setting?.value ?? null;
    },
});

/**
 * Get multiple settings by keys.
 */
export const getSettings = query({
    args: { keys: v.array(v.string()) },
    handler: async (ctx, args) => {
        const results: Record<string, unknown> = {};
        for (const key of args.keys) {
            const setting = await ctx.db
                .query('systemSettings')
                .withIndex('byKey', (q) => q.eq('key', key))
                .first();
            results[key] = setting?.value ?? null;
        }
        return results;
    },
});

/**
 * Get all settings as a key-value map.
 */
export const getAllSettings = query({
    args: {},
    handler: async (ctx) => {
        const settings = await ctx.db.query('systemSettings').collect();
        const results: Record<string, unknown> = {};
        for (const setting of settings) {
            results[setting.key] = setting.value;
        }
        return results;
    },
});

/**
 * Set a single setting (upsert).
 */
export const setSetting = mutation({
    args: {
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('systemSettings')
            .withIndex('byKey', (q) => q.eq('key', args.key))
            .first();

        const now = new Date().toISOString();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                updatedAt: now,
            });
            return existing._id;
        } else {
            return await ctx.db.insert('systemSettings', {
                key: args.key,
                value: args.value,
                updatedAt: now,
            });
        }
    },
});

/**
 * Batch update multiple settings.
 */
export const setSettings = mutation({
    args: {
        updates: v.array(
            v.object({
                key: v.string(),
                value: v.any(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        for (const { key, value } of args.updates) {
            const existing = await ctx.db
                .query('systemSettings')
                .withIndex('byKey', (q) => q.eq('key', key))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    value,
                    updatedAt: now,
                });
            } else {
                await ctx.db.insert('systemSettings', {
                    key,
                    value,
                    updatedAt: now,
                });
            }
        }
    },
});

/**
 * Internal query to get a setting (for use in actions/crons).
 */
export const getSettingInternal = internalQuery({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const setting = await ctx.db
            .query('systemSettings')
            .withIndex('byKey', (q) => q.eq('key', args.key))
            .first();
        return setting?.value ?? null;
    },
});

/**
 * Internal mutation to set a setting (for use in actions/crons).
 */
export const setSettingInternal = internalMutation({
    args: {
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('systemSettings')
            .withIndex('byKey', (q) => q.eq('key', args.key))
            .first();

        const now = new Date().toISOString();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                updatedAt: now,
            });
            return existing._id;
        } else {
            return await ctx.db.insert('systemSettings', {
                key: args.key,
                value: args.value,
                updatedAt: now,
            });
        }
    },
});
