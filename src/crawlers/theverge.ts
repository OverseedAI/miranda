import { crawlWithCheerio } from "./cheerio-crawler";
import type { RawArticle } from "./types";

export async function crawlTheVerge(): Promise<RawArticle[]> {
  return crawlWithCheerio({
    url: "https://www.theverge.com/ai-artificial-intelligence",
    source: "theverge",
    selector: "article",
    filterAI: false, // Already filtered by URL category
  });
}
