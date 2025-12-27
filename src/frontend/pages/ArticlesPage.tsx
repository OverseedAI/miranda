import React, { useState, useMemo } from "react";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import ViewToggle from "../components/ViewToggle";
import ArticleGrid from "../components/ArticleGrid";
import ArticleTable from "../components/ArticleTable";
import ArticleDetail from "../components/ArticleDetail";
import ErrorMessage from "../components/ErrorMessage";
import { ArticleGridSkeleton, ArticleTableSkeleton } from "../components/LoadingSkeleton";
import type { Article, ArticleDetail as ArticleDetailType, FilterState, ViewMode } from "../types";

interface ArticlesPageProps {
    articles: Article[];
    articlesLoading: boolean;
    articlesError: Error | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onArticlesRetry: () => void;
    articleDetail: ArticleDetailType | undefined;
    articleDetailLoading: boolean;
    selectedArticleId: string | null;
    onArticleSelect: (article: Article) => void;
    onArticleDetailClose: () => void;
}

export default function ArticlesPage({
    articles,
    articlesLoading,
    articlesError,
    searchQuery,
    onSearchChange,
    onArticlesRetry,
    articleDetail,
    articleDetailLoading,
    selectedArticleId,
    onArticleSelect,
    onArticleDetailClose,
}: ArticlesPageProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [filters, setFilters] = useState<FilterState>({
        categories: [],
        urgencies: [],
        minScore: 0,
    });

    // Memoized filtered articles
    const filteredArticles = useMemo(() => {
        return articles.filter((article) => {
            // Category filter
            if (
                filters.categories.length > 0 &&
                !filters.categories.includes(article.category || "")
            ) {
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

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Articles</h1>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                onSearch={() => {}}
                loading={articlesLoading}
            />

            {/* Filters and View Toggle */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 my-6">
                <Filters filters={filters} onChange={setFilters} />
                <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Error State */}
            {articlesError && (
                <ErrorMessage
                    message={
                        articlesError instanceof Error
                            ? articlesError.message
                            : "Failed to load articles"
                    }
                    onRetry={onArticlesRetry}
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
                        <ArticleGrid articles={filteredArticles} onSelect={onArticleSelect} />
                    ) : (
                        <ArticleTable articles={filteredArticles} onSelect={onArticleSelect} />
                    )}
                </>
            )}

            {/* Article Detail Modal */}
            {selectedArticleId && articleDetail && (
                <ArticleDetail
                    article={articleDetail}
                    onClose={onArticleDetailClose}
                    isLoading={articleDetailLoading}
                />
            )}
        </div>
    );
}
