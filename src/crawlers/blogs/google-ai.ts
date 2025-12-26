import { crawlWithCheerio } from "../cheerio-crawler";
import type { RawArticle } from "../types";

export async function crawlGoogleAIBlog(): Promise<RawArticle[]> {
    return crawlWithCheerio({
        url: "https://blog.google/technology/ai/",
        source: "google-ai-blog",
        selector: "article",
        filterAI: false, // Google AI blog is all AI
    });
}
