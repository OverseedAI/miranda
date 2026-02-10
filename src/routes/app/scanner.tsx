import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import type { Id } from '@/convex/_generated/dataModel';
import { useEffect, useMemo, useState } from 'react';
import {
    IconPlayerPlay,
    IconPlayerStop,
    IconRefresh,
    IconClock,
    IconArticle,
    IconRss,
    IconBolt,
    IconTag,
} from '@tabler/icons-react';

export const Route = createFileRoute('/app/scanner')({
    component: RouteComponent,
});

const STORAGE_KEY = 'scanner-config';

type ScannerConfig = {
    daysBack: number;
    parallelism: number;
    selectedTags: string[];
};

function loadConfig(): Partial<ScannerConfig> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function saveConfig(config: ScannerConfig) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
        // Ignore storage errors
    }
}

function RouteComponent() {
    const [scanId, setScanId] = useState<null | Id<'scans'>>(null);

    // Initialize state from localStorage
    const [daysBack, setDaysBack] = useState(() => loadConfig().daysBack ?? 7);
    const [parallelism, setParallelism] = useState(() => loadConfig().parallelism ?? 3);
    const [selectedTags, setSelectedTags] = useState<string[]>(
        () => loadConfig().selectedTags ?? [],
    );

    // Save config to localStorage when it changes
    useEffect(() => {
        saveConfig({ daysBack, parallelism, selectedTags });
    }, [daysBack, parallelism, selectedTags]);

    const queueScan = useMutation(api.services.scans.queueScan);
    const cancelScan = useMutation(api.services.scans.cancelScan);
    const runningScan = useQuery(api.services.scans.getRunningScan);
    const allScans = useQuery(api.services.scans.getAllScans);
    const allTags = useQuery(api.services.rss.getAllTags);
    const allFeeds = useQuery(api.services.rss.getAllRss);
    const failedArticles = useQuery(api.services.articles.getFailedArticles);
    const retryAllFailed = useMutation(api.services.articles.retryAllFailedArticles);

    const matchingFeedCount = useMemo(() => {
        if (!allFeeds) return 0;
        if (selectedTags.length === 0) return allFeeds.length;

        return allFeeds.filter((feed: { tags?: string[] }) => {
            if (!feed.tags || feed.tags.length === 0) return false;
            return selectedTags.some((tag) => feed.tags!.includes(tag));
        }).length;
    }, [allFeeds, selectedTags]);

    const scanLogs = useTanstackQuery({
        ...convexQuery(api.services.logs.getLogs, {
            scanId: scanId ?? ('' as Id<'scans'>),
        }),
        enabled: Boolean(scanId),
    });

    useEffect(() => {
        if (runningScan && !scanId) {
            setScanId(runningScan._id);
        }
    }, [runningScan, scanId]);

    const handleStartScan = async () => {
        if (matchingFeedCount === 0) return;

        const id = await queueScan({
            rssCount: matchingFeedCount,
            daysBack,
            parallelism,
            delay: 1,
            filterTags: selectedTags.length > 0 ? selectedTags : undefined,
        });
        setScanId(id);
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };

    const handleCancelScan = async () => {
        if (runningScan) {
            await cancelScan({ scanId: runningScan._id });
        }
    };

    const handleRetryFailed = async () => {
        await retryAllFailed({});
    };

    const handleViewLogs = (id: Id<'scans'>) => {
        setScanId(id);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Scanner</h1>
                {failedArticles && failedArticles.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleRetryFailed}>
                        <IconRefresh className="size-4 mr-2" />
                        Retry {failedArticles.length} Failed
                    </Button>
                )}
            </div>

            {/* Scan Configuration */}
            <div className="border rounded-lg p-4 space-y-4">
                <h2 className="font-semibold">Scan Configuration</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <IconRss className="size-4" />
                            Feed Coverage
                        </Label>
                        <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted/30">
                            {selectedTags.length === 0
                                ? `All feeds (${matchingFeedCount})`
                                : `All matching tagged feeds (${matchingFeedCount})`}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="daysBack" className="flex items-center gap-2">
                            <IconClock className="size-4" />
                            Days Back
                        </Label>
                        <Input
                            id="daysBack"
                            type="number"
                            min={1}
                            max={30}
                            value={daysBack}
                            onChange={(e) => setDaysBack(Number(e.target.value))}
                            disabled={!!runningScan}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="parallelism" className="flex items-center gap-2">
                            <IconBolt className="size-4" />
                            Parallelism
                        </Label>
                        <Input
                            id="parallelism"
                            type="number"
                            min={1}
                            max={10}
                            value={parallelism}
                            onChange={(e) => setParallelism(Number(e.target.value))}
                            disabled={!!runningScan}
                        />
                    </div>
                </div>

                {/* Tag Filter */}
                {allTags && allTags.length > 0 && (
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <IconTag className="size-4" />
                            Filter by Tags
                            {selectedTags.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    ({selectedTags.length} selected)
                                </span>
                            )}
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {allTags.map((tag: string) => (
                                <Badge
                                    key={tag}
                                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                                    className="cursor-pointer transition-colors"
                                    onClick={() => !runningScan && toggleTag(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                        {selectedTags.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTags([])}
                                disabled={!!runningScan}
                                className="text-xs h-6"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    {runningScan ? (
                        <Button variant="destructive" onClick={handleCancelScan}>
                            <IconPlayerStop className="size-4 mr-2" />
                            Cancel Scan
                        </Button>
                    ) : (
                        <Button onClick={handleStartScan} disabled={matchingFeedCount === 0}>
                            <IconPlayerPlay className="size-4 mr-2" />
                            {matchingFeedCount === 0 ? 'No Feeds to Scan' : 'Start Scan'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Scan Progress */}
            {runningScan && (
                <div className="border rounded-lg p-4 space-y-3 bg-primary/5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                            </span>
                            Scan in Progress
                        </h2>
                        <Badge variant="secondary">{runningScan.status}</Badge>
                    </div>
                    {runningScan.totalArticles !== undefined && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">
                                    {runningScan.processedArticles ?? 0} /{' '}
                                    {runningScan.totalArticles} articles
                                </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{
                                        width: `${((runningScan.processedArticles ?? 0) / runningScan.totalArticles) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Logs */}
            {scanId && scanLogs.data && scanLogs.data.length > 0 && (
                <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Logs</h2>
                    </div>
                    <div className="h-80 min-h-32 max-h-[600px] resize-y overflow-auto bg-muted/50 rounded p-3 font-mono text-xs space-y-1">
                        {scanLogs.data.map((line: { _id: string; message: string }) => (
                            <p key={line._id} className="text-muted-foreground">
                                {line.message}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {/* Scan History */}
            <div className="border rounded-lg p-4 space-y-3">
                <h2 className="font-semibold">Scan History</h2>
                {allScans === undefined ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : allScans.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No scans yet.</p>
                ) : (
                    <div className="space-y-2">
                        {allScans.slice(0, 10).map((scan: ScanHistoryRowProps['scan']) => (
                            <ScanHistoryRow
                                key={scan._id}
                                scan={scan}
                                isSelected={scanId === scan._id}
                                onViewLogs={() => handleViewLogs(scan._id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

type ScanHistoryRowProps = {
    scan: {
        _id: Id<'scans'>;
        _creationTime: number;
        status: string;
        options: {
            rssCount: number;
            daysBack?: number;
            parallelism?: number;
            filterTags?: string[];
        };
        totalArticles?: number;
        processedArticles?: number;
        completedAt?: string;
    };
    isSelected: boolean;
    onViewLogs: () => void;
};

function ScanHistoryRow({
    scan,
    isSelected,
    onViewLogs,
}: ScanHistoryRowProps) {
    const statusColor =
        {
            initializing: 'bg-yellow-500',
            running: 'bg-blue-500',
            completed: 'bg-green-500',
        }[scan.status] ?? 'bg-gray-500';

    return (
        <div
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                isSelected ? 'bg-accent border-primary' : 'hover:bg-accent/50'
            }`}
            onClick={onViewLogs}
        >
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                <div>
                    <p className="text-sm font-medium">
                        {new Date(scan._creationTime).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <IconRss className="size-3" />
                            {scan.options.rssCount} feeds
                        </span>
                        {scan.options.daysBack && (
                            <span className="flex items-center gap-1">
                                <IconClock className="size-3" />
                                {scan.options.daysBack}d
                            </span>
                        )}
                        {scan.totalArticles !== undefined && (
                            <span className="flex items-center gap-1">
                                <IconArticle className="size-3" />
                                {scan.processedArticles ?? 0}/{scan.totalArticles}
                            </span>
                        )}
                        {scan.options.filterTags && scan.options.filterTags.length > 0 && (
                            <span className="flex items-center gap-1">
                                <IconTag className="size-3" />
                                {scan.options.filterTags.join(', ')}
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <Badge
                variant={scan.status === 'completed' ? 'default' : 'secondary'}
                className="capitalize"
            >
                {scan.status}
            </Badge>
        </div>
    );
}
