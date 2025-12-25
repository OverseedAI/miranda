import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import type { RawArticle } from "./types";
import { isAIRelated, extractSummary } from "./types";

interface CrawlerConfig {
  url: string;
  source: string;
  selector?: string;
  titleSelector?: string;
  filterAI?: boolean;
}

export async function crawlWithCheerio(
  config: CrawlerConfig
): Promise<RawArticle[]> {
  try {
    // Create loader without selector option (it's typed strictly)
    const loader = new CheerioWebBaseLoader(config.url);

    const docs = await loader.load();
    const articles: RawArticle[] = [];

    for (const doc of docs) {
      const content = doc.pageContent;
      const url = (doc.metadata.source as string) || config.url;

      // Skip if filter is enabled and not AI-related
      if (config.filterAI && !isAIRelated(content)) {
        continue;
      }

      // Extract title (usually first significant line)
      const lines = content
        .split("\n")
        .filter((l) => l.trim().length > 10)
        .map((l) => l.trim());
      const title = lines[0] || "Untitled";

      articles.push({
        title: title.slice(0, 200),
        url,
        summary: extractSummary(content),
        publishedAt: null,
        source: config.source,
        rawContent: content.slice(0, 10000),
      });
    }

    console.log(`[${config.source}] Crawled ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error(`[${config.source}] Crawl error:`, error);
    return [];
  }
}
