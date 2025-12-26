// Environment configuration
// Bun auto-loads .env, so we just access process.env directly

export const config = {
    // Anthropic
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",

    // Slack
    slackBotToken: process.env.SLACK_BOT_TOKEN || "",
    slackSigningSecret: process.env.SLACK_SIGNING_SECRET || "",
    slackAppToken: process.env.SLACK_APP_TOKEN || "",
    slackAlertChannel: process.env.SLACK_ALERT_CHANNEL || "#ai-news-alerts",

    // Server
    port: parseInt(process.env.PORT || "3000", 10),

    // Database
    dbPath: process.env.DB_PATH || "./data/news.db",

    // Scheduler
    crawlIntervalMs: parseInt(process.env.CRAWL_INTERVAL_MS || String(4 * 60 * 60 * 1000), 10), // 4 hours

    // Analysis
    videoWorthyThreshold: parseInt(process.env.VIDEO_WORTHY_THRESHOLD || "70", 10),
    model: process.env.MODEL || "claude-sonnet-4-5-20250929",
} as const;

export function validateConfig(): void {
    if (!config.anthropicApiKey) {
        throw new Error("ANTHROPIC_API_KEY is required");
    }
}
