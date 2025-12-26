import type { RawArticle } from "./types";
import { crawlHackerNews } from "./hackernews";
import { crawlTechCrunch } from "./techcrunch";
import { crawlTheVerge } from "./theverge";
import { crawlVentureBeat } from "./venturebeat";
import { crawlDevTo } from "./devto";
import { crawlOpenAIBlog } from "./blogs/openai";
import { crawlAnthropicBlog } from "./blogs/anthropic";
import { crawlGoogleAIBlog } from "./blogs/google-ai";
import { articlesRepo } from "../db/repositories/articles";

// All crawler functions
const crawlers = [
    { name: "HackerNews", fn: crawlHackerNews },
    { name: "TechCrunch", fn: crawlTechCrunch },
    { name: "TheVerge", fn: crawlTheVerge },
    { name: "VentureBeat", fn: crawlVentureBeat },
    { name: "DevTo", fn: crawlDevTo },
    { name: "OpenAI Blog", fn: crawlOpenAIBlog },
    { name: "Anthropic Blog", fn: crawlAnthropicBlog },
    { name: "Google AI Blog", fn: crawlGoogleAIBlog },
];

export async function crawlAllSources(): Promise<RawArticle[]> {
    console.log(`Starting crawl of ${crawlers.length} sources...`);
    const startTime = Date.now();

    // Run all crawlers in parallel with error handling
    const results = await Promise.allSettled(
        crawlers.map(async ({ name, fn }) => {
            try {
                const articles = await fn();
                return { name, articles };
            } catch (error) {
                console.error(`[${name}] Failed:`, error);
                return { name, articles: [] };
            }
        })
    );

    // Collect all articles
    const allArticles: RawArticle[] = [];
    for (const result of results) {
        if (result.status === "fulfilled") {
            allArticles.push(...result.value.articles);
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`Crawl complete: ${allArticles.length} total articles in ${elapsed}ms`);

    return deduplicateArticles(allArticles);
}

function deduplicateArticles(articles: RawArticle[]): RawArticle[] {
    // Deduplicate by URL
    const seen = new Set<string>();
    const unique: RawArticle[] = [];

    for (const article of articles) {
        const normalizedUrl = normalizeUrl(article.url);
        if (!seen.has(normalizedUrl)) {
            seen.add(normalizedUrl);
            unique.push(article);
        }
    }

    console.log(`Deduplication: ${articles.length} -> ${unique.length} articles`);
    return unique;
}

function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Remove trailing slash, query params for comparison
        return `${parsed.hostname}${parsed.pathname.replace(/\/$/, "")}`;
    } catch {
        return url;
    }
}

export async function filterNewArticles(articles: RawArticle[]): Promise<RawArticle[]> {
    // Filter out articles we've already seen
    const newArticles: RawArticle[] = [];

    for (const article of articles) {
        if (!articlesRepo.exists(article.url)) {
            newArticles.push(article);
        }
    }

    console.log(`New articles: ${newArticles.length} of ${articles.length}`);
    return newArticles;
}
