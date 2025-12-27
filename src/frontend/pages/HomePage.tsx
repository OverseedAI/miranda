import React from "react";
import StatusBar from "../components/StatusBar";
import ScoreChart from "../components/ScoreChart";
import SourceChart from "../components/SourceChart";
import ErrorMessage from "../components/ErrorMessage";
import { ChartSkeleton, StatusBarSkeleton } from "../components/LoadingSkeleton";
import type { Article, Status } from "../types";

interface HomePageProps {
    status: Status | undefined;
    statusLoading: boolean;
    statusError: Error | null;
    articles: Article[];
    articlesLoading: boolean;
    onStatusRetry: () => void;
}

export default function HomePage({
    status,
    statusLoading,
    statusError,
    articles,
    articlesLoading,
    onStatusRetry,
}: HomePageProps) {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

            {/* Status Bar */}
            {statusLoading ? (
                <StatusBarSkeleton />
            ) : statusError ? (
                <ErrorMessage message="Failed to load status" onRetry={onStatusRetry} />
            ) : (
                <StatusBar status={status!} articleCount={articles.length} />
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {articlesLoading ? (
                    <>
                        <ChartSkeleton />
                        <ChartSkeleton />
                    </>
                ) : (
                    <>
                        <ScoreChart articles={articles} />
                        <SourceChart articles={articles} />
                    </>
                )}
            </div>
        </div>
    );
}
