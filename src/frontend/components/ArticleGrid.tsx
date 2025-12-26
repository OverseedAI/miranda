import React from "react";
import ArticleCard from "./ArticleCard";

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
    analysis?: {
        urgency?: "breaking" | "timely" | "evergreen";
        keyPoints?: string[];
    };
}

interface ArticleGridProps {
    articles: Article[];
    onSelect: (article: Article) => void;
}

export default function ArticleGrid({ articles, onSelect }: ArticleGridProps) {
    if (articles.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-lg">No articles found</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
                <ArticleCard key={article.id} article={article} onClick={() => onSelect(article)} />
            ))}
        </div>
    );
}
