import { crawlWithCheerio } from "./cheerio-crawler";
import type { RawArticle } from "./types";

export async function crawlDevTo(): Promise<RawArticle[]> {
  // Dev.to has a tag-based system for AI content
  return crawlWithCheerio({
    url: "https://dev.to/t/ai",
    source: "devto",
    selector: "article",
    filterAI: false, // Already filtered by tag
  });
}
