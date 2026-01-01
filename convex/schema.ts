import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
    scans: defineTable({
        completedAt: v.optional(v.string()),
        status: v.string(),
        options: v.object({
            rssCount: v.number(),
        }),
        error: v.optional(v.string()),
    }),
    scanQueue: defineTable({
        scanId: v.id('scans'),
        status: v.string(),
        list: v.array(v.id('articles')),
    }),
    scanLogs: defineTable({
        scanId: v.id('scans'),
        message: v.string(),
    }).index('byScanId', ['scanId']),
    rss: defineTable({
        name: v.string(),
        htmlUrl: v.string(),
        xmlUrl: v.string(),
        type: v.string(),
    }),
    articles: defineTable({
        title: v.string(),
        url: v.string(),
        sourceId: v.string(),
        publishedAt: v.string(),
        guid: v.string(),

        status: v.string(),

        summary: v.optional(v.string()),
        score: v.optional(
            v.object({
                relevance: v.number(),
                uniqueness: v.number(),
                engagement: v.number(),
                credibility: v.number(),
            }),
        ),
    })
        .index('byStatus', ['status'])
        .searchIndex('searchTitle', { searchField: 'title' }),
});
