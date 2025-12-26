import React from "react";

interface SourceChartProps {
    articles: Array<{ source: string }>;
}

export default function SourceChart({ articles }: SourceChartProps) {
    // Count articles by source
    const sourceCounts = new Map<string, number>();

    articles.forEach((article) => {
        const source = article.source || "Unknown";
        sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });

    // Convert to array and sort by count descending
    const sourceData = Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

    // Find max count for proportional scaling
    const maxCount = Math.max(...sourceData.map((s) => s.count), 1);

    // Color palette for sources
    const colors = [
        "bg-purple-500",
        "bg-blue-500",
        "bg-green-500",
        "bg-yellow-500",
        "bg-red-500",
        "bg-pink-500",
        "bg-indigo-500",
        "bg-teal-500",
        "bg-orange-500",
        "bg-cyan-500",
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Articles by Source</h2>
            <div className="space-y-4">
                {sourceData.map((item, index) => {
                    const widthPercent = (item.count / maxCount) * 100;
                    const color = colors[index % colors.length];

                    return (
                        <div key={item.source} className="flex items-center gap-3">
                            <div
                                className="w-48 text-sm font-medium text-gray-700 truncate"
                                title={item.source}
                            >
                                {item.source}
                            </div>
                            <div className="flex-1 relative">
                                <div
                                    className={`${color} h-8 rounded transition-all duration-300 flex items-center justify-end px-3`}
                                    style={{ width: `${widthPercent}%`, minWidth: "40px" }}
                                >
                                    <span className="text-white font-semibold text-sm">
                                        {item.count}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {sourceData.length === 0 && (
                    <div className="text-gray-500 text-center py-8">No sources to display</div>
                )}
            </div>
        </div>
    );
}
