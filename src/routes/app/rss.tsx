import { createFileRoute } from '@tanstack/react-router';
import { api } from '@/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    IconExternalLink,
    IconRss,
    IconSearch,
    IconTrash,
    IconPlus,
    IconPencil,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import type { Id } from '@/convex/_generated/dataModel';
import { RssModal } from '@/components/rss-modal';

export const Route = createFileRoute('/app/rss')({
    component: RouteComponent,
});

const ITEMS_PER_PAGE = 20;

type Feed = {
    _id: Id<'rss'>;
    name: string;
    type: string;
    htmlUrl: string;
    xmlUrl: string;
};

function RouteComponent() {
    const feeds = useQuery(api.services.rss.getAllRss);
    const deleteRss = useMutation(api.services.rss.deleteRss);

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editFeed, setEditFeed] = useState<Feed | null>(null);

    const filteredFeeds = useMemo(() => {
        if (!feeds) return [];

        let result = [...feeds];

        if (search.trim()) {
            const searchLower = search.toLowerCase();
            result = result.filter(
                (f) =>
                    f.name.toLowerCase().includes(searchLower) ||
                    f.xmlUrl.toLowerCase().includes(searchLower)
            );
        }

        return result;
    }, [feeds, search]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const totalPages = Math.ceil(filteredFeeds.length / ITEMS_PER_PAGE);
    const paginatedFeeds = filteredFeeds.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleAddNew = () => {
        setEditFeed(null);
        setModalOpen(true);
    };

    const handleEdit = (feed: Feed) => {
        setEditFeed(feed);
        setModalOpen(true);
    };

    const handleDelete = async (id: Id<'rss'>, name: string) => {
        if (confirm(`Delete "${name}"?`)) {
            await deleteRss({ id });
        }
    };

    if (feeds === undefined) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">RSS Feeds</h1>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-28" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">RSS Feeds</h1>
                <Badge variant="secondary">{filteredFeeds.length} feeds</Badge>
            </div>

            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search feeds..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={handleAddNew}>
                    <IconPlus className="size-4 mr-2" />
                    Add Feed
                </Button>
            </div>

            {/* Feeds List */}
            {paginatedFeeds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    {feeds.length === 0
                        ? 'No RSS feeds yet. Add one to get started.'
                        : 'No feeds match your search.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {paginatedFeeds.map((feed) => (
                        <FeedRow
                            key={feed._id}
                            feed={feed}
                            onEdit={() => handleEdit(feed)}
                            onDelete={() => handleDelete(feed._id, feed.name)}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6">
                    <FeedsPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* RSS Modal */}
            <RssModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                editFeed={editFeed}
            />
        </div>
    );
}

function FeedRow({
    feed,
    onEdit,
    onDelete,
}: {
    feed: Feed;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 rounded-md bg-orange-500/10 flex items-center justify-center">
                <IconRss className="size-5 text-orange-500" />
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {feed.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {feed.xmlUrl}
                </p>
            </div>

            {/* Meta info */}
            <div className="shrink-0 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                    {feed.type.toUpperCase()}
                </Badge>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                    <a href={feed.htmlUrl} target="_blank" rel="noopener noreferrer">
                        <IconExternalLink className="size-4" />
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={onEdit}
                >
                    <IconPencil className="size-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={onDelete}
                >
                    <IconTrash className="size-4" />
                </Button>
            </div>
        </div>
    );
}

function FeedsPagination({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    const getVisiblePages = () => {
        const pages: (number | 'ellipsis')[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        pages.push(1);

        if (currentPage > 3) {
            pages.push('ellipsis');
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (currentPage < totalPages - 2) {
            pages.push('ellipsis');
        }

        pages.push(totalPages);

        return pages;
    };

    return (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                </PaginationItem>
                {getVisiblePages().map((page, idx) =>
                    page === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                        </PaginationItem>
                    ) : (
                        <PaginationItem key={page}>
                            <PaginationLink
                                onClick={() => onPageChange(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    )
                )}
                <PaginationItem>
                    <PaginationNext
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
