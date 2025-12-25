import { crawlWithCheerio } from "../cheerio-crawler";
import type { RawArticle } from "../types";

export async function crawlAnthropicBlog(): Promise<RawArticle[]> {
  return crawlWithCheerio({
    url: "https://www.anthropic.com/news",
    source: "anthropic-blog",
    selector: "article, [class*='post'], [class*='news']",
    filterAI: false, // Anthropic content is all AI
  });
}
