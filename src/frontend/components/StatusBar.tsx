import React from "react";
import type { Status } from "../types";

interface StatusBarProps {
    status: Status;
    articleCount: number;
    lastCrawl?: string;
}

export default function StatusBar({ status, articleCount, lastCrawl }: StatusBarProps) {
    const intervalHours = (status.scheduler.intervalMs / (1000 * 60 * 60)).toFixed(1);

    return (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl px-6 py-3 shadow-sm mb-8">
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                {/* Scheduler Status */}
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            status.scheduler.isRunning ? "bg-green-500" : "bg-gray-400"
                        }`}
                    />
                    <span className="font-medium">
                        {status.scheduler.isRunning ? "Running" : "Idle"}
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
                    <span className="font-medium">{status.config.model}</span>
                </div>

                {/* Threshold */}
                <div>
                    <span className="text-gray-500">Threshold:</span>{" "}
                    <span className="font-medium">
                        {status.config.videoWorthyThreshold}
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
