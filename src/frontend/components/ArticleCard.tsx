import React from "react";

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

interface ArticleCardProps {
    article: Article;
    onClick: () => void;
}

function getScoreColor(score: number | null): string {
    if (score === null) return "#6b7280";
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#eab308";
    return "#6b7280";
}

function getRelativeTime(crawledAt: string): string {
    const now = new Date();
    const crawled = new Date(crawledAt);
    const diffMs = now.getTime() - crawled.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1d ago";
    return `${diffDays}d ago`;
}

function formatCategory(category: string | null): string {
    if (!category) return "";
    return category
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function getUrgencyColor(urgency?: "breaking" | "timely" | "evergreen"): string {
    switch (urgency) {
        case "breaking":
            return "#ef4444";
        case "timely":
            return "#f59e0b";
        case "evergreen":
            return "#10b981";
        default:
            return "#9ca3af";
    }
}

export default function ArticleCard({ article, onClick }: ArticleCardProps) {
    const scoreColor = getScoreColor(article.score);
    const relativeTime = getRelativeTime(article.crawledAt);
    const formattedCategory = formatCategory(article.category);
    const urgencyColor = getUrgencyColor(article.analysis?.urgency);
    const scorePercent = article.score ?? 0;

    return (
        <div
            className="article-card bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={onClick}
        >
            {/* Title */}
            <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-blue-600">
                {article.title}
            </h3>

            {/* Source and Time */}
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700 font-medium">
                    {article.source}
                </span>
                <span className="text-xs text-gray-500">{relativeTime}</span>
            </div>

            {/* Score Gauge */}
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600">Score</span>
                    <span className="text-xs font-semibold" style={{ color: scoreColor }}>
                        {article.score ?? "N/A"}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="h-2 rounded-full transition-all"
                        style={{
                            width: `${scorePercent}%`,
                            backgroundColor: scoreColor,
                        }}
                    />
                </div>
            </div>

            {/* Category and Urgency */}
            <div className="flex items-center gap-2 mb-3">
                {formattedCategory && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {formattedCategory}
                    </span>
                )}
                {article.analysis?.urgency && (
                    <div className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: urgencyColor }}
                        />
                        <span className="text-xs text-gray-600 capitalize">
                            {article.analysis.urgency}
                        </span>
                    </div>
                )}
            </div>

            {/* Key Points */}
            {article.analysis?.keyPoints && article.analysis.keyPoints.length > 0 && (
                <ul className="space-y-1">
                    {article.analysis.keyPoints.slice(0, 2).map((point, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span className="line-clamp-1">{point}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
