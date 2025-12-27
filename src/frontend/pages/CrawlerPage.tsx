import React from "react";
import InlineCrawlProgress from "../components/InlineCrawlProgress";
import type { CrawlProgressState } from "../types";

interface CrawlerPageProps {
    crawlProgress: CrawlProgressState;
    isLoading: boolean;
    isMutationPending: boolean;
    onTriggerCrawl: () => void;
}

export default function CrawlerPage({
    crawlProgress,
    isLoading,
    isMutationPending,
    onTriggerCrawl,
}: CrawlerPageProps) {
    const hasProgress = crawlProgress.phase !== "Idle";

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Crawler</h1>
                <button
                    onClick={onTriggerCrawl}
                    disabled={isLoading || isMutationPending}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
                >
                    {isLoading || isMutationPending ? "Crawling..." : "Trigger Crawl"}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-blue-900 mb-2">
                        About the Crawler
                    </h2>
                    <p className="text-blue-800 mb-3">
                        The crawler automatically scans configured sources for new articles,
                        analyzes them for video-worthiness using AI, and stores the results in the
                        database.
                    </p>
                    <ul className="list-disc list-inside text-blue-800 space-y-1">
                        <li>Crawls multiple RSS/news sources</li>
                        <li>Filters out duplicate articles</li>
                        <li>Analyzes each article with AI for video potential</li>
                        <li>Sends alerts for high-value content</li>
                    </ul>
                </div>

                {/* Crawl Progress/Status */}
                {hasProgress && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Crawl Progress
                        </h2>
                        <InlineCrawlProgress
                            phase={crawlProgress.phase}
                            current={crawlProgress.current}
                            total={crawlProgress.total}
                            isActive={crawlProgress.isActive}
                        />
                    </div>
                )}

                {/* Instructions */}
                {!hasProgress && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">
                            No Active Crawl
                        </h2>
                        <p className="text-gray-700">
                            Click the "Trigger Crawl" button above to manually start a crawl cycle.
                            The crawler will also run automatically at scheduled intervals.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
