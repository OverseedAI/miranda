# Miranda Architecture

This document describes the architecture and data flow of Miranda's RSS scanning and article analysis system.

## Overview

Miranda is an RSS feed aggregator that scans feeds, extracts article content, and uses AI to analyze articles for YouTube video potential. The system is built on Convex with a Node.js runtime for external API calls and AI processing.

## Tech Stack

- **Frontend**: React + TanStack Router + TanStack Query
- **Backend**: Convex (serverless functions + database)
- **AI**: OpenAI GPT-4o-mini via Convex Agent SDK
- **UI**: shadcn/ui + Tailwind CSS + Tabler Icons

## Database Schema

### Tables

```
scans
├── status: string (initializing | running | completed)
├── options: { rssCount, daysBack?, parallelism? }
├── totalArticles?: number
├── processedArticles?: number
├── completedAt?: string
└── error?: string

scanQueue
├── scanId: Id<'scans'>
├── status: string (awaiting | processing | completed)
└── list: Id<'articles'>[]

scanLogs
├── scanId: Id<'scans'>
└── message: string

rss
├── name: string
├── htmlUrl: string
├── xmlUrl: string
├── type: string (rss | atom | json)
├── lastFetchedAt?: string
├── lastError?: string
└── failCount?: number

articles
├── title: string
├── url: string
├── sourceId: Id<'rss'>
├── publishedAt: string
├── guid: string
├── status: string (pending | processing | completed | failed)
├── extractedContent?: string
├── summary?: string
├── score?: { relevance, uniqueness, engagement, credibility }
├── recommendation?: string
└── videoAngle?: string
```

### Indexes

- `scanQueue.byScanId` - efficient queue lookups
- `scanLogs.byScanId` - efficient log retrieval
- `articles.byStatus` - filter by processing status
- `articles.byGuid` - deduplication
- `articles.bySourceId` - articles per feed
- `articles.searchTitle` - full-text search

## Scanning Pipeline

The scanning process follows a chain-scheduled pipeline pattern where each step schedules the next via Convex's scheduler.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER ACTION                                    │
│                    Scanner Page → queueScan()                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: INITIALIZATION                          │
│                                                                          │
│  1. Check no scan is running                                            │
│  2. Create 'scans' record (status: INITIALIZING)                        │
│  3. Schedule parseFeeds action                                          │
│                                                                          │
│  File: convex/services/scans.ts → queueScan()                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2: RSS PARSING                              │
│                           (Node.js Runtime)                              │
│                                                                          │
│  1. Fetch RSS feeds from database (limited by rssCount)                 │
│  2. Parse each feed URL with rss-parser library                         │
│  3. Filter articles to last N days (configurable daysBack)              │
│  4. Bulk insert articles (deduplicate by guid)                          │
│  5. Track feed success/failure for health monitoring                    │
│  6. Create processing queue with article IDs                            │
│  7. Update scan status to RUNNING with totalArticles                    │
│  8. Schedule N parallel article processors (configurable parallelism)   │
│                                                                          │
│  File: convex/node/rssParser.ts → parseFeeds()                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PHASE 3: CONTENT EXTRACTION                            │
│                      (Parallel Processors)                               │
│                                                                          │
│  For each article (in parallel, up to parallelism count):               │
│                                                                          │
│  1. Pop next article from queue (atomic operation)                      │
│  2. If queue empty → mark scan COMPLETED, exit                          │
│  3. Update article status to PROCESSING                                 │
│  4. Use AI agent to fetch and extract article text                      │
│     - Fetches HTML via fetch()                                          │
│     - AI extracts main content, removes ads/nav/comments               │
│  5. Save extractedContent to article                                    │
│  6. Increment processedArticles counter                                 │
│  7. Schedule AI analyzer for this article                               │
│                                                                          │
│  File: convex/node/articleProcessor.ts → processNextArticle()           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PHASE 4: AI ANALYSIS                                │
│                                                                          │
│  1. Get article with extractedContent                                   │
│  2. Use AI agent to analyze for YouTube video potential                 │
│  3. Generate scores (1-10):                                             │
│     - Relevance: Current events relevance                               │
│     - Uniqueness: Unique insights                                       │
│     - Engagement: Viewer engagement potential                           │
│     - Credibility: Source trustworthiness                               │
│  4. Generate recommendation (highly_recommended | recommended |          │
│     maybe | not_recommended)                                            │
│  5. Suggest video angle/hook                                            │
│  6. Save summary, scores, recommendation, videoAngle                    │
│  7. Update article status to COMPLETED                                  │
│  8. Schedule next article processor (chain continues)                   │
│                                                                          │
│  File: convex/node/aiAnalyzer.ts → analyzeArticle()                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCAN COMPLETE                                    │
│                                                                          │
│  When all articles processed:                                           │
│  - Queue returns null (empty)                                           │
│  - Scan status updated to COMPLETED                                     │
│  - completedAt timestamp set                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### Services Layer (`convex/services/`)

| Service | Purpose |
|---------|---------|
| `scans.ts` | Scan lifecycle management (queue, cancel, status updates) |
| `queue.ts` | Article processing queue (FIFO with atomic pop) |
| `articles.ts` | Article CRUD, status updates, retry logic |
| `rss.ts` | RSS feed management, health tracking |
| `logs.ts` | Scan logging for debugging |
| `watchdog.ts` | Stalled scan detection and recovery |

### Node.js Actions (`convex/node/`)

| Action | Purpose |
|--------|---------|
| `rssParser.ts` | Fetches and parses RSS feeds using rss-parser |
| `articleProcessor.ts` | Extracts article content using AI agent |
| `aiAnalyzer.ts` | Analyzes articles for video potential using AI |

### Frontend Routes (`src/routes/app/`)

| Route | Purpose |
|-------|---------|
| `scanner.tsx` | Scan configuration, progress, history, and logs |
| `articles.tsx` | Browse and filter analyzed articles |
| `rss.tsx` | Manage RSS feed sources |

## Chain Scheduling Pattern

The system uses Convex's scheduler for reliable, distributed processing:

```typescript
// Instead of recursive function calls:
await ctx.scheduler.runAfter(0, internal.node.articleProcessor.processNextArticle, {
    scanId,
});
```

Benefits:
- No stack overflow from deep recursion
- Automatic retry on failures
- Survives process restarts
- Parallel processing via multiple scheduled tasks

## Parallel Processing

Parallelism is achieved by scheduling multiple processors at scan start:

```typescript
const processorsToStart = Math.min(parallelism, articleIds.length);
for (let i = 0; i < processorsToStart; i++) {
    await ctx.scheduler.runAfter(i * 100, internal.node.articleProcessor.processNextArticle, {
        scanId,
    });
}
```

Each processor atomically pops from the queue, ensuring no duplicate processing.

## Error Handling

### Article-Level Failures
- Articles that fail extraction or analysis are marked `FAILED`
- Processing continues with the next article
- Failed articles can be retried from the UI

### Feed-Level Failures
- Failed feeds increment `failCount` and store `lastError`
- Visible in RSS management UI for troubleshooting
- Successful fetches reset `failCount` to 0

### Scan-Level Recovery
- Watchdog cron runs every 30 seconds
- Detects stalled scans (stuck in INITIALIZING > 5 min)
- Restarts processing if queue has items but is marked complete

## AI Agents

Two AI agents power the content processing:

### Content Extractor Agent
- Model: GPT-4o-mini
- Tool: `fetchArticle` - fetches HTML content
- Task: Extract main article text, remove ads/navigation/comments
- Max steps: 5

### Video Analyzer Agent
- Model: GPT-4o-mini
- Task: Score articles on 4 criteria, recommend for video, suggest angle
- Output: Structured JSON with scores and recommendations
- Max steps: 1

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `rssCount` | 10 | Number of RSS feeds to scan |
| `daysBack` | 7 | How many days back to include articles |
| `parallelism` | 3 | Number of parallel article processors |

## Status Enums

### ScanStatus
- `INITIALIZING` - Scan created, RSS parsing scheduled
- `RUNNING` - Actively processing articles
- `COMPLETED` - All articles processed

### ArticleStatus
- `PENDING` - Waiting to be processed
- `PROCESSING` - Content being extracted
- `COMPLETED` - Analysis complete
- `FAILED` - Error during processing

### ScanQueueStatus
- `AWAITING` - Queue created, waiting for processing
- `PROCESSING` - Articles being processed
- `COMPLETED` - Queue exhausted

## Performance Considerations

1. **Indexes**: All frequently queried fields are indexed
2. **Batch Operations**: Articles inserted in bulk to reduce writes
3. **Deduplication**: Articles checked by `guid` index before insert
4. **Content Limits**: Extracted content truncated to 10,000 chars
5. **Parallelism**: Configurable concurrent processors (1-10)
6. **Staggered Start**: Parallel processors start 100ms apart to avoid thundering herd

## Future Improvements

Potential enhancements identified:

1. **Batch AI Requests**: Process multiple articles in single AI call
2. **Priority Queue**: Process high-value feeds first
3. **Incremental Updates**: Only re-fetch changed articles
4. **Feed Scheduling**: Per-feed scan intervals
5. **Export Features**: Export analyzed articles to various formats
6. **Notifications**: Alert when high-scoring articles found
