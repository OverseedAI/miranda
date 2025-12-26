import type { RawArticle } from "./types";
import { isAIRelated, extractSummary } from "./types";
import extractArticleWithLLM from "./llm-extractor";

interface CrawlerConfig {
    url: string;
    source: string;
    selector?: string;
    titleSelector?: string;
    filterAI?: boolean;
}

export async function crawlWithCheerio(config: CrawlerConfig): Promise<RawArticle[]> {
    try {
        // Fetch raw HTML
        const response = await fetch(config.url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();

        // Extract content using LLM
        const extracted = await extractArticleWithLLM(html, config.url);

        if (!extracted) {
            console.log(`[${config.source}] LLM extraction failed, skipping`);
            return [];
        }

        // Skip if filter is enabled and not AI-related
        if (config.filterAI && !isAIRelated(extracted.content)) {
            console.log(`[${config.source}] Not AI-related, skipping`);
            return [];
        }

        const article: RawArticle = {
            title: extracted.title.slice(0, 200),
            url: config.url,
            summary: extractSummary(extracted.content),
            publishedAt: extracted.publishedAt ? new Date(extracted.publishedAt) : null,
            source: config.source,
            rawContent: extracted.content.slice(0, 10000),
        };

        console.log(`[${config.source}] Extracted: ${article.title.slice(0, 50)}...`);
        return [article];
    } catch (error) {
        console.error(`[${config.source}] Crawl error:`, error);
        return [];
    }
}
