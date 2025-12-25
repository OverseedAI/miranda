export interface RawArticle {
  title: string;
  url: string;
  summary: string;
  publishedAt: Date | null;
  source: string;
  rawContent: string;
}

export interface CrawlResult {
  articles: RawArticle[];
  source: string;
  crawledAt: Date;
  errors: string[];
}

export type CrawlerFunction = () => Promise<RawArticle[]>;

// AI-related keywords for filtering
export const AI_KEYWORDS = [
  "ai",
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "llm",
  "large language model",
  "gpt",
  "claude",
  "openai",
  "anthropic",
  "google ai",
  "gemini",
  "chatgpt",
  "neural network",
  "transformer",
  "nlp",
  "natural language",
  "computer vision",
  "generative ai",
  "gen ai",
  "diffusion",
  "stable diffusion",
  "midjourney",
  "copilot",
  "github copilot",
  "cursor",
  "ai agent",
  "langchain",
  "vector database",
  "embedding",
  "rag",
  "retrieval",
  "fine-tuning",
  "fine tuning",
  "prompt engineering",
  "hugging face",
  "huggingface",
];

export function isAIRelated(text: string): boolean {
  const lowerText = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

export function extractSummary(content: string, maxLength = 500): string {
  // Get first paragraph or first N characters
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  // Try to break at a sentence boundary
  const truncated = cleaned.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  if (lastPeriod > maxLength * 0.5) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated + "...";
}
