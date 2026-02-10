import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    scans: defineTable({
        completedAt: v.optional(v.string()),
        status: v.string(),
        options: v.object({
            rssCount: v.number(),
            daysBack: v.optional(v.number()), // How many days back to scan (default 7)
            parallelism: v.optional(v.number()), // Number of parallel article processors (default 1)
            filterTags: v.optional(v.array(v.string())), // Filter feeds by tags
        }),
        error: v.optional(v.string()),
        // Progress tracking
        totalArticles: v.optional(v.number()),
        processedArticles: v.optional(v.number()),
    }),
    scanQueue: defineTable({
        scanId: v.id('scans'),
        status: v.string(),
        list: v.array(v.id('articles')),
    }).index('byScanId', ['scanId']),
    scanLogs: defineTable({
        scanId: v.id('scans'),
        message: v.string(),
    }).index('byScanId', ['scanId']),
    rss: defineTable({
        name: v.string(),
        htmlUrl: v.string(),
        xmlUrl: v.string(),
        type: v.string(),
        tags: v.optional(v.array(v.string())),
        // Feed health tracking
        lastFetchedAt: v.optional(v.string()),
        lastError: v.optional(v.string()),
        failCount: v.optional(v.number()),
    }),
    articles: defineTable({
        title: v.string(),
        url: v.string(),
        sourceId: v.id('rss'), // Proper reference to RSS feed
        publishedAt: v.string(),
        guid: v.string(),

        status: v.string(),

        // Extracted raw content from the article
        extractedContent: v.optional(v.string()),
        // AI-generated summary
        summary: v.optional(v.string()),
        score: v.optional(
            v.object({
                relevance: v.number(),
                relevanceSummary: v.optional(v.string()),
                uniqueness: v.number(),
                uniquenessSummary: v.optional(v.string()),
                engagement: v.number(),
                engagementSummary: v.optional(v.string()),
                credibility: v.number(),
                credibilitySummary: v.optional(v.string()),
            }),
        ),
        // AI recommendation
        recommendation: v.optional(v.string()),
        videoAngle: v.optional(v.string()),
        // Slack notification tracking
        slackNotifiedAt: v.optional(v.string()),
    })
        .index('byStatus', ['status'])
        .index('byGuid', ['guid'])
        .index('bySourceId', ['sourceId'])
        .index('bySourceIdAndGuid', ['sourceId', 'guid'])
        .index('bySourceIdAndUrl', ['sourceId', 'url'])
        .searchIndex('searchTitle', { searchField: 'title' }),
    systemSettings: defineTable({
        key: v.string(),
        value: v.any(),
        updatedAt: v.string(),
    }).index('byKey', ['key']),
    apiUsage: defineTable({
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
    })
        .index('byScanId', ['scanId'])
        .index('byArticleId', ['articleId']),
});
