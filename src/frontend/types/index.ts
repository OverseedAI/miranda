// Shared type definitions for the frontend application

export interface Article {
    id: string;
    title: string;
    url: string;
    source: string;
    summary?: string;
    isVideoWorthy: boolean;
    score: number | null;
    category: string | null;
    crawledAt: string;
    analysis?: ArticleAnalysis;
}

export interface ArticleAnalysis {
    isVideoWorthy: boolean;
    score: number;
    category: string;
    reasoning: string;
    suggestedTitle?: string;
    keyPoints: string[];
    urgency: Urgency;
}

export interface ArticleDetail extends Article {
    rawContent?: string;
    publishedAt?: string;
    analysisJson?: string;
}

export interface Status {
    scheduler: {
        isRunning: boolean;
        intervalMs: number;
    };
    config: {
        model: string;
        videoWorthyThreshold: number;
    };
}

export interface FilterState {
    categories: string[];
    urgencies: string[];
    minScore: number;
}

export interface CrawlProgressState {
    isActive: boolean;
    phase: string;
    current: number;
    total: number;
}

export type Urgency = "breaking" | "timely" | "evergreen";

export type ViewMode = "grid" | "table";

export type CrawlProgressMessage =
    | { type: "connected" }
    | { type: "started"; timestamp: string }
    | { type: "sources_crawled"; count: number }
    | { type: "filtered"; newCount: number; duplicateCount: number }
    | { type: "analyzing_article"; current: number; total: number; title: string }
    | { type: "article_saved"; score: number; isVideoWorthy: boolean }
    | {
          type: "completed";
          stats: { crawled: number; new: number; videoWorthy: number; alerted: number };
          durationSeconds: number;
      }
    | { type: "error"; message: string; phase?: string };

// API Response types
export interface ArticlesResponse {
    articles: Article[];
}

export interface ArticleDetailResponse extends ArticleDetail {}

export interface StatusResponse extends Status {}
