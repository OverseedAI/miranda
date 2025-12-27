import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { config } from "../config";

// Schema for structured output
const ArticleExtractionSchema = z.object({
    title: z.string().describe("The article's headline/title"),
    content: z.string().describe("The main article body text, cleaned of ads/navigation"),
    publishedAt: z
        .string()
        .nullable()
        .describe("Publication date in ISO format if found, null otherwise"),
    author: z.string().nullable().describe("Author name if found, null otherwise"),
});

type ExtractedArticle = z.infer<typeof ArticleExtractionSchema>;

/**
 * Removes script, style, noscript, and iframe tags and their content from HTML
 */
function stripJunkTags(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
}

/**
 * Truncates HTML to a maximum character length
 */
function truncateHTML(html: string, maxLength: number): string {
    if (html.length <= maxLength) {
        return html;
    }
    return html.substring(0, maxLength) + "... [truncated]";
}

/**
 * Extract article content from HTML using an LLM
 */
export default async function extractArticleWithLLM(
    html: string,
    url: string
): Promise<ExtractedArticle | null> {
    try {
        // Pre-process HTML: strip junk tags and truncate
        const cleanedHTML = stripJunkTags(html);
        const truncatedHTML = truncateHTML(cleanedHTML, 50000);

        // Initialize the model with structured output
        const model = new ChatAnthropic({
            apiKey: config.anthropicApiKey,
            model: "claude-haiku-4-5-20251001",
            temperature: 0,
        });

        const structuredLLM = model.withStructuredOutput(ArticleExtractionSchema);

        // Build the extraction prompt
        const prompt = `You are an article content extractor. Given raw HTML from a webpage, extract:
1. The article title/headline
2. The main article content (the actual article text, not navigation/ads/comments)
3. The publication date (if visible)
4. The author name (if visible)

URL: ${url}

HTML:
${truncatedHTML}

Extract only the main article content. Ignore:
- Navigation menus
- Advertisements
- Cookie banners
- Comment sections
- Related article links
- Social media widgets
- Footer content`;

        // Invoke the LLM
        const result = await structuredLLM.invoke(prompt);

        return result;
    } catch (error) {
        console.error("[LLM Extractor] Error extracting article:", error);
        return null;
    }
}
