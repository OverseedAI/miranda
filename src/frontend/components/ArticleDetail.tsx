import React, { useEffect } from "react";

interface ArticleDetailProps {
    article: {
        id: string;
        title: string;
        url: string;
        source: string;
        summary?: string;
        rawContent?: string;
        publishedAt?: string;
        crawledAt: string;
        isVideoWorthy: boolean;
        score: number | null;
        category: string | null;
        analysis?: {
            isVideoWorthy: boolean;
            score: number;
            category: string;
            reasoning: string;
            suggestedTitle?: string;
            keyPoints: string[];
            urgency: "breaking" | "timely" | "evergreen";
        };
    };
    onClose: () => void;
}

export default function ArticleDetail({ article, onClose }: ArticleDetailProps) {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const score = article.analysis?.score ?? article.score ?? 0;
    const category = article.analysis?.category ?? article.category ?? "Uncategorized";
    const urgency = article.analysis?.urgency ?? "evergreen";

    // Score color based on value
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-600";
        if (score >= 60) return "text-blue-600";
        if (score >= 40) return "text-yellow-600";
        return "text-gray-600";
    };

    // Urgency badge color
    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case "breaking":
                return "bg-red-500 text-white";
            case "timely":
                return "bg-orange-500 text-white";
            case "evergreen":
                return "bg-green-500 text-white";
            default:
                return "bg-gray-500 text-white";
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Unknown date";
        try {
            return new Date(dateString).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div
            className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl m-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <span className="text-gray-700 text-xl font-bold">&times;</span>
                </button>

                {/* Content */}
                <div className="p-8">
                    {/* Title */}
                    <h1 className="text-4xl font-bold text-gray-900 mb-4 pr-12">{article.title}</h1>

                    {/* Meta info row */}
                    <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
                        <span className="font-semibold text-gray-700">{article.source}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">{formatDate(article.publishedAt)}</span>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getUrgencyColor(
                                urgency
                            )}`}
                        >
                            {urgency}
                        </span>
                    </div>

                    {/* Score and Category */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Score:</span>
                            <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
                                {score}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 font-medium">Category:</span>
                            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold">
                                {category}
                            </span>
                        </div>
                    </div>

                    {/* Reasoning */}
                    {article.analysis?.reasoning && (
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                Analysis Reasoning
                            </h2>
                            <p className="text-gray-700 leading-relaxed">
                                {article.analysis.reasoning}
                            </p>
                        </div>
                    )}

                    {/* Suggested Video Title */}
                    {article.analysis?.suggestedTitle && (
                        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <h2 className="text-lg font-bold text-gray-800 mb-1">
                                Suggested Video Title
                            </h2>
                            <p className="text-gray-900 font-medium">
                                {article.analysis.suggestedTitle}
                            </p>
                        </div>
                    )}

                    {/* Key Points */}
                    {article.analysis?.keyPoints && article.analysis.keyPoints.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-3">Key Points</h2>
                            <ul className="list-disc list-inside space-y-2">
                                {article.analysis.keyPoints.map((point, index) => (
                                    <li key={index} className="text-gray-700 leading-relaxed">
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Summary/Content */}
                    {(article.summary || article.rawContent) && (
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-3">
                                {article.summary ? "Summary" : "Content"}
                            </h2>
                            <div className="prose max-w-none text-gray-700 leading-relaxed">
                                {article.summary || article.rawContent}
                            </div>
                        </div>
                    )}

                    {/* Read Original Button */}
                    <div className="flex justify-start">
                        <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Read Original Article
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
