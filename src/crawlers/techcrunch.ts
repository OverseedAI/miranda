import { crawlWithCheerio } from "./cheerio-crawler";
import type { RawArticle } from "./types";

export async function crawlTechCrunch(): Promise<RawArticle[]> {
    return crawlWithCheerio({
        url: "https://techcrunch.com/category/artificial-intelligence/",
        source: "techcrunch",
        selector: "article",
        filterAI: false, // Already filtered by URL category
    });
}
