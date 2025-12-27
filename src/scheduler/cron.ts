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
        console.log(`[Scheduler] Step 1: Calling crawlAllSources()...`);
        const articles = await crawlAllSources();
        stats.crawled = articles.length;
        console.log(`[Scheduler] Crawled ${articles.length} total articles`);

        // Broadcast: Sources crawled
        console.log(`[Scheduler] Broadcasting sources_crawled...`);
        broadcast({ type: "sources_crawled", count: articles.length });

        // Step 2: Filter out already-seen articles
        console.log(`[Scheduler] Step 2: Filtering out duplicates...`);
        const newArticles = await filterNewArticles(articles);
        stats.new = newArticles.length;
        const duplicates = articles.length - newArticles.length;
        console.log(
            `[Scheduler] ✨ Found ${newArticles.length} new articles, ${duplicates} already in database`
        );

        // Broadcast: Articles filtered
        broadcast({
            type: "filtered",
            newCount: newArticles.length,
            duplicateCount: duplicates,
        });

        if (newArticles.length === 0) {
            console.log("[Scheduler] ℹ️  No new articles to process - all were duplicates");
            return stats;
        }

        // Step 3: Analyze each article for video-worthiness
        console.log(
            `[Scheduler] Step 3: Analyzing ${newArticles.length} articles for video-worthiness...`
        );

        for (let i = 0; i < newArticles.length; i++) {
            const rawArticle = newArticles[i];
            if (!rawArticle) continue;

            console.log(`\n[Scheduler] 📊 Article ${i + 1}/${newArticles.length}`);
            console.log(`[Scheduler]    Title: "${rawArticle.title}"`);
            console.log(`[Scheduler]    Source: ${rawArticle.source}`);
            console.log(`[Scheduler]    URL: ${rawArticle.url}`);

            // Broadcast: Analyzing article
            broadcast({
                type: "analyzing_article",
                current: i + 1,
                total: newArticles.length,
                title: rawArticle.title.slice(0, 100),
            });

            let analysis: VideoWorthiness;
            try {
                console.log(`[Scheduler]    🤖 Calling AI for analysis...`);
                analysis = await analyzeArticle(rawArticle);

                console.log(`[Scheduler]    ✅ Analysis complete:`);
                console.log(`[Scheduler]       Score: ${analysis.score}/100`);
                console.log(
                    `[Scheduler]       Video Worthy: ${analysis.isVideoWorthy ? "YES" : "NO"}`
                );
                console.log(`[Scheduler]       Category: ${analysis.category}`);
                console.log(`[Scheduler]       Urgency: ${analysis.urgency}`);
                console.log(`[Scheduler]       Reasoning: ${analysis.reasoning.slice(0, 100)}...`);
            } catch (error) {
                console.error(`[Scheduler]    ❌ Analysis failed:`, error);
                continue;
            }

            // Step 4: Store in database
            console.log(`[Scheduler]    💾 Saving to database...`);
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
                    `[Scheduler]    🔔 Sending alert (score ${analysis.score} >= threshold ${config.videoWorthyThreshold})`
                );

                const alertSent = await sendVideoWorthyAlert(savedArticle, analysis);
                if (alertSent) {
                    articlesRepo.markAsAlerted(savedArticle.id);
                    stats.alerted++;
                    console.log(`[Scheduler]    ✅ Alert sent successfully`);
                } else {
                    console.log(`[Scheduler]    ⚠️  Alert failed to send`);
                }
            } else {
                console.log(
                    `[Scheduler]    ℹ️  No alert (score ${analysis.score} < threshold ${config.videoWorthyThreshold})`
                );
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
    console.log(`\n[Scheduler] ========== Crawl cycle complete ==========`);
    console.log(`[Scheduler] ⏱️  Duration: ${elapsed}s`);
    console.log(`[Scheduler] 📥 Total crawled: ${stats.crawled}`);
    console.log(`[Scheduler] ✨ New articles: ${stats.new}`);
    console.log(`[Scheduler] 🎥 Video-worthy: ${stats.videoWorthy}`);
    console.log(`[Scheduler] 🔔 Alerts sent: ${stats.alerted}`);
    console.log(`[Scheduler] ===================================================\n`);

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
    console.log(
        `[Scheduler] First crawl will run in ${config.crawlIntervalMs / 1000 / 60 / 60}h (use "Trigger Crawl" button to run manually)`
    );

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
