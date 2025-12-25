import { HNLoader } from "@langchain/community/document_loaders/web/hn";
import type { RawArticle } from "./types";
import { isAIRelated, extractSummary } from "./types";

export async function crawlHackerNews(): Promise<RawArticle[]> {
  try {
    // Load top stories from Hacker News front page
    const loader = new HNLoader("https://news.ycombinator.com/front");
    const docs = await loader.load();

    // Filter for AI-related articles and convert to RawArticle
    const articles: RawArticle[] = [];

    for (const doc of docs) {
      const content = doc.pageContent;
      const url = doc.metadata.source as string;

      // Skip if not AI-related
      if (!isAIRelated(content)) {
        continue;
      }

      // Extract title (usually first line)
      const lines = content.split("\n").filter((l) => l.trim());
      const title = lines[0] || "Untitled";

      articles.push({
        title: title.slice(0, 200), // Limit title length
        url,
        summary: extractSummary(content),
        publishedAt: null, // HN doesn't provide reliable dates in loader
        source: "hackernews",
        rawContent: content.slice(0, 10000), // Limit content size
      });
    }

    console.log(
      `[HackerNews] Crawled ${docs.length} items, ${articles.length} AI-related`
    );
    return articles;
  } catch (error) {
    console.error("[HackerNews] Crawl error:", error);
    return [];
  }
}
