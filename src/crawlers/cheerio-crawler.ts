import * as cheerio from "cheerio";
import type { RawArticle } from "./types";
import { isAIRelated, extractSummary } from "./types";
import extractArticleWithLLM from "./llm-extractor";

interface CrawlerConfig {
    url: string;
    source: string;
    selector?: string;
    titleSelector?: string;
    filterAI?: boolean;
    maxArticles?: number;
}

export async function crawlWithCheerio(config: CrawlerConfig): Promise<RawArticle[]> {
    const maxArticles = config.maxArticles ?? 15;

    try {
        // Step 1: Fetch the listing page HTML
        console.log(`[${config.source}] Fetching listing page: ${config.url}`);
        const response = await fetch(config.url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();

        // Step 2: Parse HTML and extract article links
        const $ = cheerio.load(html);
        const articleLinks: string[] = [];

        // Try multiple strategies to find article links
        const articleSelector = config.selector || "article";

        // Strategy 1: Use the provided selector (if elements exist)
        if ($(articleSelector).length > 0) {
            $(articleSelector).each((_, element) => {
                const $article = $(element);
                const link = $article.find("a[href]").first().attr("href");

                if (link) {
                    const absoluteUrl = new URL(link, config.url).href;
                    if (!articleLinks.includes(absoluteUrl) && articleLinks.length < maxArticles) {
                        articleLinks.push(absoluteUrl);
                    }
                }
            });
        }

        // Strategy 2: If no links found, try common article link patterns
        if (articleLinks.length === 0) {
            console.log(
                `[${config.source}] No elements found with "${articleSelector}", trying alternative selectors...`
            );

            // Try h3 a, h2 a (common for article titles)
            const titleLinks = $("h3 a, h2 a");
            titleLinks.each((_, element) => {
                const link = $(element).attr("href");
                if (link) {
                    const absoluteUrl = new URL(link, config.url).href;
                    // Filter for article-like URLs (contain year pattern like /2024/ or /2025/)
                    if (absoluteUrl.match(/\/20\d{2}\//) && !articleLinks.includes(absoluteUrl)) {
                        if (articleLinks.length < maxArticles) {
                            articleLinks.push(absoluteUrl);
                        }
                    }
                }
            });
        }

        console.log(`[${config.source}] Found ${articleLinks.length} article links`);

        if (articleLinks.length === 0) {
            console.log(`[${config.source}] No articles found with any selector`);
            return [];
        }

        // Step 3: Fetch and extract content from each article
        const articles: RawArticle[] = [];

        for (let i = 0; i < articleLinks.length; i++) {
            const articleUrl = articleLinks[i];
            if (!articleUrl) continue;

            try {
                console.log(
                    `[${config.source}] [${i + 1}/${articleLinks.length}] Fetching: ${articleUrl.slice(0, 60)}...`
                );

                // Fetch individual article
                const articleResponse = await fetch(articleUrl);
                if (!articleResponse.ok) {
                    console.log(
                        `[${config.source}] HTTP ${articleResponse.status} for ${articleUrl}`
                    );
                    continue;
                }

                const articleHtml = await articleResponse.text();

                // Extract content using LLM
                const extracted = await extractArticleWithLLM(articleHtml, articleUrl);

                if (!extracted) {
                    console.log(`[${config.source}] LLM extraction failed for ${articleUrl}`);
                    continue;
                }

                // Skip if filter is enabled and not AI-related
                if (config.filterAI && !isAIRelated(extracted.content)) {
                    console.log(
                        `[${config.source}] Not AI-related, skipping: ${extracted.title.slice(0, 40)}`
                    );
                    continue;
                }

                const article: RawArticle = {
                    title: extracted.title.slice(0, 200),
                    url: articleUrl, // Use individual article URL, not listing page URL
                    summary: extractSummary(extracted.content),
                    publishedAt: extracted.publishedAt ? new Date(extracted.publishedAt) : null,
                    source: config.source,
                    rawContent: extracted.content.slice(0, 10000),
                };

                articles.push(article);
                console.log(`[${config.source}] ✓ Extracted: ${article.title.slice(0, 50)}...`);

                // Small delay to avoid rate limiting
                if (i < articleLinks.length - 1) {
                    await Bun.sleep(500);
                }
            } catch (error) {
                console.error(`[${config.source}] Error processing ${articleUrl}:`, error);
                continue;
            }
        }

        console.log(`[${config.source}] Successfully extracted ${articles.length} articles`);
        return articles;
    } catch (error) {
        console.error(`[${config.source}] Crawl error:`, error);
        return [];
    }
}
