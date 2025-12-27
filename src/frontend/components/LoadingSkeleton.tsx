import React from "react";

// Base skeleton component
export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded ${className}`}
        />
    );
}

// Article card skeleton
export function ArticleCardSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-3" />
            <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-12" />
            </div>
            <div className="mb-3">
                <Skeleton className="h-2 w-full mb-1" />
                <Skeleton className="h-2 w-full" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-6 w-16 rounded" />
            </div>
        </div>
    );
}

// Article grid skeleton
export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
            ))}
        </div>
    );
}

// Article table skeleton
export function ArticleTableSkeleton({ rows = 10 }: { rows?: number }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="border-b border-gray-200 p-4">
                <div className="flex gap-4">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/6" />
                    <Skeleton className="h-5 w-1/6" />
                    <Skeleton className="h-5 w-1/6" />
                </div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="border-b border-gray-100 p-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                        <Skeleton className="h-4 w-1/6" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Chart skeleton
export function ChartSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-8 flex-1" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Status bar skeleton
export function StatusBarSkeleton() {
    return (
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-20" />
                ))}
            </div>
        </div>
    );
}
