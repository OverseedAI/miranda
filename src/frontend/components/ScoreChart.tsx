import React from "react";

interface ScoreChartProps {
    articles: Array<{ score: number | null }>;
}

export default function ScoreChart({ articles }: ScoreChartProps) {
    // Count articles by score range
    const ranges = {
        high: { label: "80-100 (High)", count: 0, color: "bg-green-500" },
        medium: { label: "60-79 (Medium)", count: 0, color: "bg-blue-500" },
        low: { label: "40-59 (Low)", count: 0, color: "bg-yellow-500" },
        notWorthy: { label: "0-39 (Not Worthy)", count: 0, color: "bg-gray-500" },
    };

    articles.forEach((article) => {
        const score = article.score;
        if (score === null || score === undefined) return;

        if (score >= 80) ranges.high.count++;
        else if (score >= 60) ranges.medium.count++;
        else if (score >= 40) ranges.low.count++;
        else ranges.notWorthy.count++;
    });

    // Find max count for proportional scaling
    const maxCount = Math.max(
        ranges.high.count,
        ranges.medium.count,
        ranges.low.count,
        ranges.notWorthy.count,
        1 // Prevent division by zero
    );

    const rangeArray = [ranges.high, ranges.medium, ranges.low, ranges.notWorthy];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Score Distribution</h2>
            <div className="space-y-4">
                {rangeArray.map((range, index) => {
                    const widthPercent = (range.count / maxCount) * 100;

                    return (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-40 text-sm font-medium text-gray-700">
                                {range.label}
                            </div>
                            <div className="flex-1 relative">
                                <div
                                    className={`${range.color} h-8 rounded transition-all duration-300 flex items-center justify-end px-3`}
                                    style={{
                                        width: `${widthPercent}%`,
                                        minWidth: range.count > 0 ? "40px" : "0",
                                    }}
                                >
                                    {range.count > 0 && (
                                        <span className="text-white font-semibold text-sm">
                                            {range.count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
