import React from "react";
import type { Article } from "../types";
import { getScoreColor, getRelativeTime, formatCategory, getUrgencyColor } from "../utils/formatting";

interface ArticleCardProps {
    article: Article;
    onClick: () => void;
}

export default function ArticleCard({ article, onClick }: ArticleCardProps) {
    const scoreColor = getScoreColor(article.score);
    const relativeTime = getRelativeTime(article.crawledAt);
    const formattedCategory = formatCategory(article.category);
    const urgencyColor = getUrgencyColor(article.analysis?.urgency);
    const scorePercent = article.score ?? 0;

    return (
        <div
            className="article-card bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-xl hover:border-blue-200 transition-all duration-200"
            onClick={onClick}
        >
            {/* Title */}
            <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-900 hover:text-blue-600 transition-colors">
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
