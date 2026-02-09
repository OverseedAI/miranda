import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';

export const recordUsage = internalMutation({
    args: {
        provider: v.string(),
        model: v.string(),
        agentName: v.optional(v.string()),
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
        reasoningTokens: v.optional(v.number()),
        cachedInputTokens: v.optional(v.number()),
        userId: v.optional(v.string()),
        threadId: v.optional(v.string()),
        scanId: v.optional(v.id('scans')),
        articleId: v.optional(v.id('articles')),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('apiUsage', args);
        return id;
    },
});

export const getUsageSummary = query({
    args: {
        days: v.optional(v.number()),
        recentLimit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const windowDays = Math.min(Math.max(args.days ?? 30, 1), 90);
        const recentLimit = Math.min(Math.max(args.recentLimit ?? 20, 1), 100);
        const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;

        const records = await ctx.db.query('apiUsage').order('desc').collect();

        const totals = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            requests: 0,
        };

        const byModel = new Map<
            string,
            {
                model: string;
                provider: string;
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
                requests: number;
            }
        >();

        const byDay = new Map<
            string,
            {
                date: string;
                promptTokens: number;
                completionTokens: number;
                totalTokens: number;
                requests: number;
            }
        >();

        const recent = [] as typeof records;

        for (const record of records) {
            if (recent.length < recentLimit) {
                recent.push(record);
            }

            if (record._creationTime < since) {
                if (recent.length >= recentLimit) {
                    break;
                }
                continue;
            }

            totals.promptTokens += record.promptTokens;
            totals.completionTokens += record.completionTokens;
            totals.totalTokens += record.totalTokens;
            totals.requests += 1;

            const modelKey = `${record.provider}:${record.model}`;
            const modelEntry =
                byModel.get(modelKey) ??
                {
                    model: record.model,
                    provider: record.provider,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    requests: 0,
                };
            modelEntry.promptTokens += record.promptTokens;
            modelEntry.completionTokens += record.completionTokens;
            modelEntry.totalTokens += record.totalTokens;
            modelEntry.requests += 1;
            byModel.set(modelKey, modelEntry);

            const date = new Date(record._creationTime).toISOString().split('T')[0];
            const dayEntry =
                byDay.get(date) ??
                {
                    date,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    requests: 0,
                };
            dayEntry.promptTokens += record.promptTokens;
            dayEntry.completionTokens += record.completionTokens;
            dayEntry.totalTokens += record.totalTokens;
            dayEntry.requests += 1;
            byDay.set(date, dayEntry);
        }

        return {
            windowDays,
            totals,
            byModel: Array.from(byModel.values()).sort(
                (a, b) => b.totalTokens - a.totalTokens
            ),
            byDay: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
            recent: recent.slice(0, recentLimit),
        };
    },
});
