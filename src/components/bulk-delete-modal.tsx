import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconTrash, IconAlertTriangle, IconSearch } from '@tabler/icons-react';

type BulkDeleteModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

// Helper to decode HTML entities
function decodeHtmlEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
] as const;

const RECOMMENDATION_OPTIONS = [
    { value: 'highly_recommended', label: 'Highly Recommended' },
    { value: 'recommended', label: 'Recommended' },
    { value: 'maybe', label: 'Maybe' },
    { value: 'not_recommended', label: 'Not Recommended' },
    { value: 'none', label: 'No Recommendation' },
] as const;

export function BulkDeleteModal({ open, onOpenChange }: BulkDeleteModalProps) {
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedRecommendations, setSelectedRecommendations] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<Id<'rss'>[]>([]);
    const [sourceSearch, setSourceSearch] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const rssSources = useQuery(api.services.rss.getAllRss);
    const bulkDeleteArticles = useMutation(api.services.articles.bulkDeleteArticles);

    // Decode HTML entities in source names
    const decodedSources = useMemo(() => {
        if (!rssSources) return undefined;
        return rssSources.map((source) => ({
            ...source,
            name: decodeHtmlEntities(source.name),
        }));
    }, [rssSources]);

    // Filter sources by search term
    const filteredSources = useMemo(() => {
        if (!decodedSources) return undefined;
        if (!sourceSearch.trim()) return decodedSources;
        const search = sourceSearch.toLowerCase();
        return decodedSources.filter((source) => source.name.toLowerCase().includes(search));
    }, [decodedSources, sourceSearch]);

    // Build filter args for the count query
    const filterArgs = {
        statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        recommendations: selectedRecommendations.length > 0 ? selectedRecommendations : undefined,
        sourceIds: selectedSources.length > 0 ? selectedSources : undefined,
    };

    const countResult = useQuery(api.services.articles.countArticlesByFilters, filterArgs);

    const articleCount = countResult?.count ?? 0;
    const hasFilters =
        selectedStatuses.length > 0 ||
        selectedRecommendations.length > 0 ||
        selectedSources.length > 0;

    // Reset state when modal closes
    useEffect(() => {
        if (!open) {
            setSelectedStatuses([]);
            setSelectedRecommendations([]);
            setSelectedSources([]);
            setSourceSearch('');
            setShowConfirmation(false);
        }
    }, [open]);

    const selectAllSources = () => {
        if (filteredSources) {
            setSelectedSources(filteredSources.map((s) => s._id));
        }
    };

    const deselectAllSources = () => {
        if (filteredSources) {
            const filteredIds = new Set(filteredSources.map((s) => s._id));
            setSelectedSources((prev) => prev.filter((id) => !filteredIds.has(id)));
        }
    };

    const toggleStatus = (status: string) => {
        setSelectedStatuses((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
        );
    };

    const toggleRecommendation = (recommendation: string) => {
        setSelectedRecommendations((prev) =>
            prev.includes(recommendation)
                ? prev.filter((r) => r !== recommendation)
                : [...prev, recommendation],
        );
    };

    const toggleSource = (sourceId: Id<'rss'>) => {
        setSelectedSources((prev) =>
            prev.includes(sourceId) ? prev.filter((s) => s !== sourceId) : [...prev, sourceId],
        );
    };

    const handleDelete = async () => {
        if (!hasFilters || articleCount === 0) return;

        setIsDeleting(true);
        try {
            const result = await bulkDeleteArticles(filterArgs);
            toast.success(
                `Deleted ${result.deletedCount} article${result.deletedCount !== 1 ? 's' : ''}`,
            );
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to delete articles');
        } finally {
            setIsDeleting(false);
            setShowConfirmation(false);
        }
    };

    // Confirmation dialog
    if (showConfirmation) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconAlertTriangle className="size-5 text-destructive" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {articleCount} article
                            {articleCount !== 1 ? 's' : ''}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-muted rounded-lg p-3 text-sm max-h-40 overflow-y-auto">
                        <div className="font-medium mb-2">Selected filters:</div>
                        <ul className="space-y-1 text-muted-foreground">
                            {selectedStatuses.length > 0 && (
                                <li>Status: {selectedStatuses.join(', ')}</li>
                            )}
                            {selectedRecommendations.length > 0 && (
                                <li>
                                    Recommendation:{' '}
                                    {selectedRecommendations
                                        .map((r) =>
                                            r === 'none'
                                                ? 'No Recommendation'
                                                : r.replace('_', ' '),
                                        )
                                        .join(', ')}
                                </li>
                            )}
                            {selectedSources.length > 0 && (
                                <li>
                                    Sources ({selectedSources.length}):{' '}
                                    {selectedSources
                                        .map(
                                            (id) =>
                                                decodedSources?.find((s) => s._id === id)?.name ??
                                                'Unknown',
                                        )
                                        .join(', ')}
                                </li>
                            )}
                        </ul>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmation(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting
                                ? 'Deleting...'
                                : `Delete ${articleCount} article${articleCount !== 1 ? 's' : ''}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Main configuration dialog
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-2 flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconTrash className="size-5" />
                        Bulk Delete Articles
                    </DialogTitle>
                    <DialogDescription>
                        Select filters to choose which articles to delete. All filters are combined
                        with AND logic.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 flex flex-col">
                    {/* Status Filter */}
                    <div>
                        <div className="text-sm font-medium mb-3">Status</div>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`status-${option.value}`}
                                        checked={selectedStatuses.includes(option.value)}
                                        onCheckedChange={() => toggleStatus(option.value)}
                                    />
                                    <Label
                                        htmlFor={`status-${option.value}`}
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendation Filter */}
                    <div>
                        <div className="text-sm font-medium mb-3">Recommendation</div>
                        <div className="grid grid-cols-2 gap-2">
                            {RECOMMENDATION_OPTIONS.map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`rec-${option.value}`}
                                        checked={selectedRecommendations.includes(option.value)}
                                        onCheckedChange={() => toggleRecommendation(option.value)}
                                    />
                                    <Label
                                        htmlFor={`rec-${option.value}`}
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Source Filter */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-sm font-medium">Source</div>
                            {decodedSources && decodedSources.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllSources}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Select all
                                    </button>
                                    <span className="text-muted-foreground">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAllSources}
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Deselect all
                                    </button>
                                </div>
                            )}
                        </div>
                        {decodedSources === undefined ? (
                            <div className="text-sm text-muted-foreground">Loading sources...</div>
                        ) : decodedSources.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                                No sources available
                            </div>
                        ) : (
                            <>
                                <div className="relative mb-2">
                                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filter sources..."
                                        value={sourceSearch}
                                        onChange={(e) => setSourceSearch(e.target.value)}
                                        className="pl-8 h-8 text-sm"
                                    />
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {filteredSources && filteredSources.length > 0 ? (
                                        filteredSources.map((source) => (
                                            <div
                                                key={source._id}
                                                className="flex items-center space-x-2"
                                            >
                                                <Checkbox
                                                    id={`source-${source._id}`}
                                                    checked={selectedSources.includes(source._id)}
                                                    onCheckedChange={() => toggleSource(source._id)}
                                                />
                                                <Label
                                                    htmlFor={`source-${source._id}`}
                                                    className="text-sm font-normal cursor-pointer line-clamp-1"
                                                >
                                                    {source.name}
                                                </Label>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground py-2">
                                            No sources match your filter
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Preview Count */}
                <div className="border rounded-md p-3">
                    <p className="text-sm">
                        {!hasFilters ? (
                            <span className="text-muted-foreground">
                                Select at least one filter to see matching articles
                            </span>
                        ) : countResult === undefined ? (
                            <span className="text-muted-foreground">Counting articles...</span>
                        ) : (
                            <>
                                <span className="font-semibold text-foreground">
                                    {articleCount}
                                </span>
                                <span className="text-muted-foreground">
                                    {' '}
                                    article{articleCount !== 1 ? 's' : ''} will be deleted
                                </span>
                            </>
                        )}
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setShowConfirmation(true)}
                        disabled={!hasFilters || articleCount === 0}
                    >
                        Delete Articles
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
