import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
    scans: defineTable({
        startedAt: v.string(),
        completedAt: v.optional(v.string()),
        status: v.string(),
    }),
    scanLogs: defineTable({
        scanId: v.id('scans'),
        message: v.string(),
        timestamp: v.string(),
    }),
    source: defineTable({
        name: v.string(),
        url: v.string(),
        description: v.string(),
    }),
    articles: defineTable({
        title: v.string(),
        url: v.string(),
        sourceId: v.id('source'),
        publishedAt: v.string(),
    }),
});
