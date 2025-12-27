import { crawlAllSources, filterNewArticles } from "../crawlers";
import { analyzeArticle } from "../analysis/agent";
import { articlesRepo } from "../db/repositories/articles";
import { sendVideoWorthyAlert } from "../slack/alerts";
import { config } from "../config";
import type { VideoWorthiness } from "../analysis/schemas";
import { broadcast } from "../websocket/manager";

let crawlInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export interface CrawlStats {
    crawled: number;
    new: number;
    videoWorthy: number;
    alerted: number;
}

export async function runCrawlCycle(): Promise<CrawlStats> {
    if (isRunning) {
        console.log("[Scheduler] Crawl already in progress, skipping");
        return { crawled: 0, new: 0, videoWorthy: 0, alerted: 0 };
    }

    isRunning = true;
    const startTime = Date.now();
    console.log(`\n[Scheduler] ========== Starting crawl cycle ==========`);
    console.log(`[Scheduler] Time: ${new Date().toISOString()}`);

    const stats = { crawled: 0, new: 0, videoWorthy: 0, alerted: 0 };

    // Broadcast: Crawl started
    broadcast({ type: "started", timestamp: new Date().toISOString() });

    try {
        // Step 1: Crawl all sources
        const articles = await crawlAllSources();
        stats.crawled = articles.length;
        console.log(`[Scheduler] Crawled ${articles.length} total articles`);

        // Broadcast: Sources crawled
        broadcast({ type: "sources_crawled", count: articles.length });

        // Step 2: Filter out already-seen articles
        const newArticles = await filterNewArticles(articles);
        stats.new = newArticles.length;
        console.log(`[Scheduler] ${newArticles.length} new articles after dedup`);

        // Broadcast: Articles filtered
        broadcast({
            type: "filtered",
            newCount: newArticles.length,
            duplicateCount: articles.length - newArticles.length,
        });

        if (newArticles.length === 0) {
            console.log("[Scheduler] No new articles to process");
            return stats;
        }

        // Step 3: Analyze each article for video-worthiness
        for (let i = 0; i < newArticles.length; i++) {
            const rawArticle = newArticles[i];
            if (!rawArticle) continue;

            // Broadcast: Analyzing article
            broadcast({
                type: "analyzing_article",
                current: i + 1,
                total: newArticles.length,
                title: rawArticle.title.slice(0, 100),
            });

            console.log(`[Scheduler] Analyzing: ${rawArticle.title.slice(0, 50)}...`);

            let analysis: VideoWorthiness;
            try {
                analysis = await analyzeArticle(rawArticle);
            } catch (error) {
                console.error(`[Scheduler] Analysis failed:`, error);
                continue;
            }

            // Step 4: Store in database
            const savedArticle = articlesRepo.insert({
                url: rawArticle.url,
                title: rawArticle.title,
                summary: rawArticle.summary,
                rawContent: rawArticle.rawContent,
                source: rawArticle.source,
                publishedAt: rawArticle.publishedAt?.toISOString() ?? null,
                isVideoWorthy: analysis.isVideoWorthy,
                videoWorthinessScore: analysis.score,
                analysisCategory: analysis.category,
                analysisJson: JSON.stringify(analysis),
            });

            // Broadcast: Article saved
            broadcast({
                type: "article_saved",
                score: analysis.score,
                isVideoWorthy: analysis.isVideoWorthy,
            });

            // Step 5: Alert if video-worthy and above threshold
            if (analysis.isVideoWorthy && analysis.score >= config.videoWorthyThreshold) {
                stats.videoWorthy++;
                console.log(
                    `[Scheduler] Video-worthy (${analysis.score}): ${rawArticle.title.slice(0, 50)}`
                );

                const alertSent = await sendVideoWorthyAlert(savedArticle, analysis);
                if (alertSent) {
                    articlesRepo.markAsAlerted(savedArticle.id);
                    stats.alerted++;
                }
            }

            // Small delay between analyses to avoid rate limits
            await Bun.sleep(1000);
        }
    } catch (error) {
        console.error("[Scheduler] Crawl cycle error:", error);

        // Broadcast: Error occurred
        broadcast({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error occurred",
        });
    } finally {
        isRunning = false;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Scheduler] ========== Crawl cycle complete ==========`);
    console.log(
        `[Scheduler] Stats: ${stats.crawled} crawled, ${stats.new} new, ${stats.videoWorthy} video-worthy, ${stats.alerted} alerted`
    );
    console.log(`[Scheduler] Duration: ${elapsed}s\n`);

    // Broadcast: Crawl completed
    broadcast({
        type: "completed",
        stats,
        durationSeconds: parseFloat(elapsed),
    });

    return stats;
}

export function startCrawlScheduler(): void {
    console.log(`[Scheduler] Starting with ${config.crawlIntervalMs / 1000 / 60 / 60}h interval`);
    console.log(`[Scheduler] First crawl will run in ${config.crawlIntervalMs / 1000 / 60 / 60}h (use "Trigger Crawl" button to run manually)`);

    // Run on interval only (not immediately on startup)
    crawlInterval = setInterval(() => {
        runCrawlCycle().catch(console.error);
    }, config.crawlIntervalMs);
}

export function stopCrawlScheduler(): void {
    if (crawlInterval) {
        clearInterval(crawlInterval);
        crawlInterval = null;
        console.log("[Scheduler] Stopped");
    }
}

export function getSchedulerStatus(): {
    isRunning: boolean;
    intervalMs: number;
} {
    return {
        isRunning,
        intervalMs: config.crawlIntervalMs,
    };
}
