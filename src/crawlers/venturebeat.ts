import { crawlWithCheerio } from "./cheerio-crawler";
import type { RawArticle } from "./types";

export async function crawlVentureBeat(): Promise<RawArticle[]> {
    return crawlWithCheerio({
        url: "https://venturebeat.com/category/ai/",
        source: "venturebeat",
        selector: "article",
        filterAI: false, // Already filtered by URL category
    });
}
