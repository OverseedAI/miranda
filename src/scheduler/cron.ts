import { crawlAllSources, filterNewArticles } from "../crawlers";
import { analyzeArticle } from "../analysis/agent";
import { articlesRepo } from "../db/repositories/articles";
import { sendVideoWorthyAlert } from "../slack/alerts";
import { config } from "../config";
import type { VideoWorthiness } from "../analysis/schemas";

let crawlInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export async function runCrawlCycle(): Promise<{
    crawled: number;
    new: number;
    videoWorthy: number;
    alerted: number;
}> {
    if (isRunning) {
        console.log("[Scheduler] Crawl already in progress, skipping");
        return { crawled: 0, new: 0, videoWorthy: 0, alerted: 0 };
    }

    isRunning = true;
    const startTime = Date.now();
    console.log(`\n[Scheduler] ========== Starting crawl cycle ==========`);
    console.log(`[Scheduler] Time: ${new Date().toISOString()}`);

    const stats = { crawled: 0, new: 0, videoWorthy: 0, alerted: 0 };

    try {
        // Step 1: Crawl all sources
        const articles = await crawlAllSources();
        stats.crawled = articles.length;
        console.log(`[Scheduler] Crawled ${articles.length} total articles`);

        // Step 2: Filter out already-seen articles
        const newArticles = await filterNewArticles(articles);
        stats.new = newArticles.length;
        console.log(`[Scheduler] ${newArticles.length} new articles after dedup`);

        if (newArticles.length === 0) {
            console.log("[Scheduler] No new articles to process");
            return stats;
        }

        // Step 3: Analyze each article for video-worthiness
        for (const rawArticle of newArticles) {
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
    } finally {
        isRunning = false;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Scheduler] ========== Crawl cycle complete ==========`);
    console.log(
        `[Scheduler] Stats: ${stats.crawled} crawled, ${stats.new} new, ${stats.videoWorthy} video-worthy, ${stats.alerted} alerted`
    );
    console.log(`[Scheduler] Duration: ${elapsed}s\n`);

    return stats;
}

export function startCrawlScheduler(): void {
    console.log(`[Scheduler] Starting with ${config.crawlIntervalMs / 1000 / 60 / 60}h interval`);

    // Run immediately on startup
    runCrawlCycle().catch(console.error);

    // Then run on interval
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
