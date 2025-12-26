import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import SearchBar from "./components/SearchBar";
import StatusBar from "./components/StatusBar";
import ScoreChart from "./components/ScoreChart";
import SourceChart from "./components/SourceChart";
import Filters from "./components/Filters";
import ViewToggle from "./components/ViewToggle";
import ArticleGrid from "./components/ArticleGrid";
import ArticleTable from "./components/ArticleTable";
import ArticleDetail from "./components/ArticleDetail";
import CrawlProgress from "./components/CrawlProgress";

// Type definitions per contract
interface Article {
    id: string;
    title: string;
    url: string;
    source: string;
    summary?: string;
    isVideoWorthy: boolean;
    score: number | null;
    category: string | null;
    crawledAt: string;
}

interface ArticleDetail extends Article {
    rawContent?: string;
    publishedAt?: string;
    analysisJson?: string;
    analysis?: {
        isVideoWorthy: boolean;
        score: number;
        category: string;
        reasoning: string;
        suggestedTitle?: string;
        keyPoints: string[];
        urgency: "breaking" | "timely" | "evergreen";
    };
}

interface Status {
    scheduler: { isRunning: boolean; intervalMs: number };
    config: { model: string; videoWorthyThreshold: number };
}

interface FilterState {
    categories: string[];
    urgencies: string[];
    minScore: number;
}

interface CrawlProgressState {
    isActive: boolean;
    phase: string;
    current: number;
    total: number;
}

type CrawlProgressMessage =
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

function App() {
    // State management per contract
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(null);
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [filters, setFilters] = useState<FilterState>({
        categories: [],
        urgencies: [],
        minScore: 0,
    });
    const [crawlProgress, setCrawlProgress] = useState<CrawlProgressState>({
        isActive: false,
        phase: "Idle",
        current: 0,
        total: 0,
    });
    const wsRef = useRef<WebSocket | null>(null);

    // API Functions
    const fetchArticles = async (videoWorthy?: boolean) => {
        try {
            setLoading(true);
            const url =
                videoWorthy !== undefined
                    ? `/api/articles?videoWorthy=${videoWorthy}&limit=50`
                    : "/api/articles?limit=50";
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch articles");
            const data = await response.json();
            setArticles(data.articles || []);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchArticleDetail = async (id: string) => {
        try {
            const response = await fetch(`/api/articles/${id}`);
            if (!response.ok) throw new Error("Failed to fetch article detail");
            const data = await response.json();
            setSelectedArticle(data);
        } catch (error) {
            console.error("Error fetching article detail:", error);
        }
    };

    const searchArticles = async (query: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`);
            if (!response.ok) throw new Error("Failed to search articles");
            const data = await response.json();
            setArticles(data.articles || []);
        } catch (error) {
            console.error("Error searching articles:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const response = await fetch("/api/status");
            if (!response.ok) throw new Error("Failed to fetch status");
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error("Error fetching status:", error);
        }
    };

    const triggerCrawl = async () => {
        try {
            const response = await fetch("/api/crawl", { method: "POST" });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to trigger crawl");
            }
            // Don't wait for completion - WebSocket will provide updates
        } catch (error) {
            console.error("Error triggering crawl:", error);
            setLoading(false);
            setCrawlProgress({
                isActive: false,
                phase: error instanceof Error ? `Error: ${error.message}` : "Error occurred",
                current: 0,
                total: 0,
            });
        }
    };

    // WebSocket message handler
    const handleProgressMessage = (msg: CrawlProgressMessage) => {
        switch (msg.type) {
            case "connected":
                console.log("[WS] Connected to server");
                break;

            case "started":
                setCrawlProgress({ isActive: true, phase: "Starting crawl...", current: 0, total: 0 });
                setLoading(true);
                break;

            case "sources_crawled":
                setCrawlProgress((prev) => ({
                    ...prev,
                    phase: `Crawled ${msg.count} articles from sources`,
                }));
                break;

            case "filtered":
                setCrawlProgress((prev) => ({
                    ...prev,
                    phase: `Found ${msg.newCount} new articles (${msg.duplicateCount} duplicates)`,
                }));
                break;

            case "analyzing_article":
                setCrawlProgress({
                    isActive: true,
                    phase: `Analyzing: ${msg.title.slice(0, 50)}...`,
                    current: msg.current,
                    total: msg.total,
                });
                break;

            case "article_saved":
                // Progress already updated by analyzing_article
                break;

            case "completed":
                setCrawlProgress({
                    isActive: false,
                    phase: `Completed: ${msg.stats.videoWorthy} video-worthy found in ${msg.durationSeconds.toFixed(1)}s`,
                    current: msg.stats.new,
                    total: msg.stats.new,
                });
                setLoading(false);

                // Refresh data
                fetchArticles();
                fetchStatus();

                // Hide progress after 3 seconds
                setTimeout(() => {
                    setCrawlProgress({ isActive: false, phase: "Idle", current: 0, total: 0 });
                }, 3000);
                break;

            case "error":
                console.error("[Crawl Error]", msg.message);
                setCrawlProgress({
                    isActive: false,
                    phase: `Error: ${msg.message}`,
                    current: 0,
                    total: 0,
                });
                setLoading(false);
                break;
        }
    };

    // useEffect: Fetch articles and status on mount
    useEffect(() => {
        fetchArticles();
        fetchStatus();
    }, []);

    // useEffect: WebSocket connection
    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = () => {
            console.log("[WS] Connected");
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleProgressMessage(message);
            } catch (error) {
                console.error("[WS] Failed to parse message:", error);
            }
        };

        ws.onerror = (error) => {
            console.error("[WS] Error:", error);
        };

        ws.onclose = () => {
            console.log("[WS] Disconnected");
        };

        wsRef.current = ws;

        return () => {
            ws.close();
        };
    }, []);

    // Handle search
    useEffect(() => {
        if (searchQuery) {
            searchArticles(searchQuery);
        } else {
            fetchArticles();
        }
    }, [searchQuery]);

    // Filtering Logic
    const filteredArticles = articles.filter((article) => {
        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(article.category || "")) {
            return false;
        }

        // Urgency filter
        if (filters.urgencies.length > 0 && article.analysis) {
            const urgency =
                typeof article.analysis === "string"
                    ? JSON.parse(article.analysis).urgency
                    : article.analysis.urgency;
            if (!filters.urgencies.includes(urgency)) {
                return false;
            }
        }

        // Min score filter
        if (article.score !== null && article.score < filters.minScore) {
            return false;
        }

        return true;
    });

    // Handle article selection
    const handleArticleSelect = async (article: Article) => {
        await fetchArticleDetail(article.id);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header - inline per contract */}
            <header className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-gray-900">Article Analysis Dashboard</h1>
                    <button
                        onClick={triggerCrawl}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? "Crawling..." : "Trigger Crawl"}
                    </button>
                </div>
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={() => searchArticles(searchQuery)}
                    loading={loading}
                />
            </header>

            {/* Status Bar */}
            <StatusBar status={status} articleCount={articles.length} />

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4 my-6">
                <ScoreChart articles={filteredArticles} />
                <SourceChart articles={filteredArticles} />
            </div>

            {/* Filters and View Toggle */}
            <div className="flex justify-between items-center mb-4">
                <Filters filters={filters} onChange={setFilters} />
                <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Loading State */}
            {loading && <div className="text-center py-8 text-gray-600">Loading articles...</div>}

            {/* Articles View */}
            {!loading && (
                <>
                    {viewMode === "grid" ? (
                        <ArticleGrid articles={filteredArticles} onSelect={handleArticleSelect} />
                    ) : (
                        <ArticleTable articles={filteredArticles} onSelect={handleArticleSelect} />
                    )}
                </>
            )}

            {/* Article Detail Modal */}
            {selectedArticle && (
                <ArticleDetail article={selectedArticle} onClose={() => setSelectedArticle(null)} />
            )}

            {/* Crawl Progress Indicator */}
            {crawlProgress.isActive && (
                <CrawlProgress
                    phase={crawlProgress.phase}
                    current={crawlProgress.current}
                    total={crawlProgress.total}
                    isActive={crawlProgress.isActive}
                />
            )}
        </div>
    );
}

// Render at end per contract
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
