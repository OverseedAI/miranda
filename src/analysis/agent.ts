import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { RawArticle } from "../crawlers/types";
import {
  VideoWorthinessSchema,
  type VideoWorthiness,
} from "./schemas";
import { VIDEO_WORTHINESS_SYSTEM_PROMPT } from "./prompts";
import { config } from "../config";
import { articlesRepo } from "../db/repositories/articles";

// Initialize Claude model with structured output
const model = new ChatAnthropic({
  model: config.model,
  anthropicApiKey: config.anthropicApiKey,
});

const modelWithStructuredOutput = model.withStructuredOutput(
  VideoWorthinessSchema,
  {
    name: "video_worthiness_analysis",
  }
);

export async function analyzeArticle(
  article: RawArticle
): Promise<VideoWorthiness> {
  // Check for similar recent coverage
  const similarRecent = articlesRepo.findSimilarRecent(article.title, 7, 3);
  const recentCoverageNote =
    similarRecent.length > 0
      ? `\n\nNote: Similar stories were recently covered:\n${similarRecent.map((a) => `- ${a.title} (${a.source})`).join("\n")}`
      : "";

  const userMessage = `Analyze this article for video-worthiness:

Title: ${article.title}
Source: ${article.source}
Published: ${article.publishedAt?.toISOString() || "Unknown"}
URL: ${article.url}

Content:
${article.summary || article.rawContent.slice(0, 4000)}${recentCoverageNote}`;

  try {
    const result = await modelWithStructuredOutput.invoke([
      new SystemMessage(VIDEO_WORTHINESS_SYSTEM_PROMPT),
      new HumanMessage(userMessage),
    ]);

    return result;
  } catch (error) {
    console.error(`[Analysis] Error analyzing article: ${article.title}`, error);
    // Return a default "not worthy" analysis on error
    return {
      isVideoWorthy: false,
      score: 0,
      category: "not_video_worthy",
      reasoning: "Analysis failed due to an error",
      keyPoints: [],
      urgency: "evergreen",
    };
  }
}

export async function analyzeArticles(
  articles: RawArticle[]
): Promise<Map<string, VideoWorthiness>> {
  const results = new Map<string, VideoWorthiness>();

  // Process sequentially to avoid rate limits
  for (const article of articles) {
    console.log(`[Analysis] Analyzing: ${article.title.slice(0, 50)}...`);
    const analysis = await analyzeArticle(article);
    results.set(article.url, analysis);

    // Small delay between requests
    await Bun.sleep(500);
  }

  return results;
}
