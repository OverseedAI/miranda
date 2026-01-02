Slack Integration & Auto-Scanning Feature Plan

Overview

Implement Slack notifications for recommended articles with configurable auto-scanning, RSS feed tagging, and a dedicated settings page.

Current State Analysis

What Exists

- Scanner page with manual scan triggering and per-scan configuration
- Watchdog cron job (every 30s) for stalled scan recovery
- RSS feed management (flat list, no tags/categories)
- AI analysis with recommendations (highly_recommended, recommended, maybe, not_recommended)
- No settings page (sidebar link is placeholder #)
- No external notification integrations

What's Needed

1. System Settings Table - Persistent configuration storage
2. Settings Page - UI for managing system configuration
3. Auto-Scan Cron - Configurable scheduled scanning
4. Slack Integration - Workspace connection and message posting
5. RSS Tagging System - Tags for feeds with filtering
6. Slack Notification Cron - Periodic digest of top recommendations

 ---
Implementation Phases

Phase 1: Foundation - Settings System

Goal: Create the infrastructure for system-wide configuration

1.1 Database Schema

// convex/schema.ts - Add new table
systemSettings: defineTable({
key: v.string(),      // Setting identifier
value: v.any(),       // Setting value (flexible type)
updatedAt: v.string(),
}).index('byKey', ['key']),

Settings Keys:
| Key                         | Type     | Default | Description                             |
|-----------------------------|----------|---------|-----------------------------------------|
| autoScan.enabled            | boolean  | false   | Toggle auto-scanning                    |
| autoScan.intervalMinutes    | number   | 240     | Scan interval (60, 120, 240, 480, 1440) |
| autoScan.rssCount           | number   | 10      | Feeds per scan                          |
| autoScan.daysBack           | number   | 7       | Days to look back                       |
| autoScan.parallelism        | number   | 3       | Parallel processors                     |
| autoScan.filterTags         | string[] | []      | Tags to filter (empty = all)            |
| autoScan.lastRunAt          | string   | null    | Last scan timestamp                     |
| slack.enabled               | boolean  | false   | Toggle Slack notifications              |
| slack.channelId             | string   | null    | Target channel ID                       |
| slack.notifyIntervalMinutes | number   | 60      | Notification interval                   |
| slack.topArticleCount       | number   | 5       | Articles per digest                     |
| slack.lastNotifiedAt        | string   | null    | Last notification timestamp             |

1.2 Settings Service

File: convex/services/settings.ts
- getSetting(key) - Get single setting
- getSettings(keys[]) - Get multiple settings
- getAllSettings() - Get all settings
- setSetting(key, value) - Update single setting
- setSettings(updates[]) - Batch update

1.3 Settings Page Route

File: src/routes/app/settings.tsx
- Update sidebar to link to /app/settings
- Sections for: Auto-Scan, Slack Integration

 ---
Phase 2: RSS Feed Tagging

Goal: Add tags to RSS feeds for filtering

2.1 Schema Update

// Update rss table
rss: defineTable({
// ... existing fields
tags: v.optional(v.array(v.string())), // New field
}),

2.2 Service Updates

File: convex/services/rss.ts
- Update createRss to accept tags
- Update updateRss to accept tags
- Add getAllTags() query - unique tags across all feeds
- Add getFeedsByTags(tags[]) query

2.3 UI Updates

File: src/components/rss-modal.tsx
- Add tag input (comma-separated or chip-based)
- Show existing tags as suggestions

File: src/routes/app/rss.tsx
- Add tag filter dropdown (multi-select)
- Display tags as badges on feed rows

 ---
Phase 3: Auto-Scan System

Goal: Automated scheduled scanning

3.1 Cron Job

File: convex/crons.ts
// Add auto-scan cron (runs every minute, checks if scan needed)
crons.interval(
'auto scan check',
{ minutes: 1 },
internal.services.autoScan.checkAndTriggerScan,
{}
);

3.2 Auto-Scan Service

File: convex/services/autoScan.ts
- checkAndTriggerScan() - Internal action
    - Check if auto-scan enabled
    - Check if interval elapsed since last scan
    - Check no scan currently running
    - If all conditions met, trigger scan with configured params
    - Apply tag filter to RSS feeds if configured

3.3 RSS Parser Update

File: convex/node/rssParser.ts
- Add optional tags parameter to parseFeeds
- Filter feeds by tags before processing

 ---
Phase 4: Slack Integration

Goal: Send notifications to Slack channel using Bot Token API

4.1 Slack Service

File: convex/node/slackService.ts (Node.js runtime)

Functions:
- listChannels() - Fetch available channels for UI dropdown
- postMessage(channelId, blocks) - Send formatted message
- checkAndSendDigest() - Main cron handler

Dependencies:
pnpm add @slack/web-api

4.2 Message Format (Slack Block Kit)

📰 *Top Recommended Articles*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 *Highly Recommended*

*<url|Article Title>*
Score: 8.5/10 | Published: Jan 2
> Summary snippet here...
💡 *Video Angle:* Suggested hook for video

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ *Recommended*
...

4.3 Notification Cron

File: convex/crons.ts
crons.interval(
'slack notification',
{ minutes: 5 },  // Check frequently, actual interval in settings
internal.node.slackService.checkAndSendDigest,
{}
);

4.4 Digest Logic

1. Check if Slack is enabled in settings
2. Check if notification interval has elapsed
3. Query articles where:
- recommendation IN ('highly_recommended', 'recommended')
- slackNotifiedAt IS NULL (never re-notify)
4. Sort by average score descending
5. Take top N (configurable, default 5)
6. Format as Slack blocks
7. Post to configured channel
8. Mark articles with slackNotifiedAt = now()

4.5 Schema Update

// Add to articles table
slackNotifiedAt: v.optional(v.string()), // ISO timestamp when sent to Slack

4.6 Settings Page - Slack Section

- Fetch channels via listChannels() for dropdown
- Show connection status (valid token or not)
- Test button to send a test message

 ---
Phase 5: Settings UI

Goal: Complete settings page with all controls

5.1 Auto-Scan Section

- Toggle: Enable/Disable auto-scanning
- Dropdown: Scan interval (1h, 2h, 4h, 8h, 24h)
- Number inputs: RSS count, days back, parallelism
- Tag filter: Multi-select of available tags

5.2 Slack Section

- Toggle: Enable/Disable Slack notifications
- Input: Slack Bot Token (from env var display)
- Input: Channel ID
- Dropdown: Notification interval (15m, 30m, 1h, 2h, 4h)
- Number input: Articles per digest
- Test button: Send test message

 ---
File Changes Summary

New Files

| File                        | Purpose                                   |
 |-----------------------------|-------------------------------------------|
| convex/services/settings.ts | Settings CRUD operations                  |
| convex/services/autoScan.ts | Auto-scan trigger logic                   |
| convex/node/slackService.ts | Slack API integration (channels, posting) |
| src/routes/app/settings.tsx | Settings page UI                          |

Modified Files

| File                           | Changes                                                            |
 |--------------------------------|--------------------------------------------------------------------|
| convex/schema.ts               | Add systemSettings table, tags to rss, slackNotifiedAt to articles |
| convex/crons.ts                | Add auto-scan check and slack notification crons                   |
| convex/services/rss.ts         | Add tag-related queries, update create/update mutations            |
| convex/services/articles.ts    | Add query for unnotified recommended articles                      |
| convex/node/rssParser.ts       | Add tag filtering support                                          |
| src/routes/app/rss.tsx         | Add tag filter dropdown, display tags on rows                      |
| src/components/rss-modal.tsx   | Add tag input field                                                |
| src/components/app-sidebar.tsx | Update Settings link to /app/settings                              |
| package.json                   | Add @slack/web-api dependency                                      |

 ---
Implementation Order

Recommended order for multi-session implementation:

 ---
Session 1: Settings Foundation + Basic Page

Scope: Create settings infrastructure and basic UI

Tasks:
1. Add systemSettings table to convex/schema.ts
2. Create convex/services/settings.ts with CRUD operations
3. Create src/routes/app/settings.tsx with placeholder sections
4. Update src/components/app-sidebar.tsx to link to /app/settings
5. Run npx convex dev to sync schema

Deliverable: Working settings page that can store/retrieve settings

 ---
Session 2: RSS Tagging System

Scope: Add tags to RSS feeds with UI

Tasks:
1. Add tags field to rss table in convex/schema.ts
2. Update convex/services/rss.ts:
- Modify createRss and updateRss to handle tags
- Add getAllTags() query
- Add getFeedsByTags(tags[]) internal query
3. Update src/components/rss-modal.tsx:
- Add tag input field (comma-separated)
4. Update src/routes/app/rss.tsx:
- Add tag filter multi-select dropdown
- Display tags as badges on feed rows

Deliverable: Can tag RSS feeds and filter by tags

 ---
Session 3: Auto-Scan System

Scope: Scheduled automatic scanning

Tasks:
1. Create convex/services/autoScan.ts:
- checkAndTriggerScan() internal action
- Check enabled, interval, no running scan
- Apply tag filter to feed selection
2. Update convex/crons.ts:
- Add auto-scan check cron (every 1 minute)
3. Update convex/node/rssParser.ts:
- Add optional tags parameter
- Filter feeds by tags before processing
4. Update src/routes/app/settings.tsx:
- Add Auto-Scan section with controls

Deliverable: Auto-scanning works with configurable interval and tag filter

 ---
Session 4: Slack Integration

Scope: Slack notifications for top articles

Tasks:
1. Install @slack/web-api package
2. Add slackNotifiedAt to articles table in convex/schema.ts
3. Create convex/node/slackService.ts:
- listChannels() - for UI dropdown
- postMessage() - send formatted message
- checkAndSendDigest() - cron handler
4. Add getUnnotifiedRecommendedArticles() query in convex/services/articles.ts
5. Update convex/crons.ts:
- Add Slack notification cron (every 5 minutes)
6. Update src/routes/app/settings.tsx:
- Add Slack section with channel picker, test button

Deliverable: Slack notifications sent for recommended articles

 ---
Session 5: Polish & Testing

Scope: Refinements and edge cases

Tasks:
1. Add loading states and error handling to settings page
2. Add Slack connection status indicator
3. Handle edge cases (no token, invalid channel, rate limits)
4. Test full flow: auto-scan → analyze → notify
5. Update docs/ARCHITECTURE.md with new features

 ---
Design Decisions

| Decision        | Choice          | Rationale                                     |
 |-----------------|-----------------|-----------------------------------------------|
| Slack Auth      | Bot Token + API | More control, can list channels for selection |
| Tag System      | Free-form tags  | Flexible, user types any tag                  |
| Re-notification | Never re-notify | Once sent to Slack, marked permanently        |
| Channels        | Single channel  | Simpler setup, sufficient for now             |

 ---
Environment Variables

# Required for Slack integration
SLACK_BOT_TOKEN=xoxb-your-bot-token  # Bot OAuth token

The Slack Bot Token should be created in the Slack App dashboard and passed as an environment variable. The channel selection will be done in the UI by listing available channels via the Slack API.
