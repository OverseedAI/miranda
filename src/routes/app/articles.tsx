import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    IconFlame,
    IconSparkles,
    IconUsers,
    IconShieldCheck,
    IconSearch,
    IconChevronDown,
    IconChevronUp,
    IconVideo,
    IconStar,
    IconStarFilled,
    IconTrash,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { BulkDeleteModal } from '@/components/bulk-delete-modal';

export const Route = createFileRoute('/app/articles')({
    component: RouteComponent,
});

const ITEMS_PER_PAGE = 20;

type SortOption = 'date-desc' | 'date-asc' | 'scan-desc' | 'scan-asc' | 'score-desc' | 'score-asc';
type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';
type RecommendationFilter = 'all' | 'highly_recommended' | 'recommended' | 'maybe' | 'not_recommended';

const STORAGE_KEY = 'articles-filters';

type FiltersState = {
    search: string;
    statusFilter: StatusFilter;
    recommendationFilter: RecommendationFilter;
    sortOption: SortOption;
};

function loadFilters(): Partial<FiltersState> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function saveFilters(filters: FiltersState) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
        // Ignore storage errors
    }
}

function RouteComponent() {
    const articles = useQuery(api.services.articles.getAllArticles);

    // Initialize state from localStorage
    const [search, setSearch] = useState(() => loadFilters().search ?? '');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => loadFilters().statusFilter ?? 'all');
    const [recommendationFilter, setRecommendationFilter] = useState<RecommendationFilter>(() => loadFilters().recommendationFilter ?? 'all');
    const [sortOption, setSortOption] = useState<SortOption>(() => loadFilters().sortOption ?? 'date-desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // Save filters to localStorage when they change
    useEffect(() => {
        saveFilters({ search, statusFilter, recommendationFilter, sortOption });
    }, [search, statusFilter, recommendationFilter, sortOption]);

    const getAverageScore = (article: Article) => {
        if (!article.score) return null;
        return (
            (article.score.relevance +
                article.score.uniqueness +
                article.score.engagement +
                article.score.credibility) /
            4
        );
    };

    const filteredAndSortedArticles = useMemo(() => {
        if (!articles) return [];

        let result = [...articles];

        // Filter by search
        if (search.trim()) {
            const searchLower = search.toLowerCase();
            result = result.filter((a) => a.title.toLowerCase().includes(searchLower));
        }

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter((a) => a.status === statusFilter);
        }

        // Filter by recommendation
        if (recommendationFilter !== 'all') {
            result = result.filter((a) => a.recommendation === recommendationFilter);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOption) {
                case 'date-desc':
                    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
                case 'date-asc':
                    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
                case 'scan-desc':
                    return b._creationTime - a._creationTime;
                case 'scan-asc':
                    return a._creationTime - b._creationTime;
                case 'score-desc': {
                    const scoreA = getAverageScore(a) ?? -1;
                    const scoreB = getAverageScore(b) ?? -1;
                    return scoreB - scoreA;
                }
                case 'score-asc': {
                    const scoreA = getAverageScore(a) ?? 11;
                    const scoreB = getAverageScore(b) ?? 11;
                    return scoreA - scoreB;
                }
                default:
                    return 0;
            }
        });

        return result;
    }, [articles, search, statusFilter, recommendationFilter, sortOption]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, recommendationFilter, sortOption]);

    const totalPages = Math.ceil(filteredAndSortedArticles.length / ITEMS_PER_PAGE);
    const paginatedArticles = filteredAndSortedArticles.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (articles === undefined) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Articles</h1>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 w-32" />
                    <Skeleton className="h-9 w-36" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Articles</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="text-destructive hover:text-destructive"
                    >
                        <IconTrash className="size-4 mr-1" />
                        Bulk Delete
                    </Button>
                    <Badge variant="secondary">{filteredAndSortedArticles.length} articles</Badge>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={recommendationFilter}
                    onValueChange={(v) => setRecommendationFilter(v as RecommendationFilter)}
                >
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Recommendation" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Recommendations</SelectItem>
                        <SelectItem value="highly_recommended">Highly Recommended</SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="maybe">Maybe</SelectItem>
                        <SelectItem value="not_recommended">Not Recommended</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date-desc">Published (Newest)</SelectItem>
                        <SelectItem value="date-asc">Published (Oldest)</SelectItem>
                        <SelectItem value="scan-desc">Scanned (Newest)</SelectItem>
                        <SelectItem value="scan-asc">Scanned (Oldest)</SelectItem>
                        <SelectItem value="score-desc">Score (Highest)</SelectItem>
                        <SelectItem value="score-asc">Score (Lowest)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Articles List */}
            {paginatedArticles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    {articles.length === 0
                        ? 'No articles yet. Run a scan to fetch articles from your RSS feeds.'
                        : 'No articles match your filters.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {paginatedArticles.map((article) => (
                        <ArticleRow key={article._id} article={article} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6">
                    <ArticlesPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}

            {/* Bulk Delete Modal */}
            <BulkDeleteModal
                open={showBulkDeleteModal}
                onOpenChange={setShowBulkDeleteModal}
            />
        </div>
    );
}

type Article = {
    _id: string;
    _creationTime: number;
    title: string;
    url: string;
    publishedAt: string;
    status: string;
    sourceName: string;
    summary?: string;
    extractedContent?: string;
    recommendation?: string;
    videoAngle?: string;
    score?: {
        relevance: number;
        relevanceSummary?: string;
        uniqueness: number;
        uniquenessSummary?: string;
        engagement: number;
        engagementSummary?: string;
        credibility: number;
        credibilitySummary?: string;
    };
};

function ArticleRow({ article }: { article: Article }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const deleteArticle = useMutation(api.services.articles.deleteArticle);
    const hasScore = article.score !== undefined;
    const hasAnalysis = article.summary || article.recommendation || article.videoAngle;
    const avgScore = hasScore
        ? (article.score!.relevance +
              article.score!.uniqueness +
              article.score!.engagement +
              article.score!.credibility) /
          4
        : null;

    const getScoreColor = (score: number) => {
        if (score >= 7) return 'text-green-500';
        if (score >= 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="default" className="text-xs">
                        Completed
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge variant="secondary" className="text-xs">
                        Processing
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge variant="outline" className="text-xs">
                        Pending
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="destructive" className="text-xs">
                        Failed
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="text-xs">
                        {status}
                    </Badge>
                );
        }
    };

    const getRecommendationBadge = (recommendation: string) => {
        switch (recommendation) {
            case 'highly_recommended':
                return (
                    <Badge className="bg-green-500 hover:bg-green-600 text-xs">
                        <IconStarFilled className="size-3 mr-1" />
                        Highly Recommended
                    </Badge>
                );
            case 'recommended':
                return (
                    <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">
                        <IconStar className="size-3 mr-1" />
                        Recommended
                    </Badge>
                );
            case 'maybe':
                return (
                    <Badge variant="secondary" className="text-xs">
                        Maybe
                    </Badge>
                );
            case 'not_recommended':
                return (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                        Not Recommended
                    </Badge>
                );
            default:
                return null;
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="rounded-lg border bg-card overflow-hidden">
            {/* Main Content */}
            <div
                className={`p-4 transition-colors group ${hasAnalysis ? 'cursor-pointer hover:bg-accent/50' : ''}`}
                onClick={() => hasAnalysis && setIsExpanded(!isExpanded)}
            >
                {/* Row 1: Title + Actions */}
                <div className="flex items-start gap-3">
                    {/* Score indicator */}
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {avgScore !== null ? (
                            <span className={`text-sm font-bold ${getScoreColor(avgScore)}`}>
                                {avgScore.toFixed(1)}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                        )}
                    </div>

                    {/* Title and metadata */}
                    <div className="flex-1 min-w-0">
                        {/* Date — Source */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{formatDate(article.publishedAt)}</span>
                            <span>—</span>
                            <span className="truncate">{article.sourceName}</span>
                        </div>

                        {/* Title */}
                        <h3 className="font-medium text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {article.title}
                        </h3>

                        {/* Status and Recommendation */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            {getStatusBadge(article.status)}
                            {article.recommendation && getRecommendationBadge(article.recommendation)}
                        </div>

                        {/* Row 3: Score breakdown (only if has score) */}
                        {hasScore && (
                            <div className="flex items-center gap-4 mt-2 text-xs">
                                <ScoreChip icon={IconFlame} value={article.score!.relevance} label="Relevance" />
                                <ScoreChip icon={IconSparkles} value={article.score!.uniqueness} label="Uniqueness" />
                                <ScoreChip icon={IconUsers} value={article.score!.engagement} label="Engagement" />
                                <ScoreChip icon={IconShieldCheck} value={article.score!.credibility} label="Credibility" />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                        >
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                                <IconExternalLink className="size-4" />
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteDialog(true);
                            }}
                        >
                            <IconTrash className="size-4" />
                        </Button>
                        {hasAnalysis && (
                            <Button variant="ghost" size="icon" className="size-8">
                                {isExpanded ? (
                                    <IconChevronUp className="size-4" />
                                ) : (
                                    <IconChevronDown className="size-4" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>Delete Article</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this article? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="text-sm font-medium line-clamp-2">{article.title}</div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                await deleteArticle({ articleId: article._id as Id<'articles'> });
                                setShowDeleteDialog(false);
                                toast.success('Article deleted');
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Expanded Details */}
            {isExpanded && hasAnalysis && (
                <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
                    {article.summary && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                Summary
                            </h4>
                            <p className="text-sm leading-relaxed">{article.summary}</p>
                        </div>
                    )}
                    {article.videoAngle && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
                                <IconVideo className="size-3" />
                                Video Angle
                            </h4>
                            <p className="text-sm text-primary">{article.videoAngle}</p>
                        </div>
                    )}
                    {article.score && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Score Breakdown
                            </h4>
                            {article.score.relevanceSummary && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <IconFlame className="size-3 text-muted-foreground" />
                                        <span className="text-xs font-medium">Relevance ({article.score.relevance}/10)</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-4">{article.score.relevanceSummary}</p>
                                </div>
                            )}
                            {article.score.uniquenessSummary && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <IconSparkles className="size-3 text-muted-foreground" />
                                        <span className="text-xs font-medium">Uniqueness ({article.score.uniqueness}/10)</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-4">{article.score.uniquenessSummary}</p>
                                </div>
                            )}
                            {article.score.engagementSummary && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <IconUsers className="size-3 text-muted-foreground" />
                                        <span className="text-xs font-medium">Engagement ({article.score.engagement}/10)</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-4">{article.score.engagementSummary}</p>
                                </div>
                            )}
                            {article.score.credibilitySummary && (
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <IconShieldCheck className="size-3 text-muted-foreground" />
                                        <span className="text-xs font-medium">Credibility ({article.score.credibility}/10)</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground pl-4">{article.score.credibilitySummary}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ScoreChip({
    icon: Icon,
    value,
    label,
}: {
    icon: typeof IconFlame;
    value: number;
    label: string;
}) {
    const getColor = (score: number) => {
        if (score >= 7) return 'text-green-500';
        if (score >= 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <span className="flex items-center gap-0.5" title={label}>
            <Icon className="size-3" />
            <span className={getColor(value)}>{value}</span>
        </span>
    );
}

function ArticlesPagination({
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
