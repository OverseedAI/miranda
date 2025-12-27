import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import Sidebar, { type Page } from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import ArticlesPage from "./pages/ArticlesPage";
import CrawlerPage from "./pages/CrawlerPage";
import SettingsPage from "./pages/SettingsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import {
    useArticles,
    useArticle,
    useSearchArticles,
    useStatus,
    useTriggerCrawl,
} from "./hooks/useArticles";
import { useWebSocket } from "./hooks/useWebSocket";
import type { Article, CrawlProgressState, CrawlProgressMessage } from "./types";
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
    const [currentPage, setCurrentPage] = useState<Page>("home");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
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
                setCrawlProgress({
                    isActive: true,
                    phase: "Starting crawl...",
                    current: 0,
                    total: 0,
                });
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

    // Handler functions
    const handleArticleSelect = (article: Article) => {
        setSelectedArticleId(article.id);
    };

    const handleTriggerCrawl = () => {
        console.log("[App] Trigger crawl button clicked");
        triggerCrawlMutation.mutate(undefined, {
            onError: (error: any) => {
                // Show user-friendly error message
                if (error?.status === 409) {
                    alert("A crawl is already in progress. Please wait for it to complete.");
                } else {
                    alert(`Failed to start crawl: ${error?.message || "Unknown error"}`);
                }
            },
        });
    };

    const isLoading = articlesLoading || crawlProgress.isActive;

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

            {/* Main Content */}
            <main className="ml-64 flex-1 p-8">
                {currentPage === "home" && (
                    <HomePage
                        status={statusQuery.data}
                        statusLoading={statusQuery.isLoading}
                        statusError={statusQuery.error}
                        articles={articles}
                        articlesLoading={articlesLoading}
                        onStatusRetry={() => statusQuery.refetch()}
                    />
                )}

                {currentPage === "articles" && (
                    <ArticlesPage
                        articles={articles}
                        articlesLoading={articlesLoading}
                        articlesError={articlesError}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onArticlesRetry={() => articlesQuery.refetch()}
                        articleDetail={articleDetailQuery.data}
                        articleDetailLoading={articleDetailQuery.isLoading}
                        selectedArticleId={selectedArticleId}
                        onArticleSelect={handleArticleSelect}
                        onArticleDetailClose={() => setSelectedArticleId(null)}
                    />
                )}

                {currentPage === "crawler" && (
                    <CrawlerPage
                        crawlProgress={crawlProgress}
                        isLoading={isLoading}
                        isMutationPending={triggerCrawlMutation.isPending}
                        onTriggerCrawl={handleTriggerCrawl}
                    />
                )}

                {currentPage === "settings" && <SettingsPage />}
            </main>
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
