import React from "react";
import ArticleCard from "./ArticleCard";
import type { Article } from "../types";

interface ArticleGridProps {
    articles: Article[];
    onSelect: (article: Article) => void;
}

export default function ArticleGrid({ articles, onSelect }: ArticleGridProps) {
    if (articles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white border-2 border-dashed border-gray-300 rounded-xl">
                <svg
                    className="w-16 h-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <p className="text-gray-500 text-lg font-medium">No articles found</p>
                <p className="text-gray-400 text-sm mt-1">
                    Try adjusting your filters or search query
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
                <ArticleCard key={article.id} article={article} onClick={() => onSelect(article)} />
            ))}
        </div>
    );
}
