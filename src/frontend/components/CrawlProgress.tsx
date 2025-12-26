import React from "react";

interface CrawlProgressProps {
    phase: string;
    current: number;
    total: number;
    isActive: boolean;
}

export default function CrawlProgress({ phase, current, total, isActive }: CrawlProgressProps) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div
            className={`fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border-2 ${
                isActive ? "border-blue-500" : "border-green-500"
            } min-w-[300px] max-w-[400px] z-50`}
        >
            {/* Phase text */}
            <div className="mb-2 font-medium text-gray-700 text-sm">{phase}</div>

            {/* Progress Bar */}
            {total > 0 && (
                <>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                        <div
                            className={`h-full transition-all duration-300 ease-out ${
                                isActive ? "bg-blue-600" : "bg-green-600"
                            }`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    {/* Counter */}
                    <div className="text-sm text-gray-600 text-right">
                        {current} / {total} ({percentage}%)
                    </div>
                </>
            )}

            {/* Spinner for phases without progress */}
            {total === 0 && isActive && (
                <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            )}
        </div>
    );
}
