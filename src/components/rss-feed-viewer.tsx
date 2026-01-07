import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { IconExternalLink, IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

type FeedArticle = {
    title: string;
    link: string;
    pubDate?: string;
    author?: string;
    contentSnippet?: string;
    content?: string;
};

type FeedData = {
    title: string;
    description?: string;
    link?: string;
    articles: FeedArticle[];
};

type RssFeedViewerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedName: string;
    xmlUrl: string;
};

export function RssFeedViewer({ open, onOpenChange, feedName, xmlUrl }: RssFeedViewerProps) {
    const fetchFeedPreview = useAction(api.node.rssFeedFetcher.fetchFeedPreview);
    const [loading, setLoading] = useState(false);
    const [feedData, setFeedData] = useState<FeedData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && xmlUrl) {
            setLoading(true);
            setError(null);
            setFeedData(null);

            fetchFeedPreview({ xmlUrl })
                .then((result) => {
                    if (result.success && result.feed) {
                        setFeedData(result.feed);
                    } else {
                        setError(result.error || 'Failed to fetch feed');
                    }
                })
                .catch((err) => {
                    setError((err as Error).message || 'Failed to fetch feed');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [open, xmlUrl, fetchFeedPreview]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{feedName}</DialogTitle>
                    <DialogDescription className="break-all">{xmlUrl}</DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className="flex-1 space-y-3 overflow-y-auto py-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <div className="space-y-3 mt-6">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-5 w-5/6" />
                                    <Skeleton className="h-4 w-1/4" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex-1 flex items-center justify-center py-8">
                        <div className="text-center max-w-md">
                            <IconAlertCircle className="size-12 text-destructive mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Failed to load feed</h3>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                )}

                {feedData && !loading && (
                    <div className="flex-1 overflow-y-auto space-y-3 py-2">
                        {/* Feed Info */}
                        <div className="border-b pb-2">
                            <h2 className="text-lg font-bold mb-1">{feedData.title}</h2>
                            {feedData.description && (
                                <p className="text-xs text-muted-foreground mb-1">{feedData.description}</p>
                            )}
                            {feedData.link && (
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                    <a href={feedData.link} target="_blank" rel="noopener noreferrer">
                                        <IconExternalLink className="size-3 mr-1" />
                                        Visit website
                                    </a>
                                </Button>
                            )}
                        </div>

                        {/* Articles List */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-base font-semibold">
                                    Articles
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                        {feedData.articles.length}
                                    </Badge>
                                </h3>
                            </div>

                            {feedData.articles.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No articles found in this feed
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {feedData.articles.map((article, idx) => (
                                        <article
                                            key={idx}
                                            className="p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-medium leading-tight flex-1">
                                                    <a
                                                        href={article.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-primary transition-colors hover:underline"
                                                    >
                                                        {article.title}
                                                    </a>
                                                </h4>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-6 shrink-0"
                                                    asChild
                                                >
                                                    <a
                                                        href={article.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <IconExternalLink className="size-3.5" />
                                                    </a>
                                                </Button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                                {article.pubDate && (
                                                    <span>{formatDate(article.pubDate)}</span>
                                                )}
                                                {article.author && (
                                                    <>
                                                        {article.pubDate && <span>•</span>}
                                                        <span>by {article.author}</span>
                                                    </>
                                                )}
                                            </div>

                                            {article.contentSnippet && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {article.contentSnippet}
                                                </p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
