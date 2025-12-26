import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorMessage from "./components/ErrorMessage";
import {
    ArticleGridSkeleton,
    ArticleTableSkeleton,
    ChartSkeleton,
    StatusBarSkeleton,
} from "./components/LoadingSkeleton";
import {
    useArticles,
    useArticle,
    useSearchArticles,
    useStatus,
    useTriggerCrawl,
} from "./hooks/useArticles";
import { useWebSocket } from "./hooks/useWebSocket";
import type {
    Article,
    FilterState,
    CrawlProgressState,
    CrawlProgressMessage,
    ViewMode,
} from "./types";
import { DEFAULT_ARTICLE_LIMIT } from "./utils/constants";

// Create a QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

function AppContent() {
    const queryClient = useQueryClient();

    // Local UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
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

    // React Query hooks
    const articlesQuery = useArticles({ limit: DEFAULT_ARTICLE_LIMIT });
    const searchQuery_ = useSearchArticles(searchQuery, DEFAULT_ARTICLE_LIMIT);
    const statusQuery = useStatus();
    const articleDetailQuery = useArticle(selectedArticleId);
    const triggerCrawlMutation = useTriggerCrawl();

    // Determine which data to use based on search state
    const {
        data: articles = [],
        isLoading: articlesLoading,
        error: articlesError,
    } = searchQuery ? searchQuery_ : articlesQuery;

    // WebSocket message handler
    const handleProgressMessage = (msg: CrawlProgressMessage) => {
        switch (msg.type) {
            case "connected":
                console.log("[WS] Connected to server");
                break;

            case "started":
                setCrawlProgress({ isActive: true, phase: "Starting crawl...", current: 0, total: 0 });
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
                break;

            case "completed":
                setCrawlProgress({
                    isActive: false,
                    phase: `Completed: ${msg.stats.videoWorthy} video-worthy found in ${msg.durationSeconds.toFixed(1)}s`,
                    current: msg.stats.new,
                    total: msg.stats.new,
                });

                // Invalidate queries to refresh data
                queryClient.invalidateQueries({ queryKey: ["articles"] });
                queryClient.invalidateQueries({ queryKey: ["status"] });

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
                break;
        }
    };

    // WebSocket connection
    useWebSocket({
        onMessage: handleProgressMessage,
    });

    // Memoized filtered articles
    const filteredArticles = useMemo(() => {
        return articles.filter((article) => {
            // Category filter
            if (filters.categories.length > 0 && !filters.categories.includes(article.category || "")) {
                return false;
            }

            // Urgency filter
            if (filters.urgencies.length > 0 && article.analysis) {
                if (!filters.urgencies.includes(article.analysis.urgency)) {
                    return false;
                }
            }

            // Min score filter
            if (article.score !== null && article.score < filters.minScore) {
                return false;
            }

            return true;
        });
    }, [articles, filters]);

    // Handler functions
    const handleArticleSelect = (article: Article) => {
        setSelectedArticleId(article.id);
    };

    const handleTriggerCrawl = () => {
        triggerCrawlMutation.mutate();
    };

    const isLoading = articlesLoading || crawlProgress.isActive;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <header className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h1 className="text-4xl font-bold text-gray-900">
                        Article Analysis Dashboard
                    </h1>
                    <button
                        onClick={handleTriggerCrawl}
                        disabled={isLoading || triggerCrawlMutation.isPending}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
                    >
                        {isLoading || triggerCrawlMutation.isPending ? "Crawling..." : "Trigger Crawl"}
                    </button>
                </div>
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={() => {}}
                    loading={articlesLoading}
                />
            </header>

            {/* Status Bar */}
            {statusQuery.isLoading ? (
                <StatusBarSkeleton />
            ) : statusQuery.error ? (
                <ErrorMessage
                    message="Failed to load status"
                    onRetry={() => statusQuery.refetch()}
                />
            ) : (
                <StatusBar status={statusQuery.data!} articleCount={articles.length} />
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
                {articlesLoading ? (
                    <>
                        <ChartSkeleton />
                        <ChartSkeleton />
                    </>
                ) : (
                    <>
                        <ScoreChart articles={filteredArticles} />
                        <SourceChart articles={filteredArticles} />
                    </>
                )}
            </div>

            {/* Filters and View Toggle */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
                <Filters filters={filters} onChange={setFilters} />
                <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Error State */}
            {articlesError && (
                <ErrorMessage
                    message={articlesError instanceof Error ? articlesError.message : "Failed to load articles"}
                    onRetry={() => articlesQuery.refetch()}
                />
            )}

            {/* Articles View */}
            {articlesLoading ? (
                viewMode === "grid" ? (
                    <ArticleGridSkeleton count={9} />
                ) : (
                    <ArticleTableSkeleton rows={10} />
                )
            ) : (
                <>
                    {viewMode === "grid" ? (
                        <ArticleGrid articles={filteredArticles} onSelect={handleArticleSelect} />
                    ) : (
                        <ArticleTable articles={filteredArticles} onSelect={handleArticleSelect} />
                    )}
                </>
            )}

            {/* Article Detail Modal */}
            {selectedArticleId && articleDetailQuery.data && (
                <ArticleDetail
                    article={articleDetailQuery.data}
                    onClose={() => setSelectedArticleId(null)}
                    isLoading={articleDetailQuery.isLoading}
                />
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

function App() {
    return (
        <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <AppContent />
            </QueryClientProvider>
        </ErrorBoundary>
    );
}

// Render at end per contract
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
