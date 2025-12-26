import React from "react";
import type { Article } from "../types";
import { SCORE_RANGES } from "../utils/constants";

interface ScoreChartProps {
    articles: Article[];
}

export default function ScoreChart({ articles }: ScoreChartProps) {
    // Count articles by score range
    const counts = {
        high: 0,
        medium: 0,
        low: 0,
        notWorthy: 0,
    };

    articles.forEach((article) => {
        const score = article.score;
        if (score === null || score === undefined) return;

        if (score >= SCORE_RANGES.high.min) counts.high++;
        else if (score >= SCORE_RANGES.medium.min) counts.medium++;
        else if (score >= SCORE_RANGES.low.min) counts.low++;
        else counts.notWorthy++;
    });

    const maxCount = Math.max(...Object.values(counts), 1);

    const rangeArray = [
        { ...SCORE_RANGES.high, count: counts.high },
        { ...SCORE_RANGES.medium, count: counts.medium },
        { ...SCORE_RANGES.low, count: counts.low },
        { ...SCORE_RANGES.notWorthy, count: counts.notWorthy },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Score Distribution</h2>
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
