import React from "react";

interface StatusBarProps {
    status: {
        scheduler: { isRunning: boolean; intervalMs: number };
        config: { model: string; videoWorthyThreshold: number };
    } | null;
    articleCount: number;
    lastCrawl?: string;
}

export default function StatusBar({ status, articleCount, lastCrawl }: StatusBarProps) {
    const intervalHours = status
        ? (status.scheduler.intervalMs / (1000 * 60 * 60)).toFixed(1)
        : "0";

    return (
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-6 text-xs text-gray-600">
                {/* Scheduler Status */}
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            status?.scheduler.isRunning ? "bg-green-500" : "bg-gray-400"
                        }`}
                    />
                    <span className="font-medium">
                        {status?.scheduler.isRunning ? "Running" : "Idle"}
                    </span>
                </div>

                {/* Crawl Interval */}
                <div>
                    <span className="text-gray-500">Interval:</span>{" "}
                    <span className="font-medium">{intervalHours}h</span>
                </div>

                {/* Model */}
                <div>
                    <span className="text-gray-500">Model:</span>{" "}
                    <span className="font-medium">{status?.config.model || "N/A"}</span>
                </div>

                {/* Threshold */}
                <div>
                    <span className="text-gray-500">Threshold:</span>{" "}
                    <span className="font-medium">
                        {status?.config.videoWorthyThreshold ?? "N/A"}
                    </span>
                </div>

                {/* Article Count */}
                <div>
                    <span className="text-gray-500">Articles:</span>{" "}
                    <span className="font-medium">{articleCount}</span>
                </div>

                {/* Last Crawl */}
                {lastCrawl && (
                    <div>
                        <span className="text-gray-500">Last Crawl:</span>{" "}
                        <span className="font-medium">{lastCrawl}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
