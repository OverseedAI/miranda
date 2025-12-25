import { crawlWithCheerio } from "../cheerio-crawler";
import type { RawArticle } from "../types";

export async function crawlOpenAIBlog(): Promise<RawArticle[]> {
  return crawlWithCheerio({
    url: "https://openai.com/blog",
    source: "openai-blog",
    selector: "article, [class*='blog'], [class*='post']",
    filterAI: false, // OpenAI blog is all AI
  });
}
