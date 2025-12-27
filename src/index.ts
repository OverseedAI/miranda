import { initDatabase } from "./db/schema";
import { startCrawlScheduler, runCrawlCycle, getSchedulerStatus } from "./scheduler/cron";
import { startSlackBot, getSlackStatus } from "./slack/bot";
import { articlesRepo } from "./db/repositories/articles";
import { config, validateConfig } from "./config";
import homepage from "./frontend/index.html";
import { addConnection, removeConnection } from "./websocket/manager";

// Validate configuration
try {
    validateConfig();
} catch (error) {
    console.error("Configuration error:", error);
    process.exit(1);
}

// Initialize database
initDatabase();

// Start Slack bot (non-blocking if not configured)
startSlackBot().catch(console.error);

// Start crawl scheduler
startCrawlScheduler();

// HTTP API for manual operations and health checks
const server = Bun.serve({
    port: config.port,
    routes: {
        // Frontend dashboard
        "/": homepage,

        // Health check
        "/health": new Response(
            JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
            { headers: { "Content-Type": "application/json" } }
        ),

        // Get scheduler status
        "/api/status": {
            GET: async () => {
                const schedulerStatus = getSchedulerStatus();
                const slackStatus = await getSlackStatus();
                return Response.json({
                    scheduler: schedulerStatus,
                    slack: slackStatus,
                    config: {
                        model: config.model,
                        videoWorthyThreshold: config.videoWorthyThreshold,
                        slackConfigured: Boolean(config.slackBotToken),
                    },
                });
            },
        },

        // Manual trigger crawl
        "/api/crawl": {
            POST: async () => {
                console.log("[API] Manual crawl triggered");

                // Check if crawl is already running
                const status = getSchedulerStatus();
                if (status.isRunning) {
                    return new Response(JSON.stringify({ error: "Crawl already in progress" }), {
                        status: 409,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                // Start crawl asynchronously (don't await)
                runCrawlCycle().catch((error) => {
                    console.error("[API] Crawl error:", error);
                });

                // Return immediately with 202 Accepted
                return new Response(
                    JSON.stringify({ message: "Crawl started", status: "in_progress" }),
                    {
                        status: 202,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            },
        },

        // Get recent articles
        "/api/articles": {
            GET: async (req) => {
                const url = new URL(req.url);
                const limit = parseInt(url.searchParams.get("limit") || "20", 10);
                const videoWorthyOnly = url.searchParams.get("videoWorthy") === "true";

                const articles = videoWorthyOnly
                    ? articlesRepo.findRecentVideoWorthy(limit)
                    : articlesRepo.findRecent(limit);

                return Response.json({
                    count: articles.length,
                    articles: articles.map((a) => ({
                        id: a.id,
                        title: a.title,
                        url: a.url,
                        source: a.source,
                        isVideoWorthy: a.isVideoWorthy,
                        score: a.videoWorthinessScore,
                        category: a.analysisCategory,
                        crawledAt: a.crawledAt,
                    })),
                });
            },
        },

        // Get single article with full details
        "/api/articles/:id": {
            GET: async (req) => {
                const id = req.params.id;
                const article = articlesRepo.findById(id);

                if (!article) {
                    return new Response(JSON.stringify({ error: "Not found" }), {
                        status: 404,
                        headers: { "Content-Type": "application/json" },
                    });
                }

                return Response.json({
                    ...article,
                    analysis: article.analysisJson ? JSON.parse(article.analysisJson) : null,
                });
            },
        },

        // Search articles
        "/api/search": {
            GET: async (req) => {
                const url = new URL(req.url);
                const query = url.searchParams.get("q") || "";
                const limit = parseInt(url.searchParams.get("limit") || "10", 10);

                if (!query) {
                    return new Response(
                        JSON.stringify({ error: "Query parameter 'q' is required" }),
                        {
                            status: 400,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }

                const articles = articlesRepo.searchByContent(query, limit);
                return Response.json({
                    query,
                    count: articles.length,
                    articles: articles.map((a) => ({
                        id: a.id,
                        title: a.title,
                        url: a.url,
                        source: a.source,
                        isVideoWorthy: a.isVideoWorthy,
                        score: a.videoWorthinessScore,
                        summary: a.summary?.slice(0, 200),
                    })),
                });
            },
        },

        // WebSocket endpoint for real-time crawl progress
        "/ws": {
            GET: (req) => {
                const upgraded = server.upgrade(req);
                if (!upgraded) {
                    return new Response("WebSocket upgrade failed", { status: 400 });
                }
                return undefined;
            },
        },
    },

    // WebSocket handler for real-time crawl progress
    websocket: {
        open(ws) {
            addConnection(ws);
            ws.send(JSON.stringify({ type: "connected" }));
        },

        message(ws, message) {
            // Optional: handle client->server messages if needed
        },

        close(ws) {
            removeConnection(ws);
        },
    },

    // Fallback for unmatched routes
    fetch(req) {
        return new Response(
            JSON.stringify({
                error: "Not found",
                availableRoutes: [
                    "GET /health",
                    "GET /api/status",
                    "POST /api/crawl",
                    "GET /api/articles",
                    "GET /api/articles/:id",
                    "GET /api/search?q=query",
                ],
            }),
            {
                status: 404,
                headers: { "Content-Type": "application/json" },
            }
        );
    },
});

console.log(`
╔════════════════════════════════════════════════════════╗
║           AI News Agent Started Successfully           ║
╠════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${config.port.toString().padEnd(24)}║
║  Model:      ${config.model.padEnd(40)}║
║  Threshold:  ${String(config.videoWorthyThreshold).padEnd(40)}║
║  Interval:   ${(config.crawlIntervalMs / 1000 / 60 / 60 + "h").padEnd(40)}║
╚════════════════════════════════════════════════════════╝

Endpoints:
  GET  /                - Dashboard UI
  GET  /health          - Health check
  GET  /api/status      - Scheduler status
  POST /api/crawl       - Trigger manual crawl
  GET  /api/articles    - List recent articles
  GET  /api/search?q=   - Search articles

Slack: ${config.slackBotToken ? "Configured" : "Not configured (set SLACK_BOT_TOKEN)"}
`);
