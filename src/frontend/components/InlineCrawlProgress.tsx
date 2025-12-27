import React from "react";

interface InlineCrawlProgressProps {
    phase: string;
    current: number;
    total: number;
    isActive: boolean;
}

export default function InlineCrawlProgress({
    phase,
    current,
    total,
    isActive,
}: InlineCrawlProgressProps) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div
            className={`bg-white p-6 rounded-lg shadow border-2 ${
                isActive ? "border-blue-500" : "border-green-500"
            }`}
        >
            <div className="flex items-center gap-3 mb-3">
                {isActive && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
                <h3 className="text-lg font-semibold text-gray-800">
                    {isActive ? "Crawl In Progress" : "Last Crawl Result"}
                </h3>
            </div>

            {/* Phase text */}
            <div className="mb-4 text-gray-700">{phase}</div>

            {/* Progress Bar */}
            {total > 0 && (
                <>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden mb-2">
                        <div
                            className={`h-full transition-all duration-300 ease-out flex items-center justify-center text-xs text-white font-medium ${
                                isActive ? "bg-blue-600" : "bg-green-600"
                            }`}
                            style={{ width: `${percentage}%` }}
                        >
                            {percentage > 10 && `${percentage}%`}
                        </div>
                    </div>

                    {/* Counter */}
                    <div className="text-sm text-gray-600 text-right">
                        {current} / {total} articles analyzed
                    </div>
                </>
            )}
        </div>
    );
}
