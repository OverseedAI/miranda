import React, { useState } from "react";

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

interface ArticleTableProps {
    articles: Article[];
    onSelect: (article: Article) => void;
}

type SortColumn = "title" | "source" | "score" | "category" | "urgency" | "crawledAt";
type SortDirection = "asc" | "desc";

function getScoreBadgeClass(score: number | null): string {
    if (score === null) return "bg-gray-100 text-gray-700";
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-blue-100 text-blue-700";
    if (score >= 40) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
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
    if (!category) return "-";
    return category
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export default function ArticleTable({ articles, onSelect }: ArticleTableProps) {
    const [sortColumn, setSortColumn] = useState<SortColumn>("crawledAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const sortedArticles = [...articles].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortColumn) {
            case "title":
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                break;
            case "source":
                aVal = a.source.toLowerCase();
                bVal = b.source.toLowerCase();
                break;
            case "score":
                aVal = a.score ?? -1;
                bVal = b.score ?? -1;
                break;
            case "category":
                aVal = a.category?.toLowerCase() ?? "";
                bVal = b.category?.toLowerCase() ?? "";
                break;
            case "urgency":
                const urgencyOrder = { breaking: 3, timely: 2, evergreen: 1 };
                aVal = urgencyOrder[a.analysis?.urgency as keyof typeof urgencyOrder] ?? 0;
                bVal = urgencyOrder[b.analysis?.urgency as keyof typeof urgencyOrder] ?? 0;
                break;
            case "crawledAt":
                aVal = new Date(a.crawledAt).getTime();
                bVal = new Date(b.crawledAt).getTime();
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) {
            return <span className="text-gray-400 ml-1">⇅</span>;
        }
        return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
    };

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("title")}
                        >
                            Title <SortIcon column="title" />
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("source")}
                        >
                            Source <SortIcon column="source" />
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("score")}
                        >
                            Score <SortIcon column="score" />
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("category")}
                        >
                            Category <SortIcon column="category" />
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("urgency")}
                        >
                            Urgency <SortIcon column="urgency" />
                        </th>
                        <th
                            className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort("crawledAt")}
                        >
                            Crawled <SortIcon column="crawledAt" />
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sortedArticles.map((article, idx) => (
                        <tr
                            key={article.id}
                            className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                            onClick={() => onSelect(article)}
                        >
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate max-w-md">
                                    {article.title}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">{article.source}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreBadgeClass(
                                        article.score
                                    )}`}
                                >
                                    {article.score ?? "N/A"}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700">
                                    {formatCategory(article.category)}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-700 capitalize">
                                    {article.analysis?.urgency ?? "-"}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">
                                    {getRelativeTime(article.crawledAt)}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
