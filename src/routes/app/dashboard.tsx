import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    IconTrendingUp,
    IconTrendingDown,
    IconArticle,
    IconCheck,
    IconStar,
    IconClock,
    IconExternalLink,
    IconFlame,
    IconSparkles,
    IconUsers,
    IconShieldCheck,
    IconBrandSlack,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Area, AreaChart, YAxis } from 'recharts';

export const Route = createFileRoute('/app/dashboard')({
    component: Dashboard,
});

type Article = {
    _id: string;
    title: string;
    url: string;
    publishedAt: string;
    status: string;
    summary?: string;
    slackNotifiedAt?: string;
    score?: {
        relevance: number;
        uniqueness: number;
        engagement: number;
        credibility: number;
    };
};

function Dashboard() {
    const articles = useQuery(api.services.articles.getAllArticles);
    const scans = useQuery(api.services.scans.getAllScans);

    const stats = useMemo(() => {
        if (!articles) return null;

        const total = articles.length;
        const completed = articles.filter((a) => a.status === 'completed').length;
        const pending = articles.filter((a) => a.status === 'pending').length;
        const processing = articles.filter((a) => a.status === 'processing').length;
        const failed = articles.filter((a) => a.status === 'failed').length;

        const completedArticles = articles.filter((a) => a.status === 'completed' && a.score);
        const avgScore = completedArticles.length > 0
            ? completedArticles.reduce((sum, a) => {
                  const score = a.score!;
                  return sum + (score.relevance + score.uniqueness + score.engagement + score.credibility) / 4;
              }, 0) / completedArticles.length
            : 0;

        const highScoreArticles = completedArticles.filter((a) => {
            const score = a.score!;
            const avg = (score.relevance + score.uniqueness + score.engagement + score.credibility) / 4;
            return avg >= 7;
        }).length;

        // Calculate articles from last scan
        const lastScan = scans && scans.length > 0 ? scans[0] : null;
        const articlesFromLastScan = lastScan
            ? articles.filter((a) => {
                  const articleDate = new Date(a.publishedAt);
                  const scanDate = new Date(lastScan._creationTime);
                  return articleDate >= scanDate;
              }).length
            : 0;

        // Calculate articles sent to Slack
        const slackNotified = articles.filter((a) => a.slackNotifiedAt).length;

        return {
            total,
            completed,
            pending,
            processing,
            failed,
            avgScore,
            highScoreArticles,
            articlesFromLastScan,
            slackNotified,
            completionRate: total > 0 ? (completed / total) * 100 : 0,
        };
    }, [articles, scans]);

    const statusChartData = useMemo(() => {
        if (!stats) return [];
        return [
            { status: 'Completed', count: stats.completed, fill: 'var(--chart-1)' },
            { status: 'Pending', count: stats.pending, fill: 'var(--chart-2)' },
            { status: 'Processing', count: stats.processing, fill: 'var(--chart-3)' },
            { status: 'Failed', count: stats.failed, fill: 'var(--chart-4)' },
        ];
    }, [stats]);

    const scoreDistributionData = useMemo(() => {
        if (!articles) return [];

        const completedArticles = articles.filter((a) => a.status === 'completed' && a.score);
        const distribution = {
            '9-10': 0,
            '7-8.9': 0,
            '5-6.9': 0,
            '3-4.9': 0,
            '0-2.9': 0,
        };

        completedArticles.forEach((a) => {
            const score = a.score!;
            const avg = (score.relevance + score.uniqueness + score.engagement + score.credibility) / 4;

            if (avg >= 9) distribution['9-10']++;
            else if (avg >= 7) distribution['7-8.9']++;
            else if (avg >= 5) distribution['5-6.9']++;
            else if (avg >= 3) distribution['3-4.9']++;
            else distribution['0-2.9']++;
        });

        return [
            { range: '9-10', count: distribution['9-10'], fill: 'var(--chart-1)' },
            { range: '7-8.9', count: distribution['7-8.9'], fill: 'var(--chart-2)' },
            { range: '5-6.9', count: distribution['5-6.9'], fill: 'var(--chart-3)' },
            { range: '3-4.9', count: distribution['3-4.9'], fill: 'var(--chart-4)' },
            { range: '0-2.9', count: distribution['0-2.9'], fill: 'var(--chart-5)' },
        ];
    }, [articles]);

    const articlesOverTimeData = useMemo(() => {
        if (!articles) return [];

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const articlesByDay = new Map<string, { completed: number; total: number }>();

        articles.forEach((a) => {
            const date = new Date(a.publishedAt);
            if (date >= last30Days) {
                const dateStr = date.toISOString().split('T')[0];
                const existing = articlesByDay.get(dateStr) || { completed: 0, total: 0 };
                existing.total++;
                if (a.status === 'completed') existing.completed++;
                articlesByDay.set(dateStr, existing);
            }
        });

        const result = Array.from(articlesByDay.entries())
            .map(([date, counts]) => ({
                date,
                completed: counts.completed,
                total: counts.total,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return result;
    }, [articles]);

    const topArticles = useMemo(() => {
        if (!articles) return [];

        return articles
            .filter((a) => a.status === 'completed' && a.score)
            .map((a) => {
                const score = a.score!;
                const avg = (score.relevance + score.uniqueness + score.engagement + score.credibility) / 4;
                return { ...a, avgScore: avg };
            })
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 5);
    }, [articles]);

    if (articles === undefined || stats === null) {
        return (
            <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
                <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Skeleton className="h-96" />
                    <Skeleton className="h-96" />
                </div>
            </main>
        );
    }

    const statusChartConfig = {
        count: {
            label: 'Articles',
        },
    } satisfies ChartConfig;

    const scoreChartConfig = {
        count: {
            label: 'Articles',
        },
    } satisfies ChartConfig;

    const timeChartConfig = {
        completed: {
            label: 'Completed',
            color: 'var(--chart-1)',
        },
        total: {
            label: 'Total',
            color: 'var(--chart-2)',
        },
    } satisfies ChartConfig;

    return (
        <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
                <Badge variant="outline" className="shrink-0">
                    {stats.total} total articles
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Total Articles</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {stats.total}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconArticle className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {stats.articlesFromLastScan} from last scan
                        </div>
                        <div className="text-muted-foreground">
                            Scanned from RSS feeds
                        </div>
                    </CardFooter>
                </Card>

                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Completed Articles</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {stats.completed}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                {stats.completionRate > 50 ? (
                                    <IconTrendingUp className="size-4" />
                                ) : (
                                    <IconTrendingDown className="size-4" />
                                )}
                                {stats.completionRate.toFixed(1)}%
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            <IconCheck className="size-4" />
                            {stats.completionRate.toFixed(1)}% completion rate
                        </div>
                        <div className="text-muted-foreground">
                            Successfully processed articles
                        </div>
                    </CardFooter>
                </Card>

                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Average Score</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {stats.avgScore > 0 ? stats.avgScore.toFixed(2) : '—'}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconStar className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            {stats.avgScore >= 7 ? (
                                <>
                                    Excellent performance <IconTrendingUp className="size-4" />
                                </>
                            ) : stats.avgScore >= 5 ? (
                                <>Good quality articles</>
                            ) : (
                                <>Needs improvement</>
                            )}
                        </div>
                        <div className="text-muted-foreground">
                            Across all completed articles
                        </div>
                    </CardFooter>
                </Card>

                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>High-Score Articles</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {stats.highScoreArticles}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconFlame className="size-4" />
                                {stats.completed > 0
                                    ? ((stats.highScoreArticles / stats.completed) * 100).toFixed(0)
                                    : 0}
                                %
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            Articles with score ≥ 7.0
                        </div>
                        <div className="text-muted-foreground">
                            Top quality content
                        </div>
                    </CardFooter>
                </Card>

                <Card className="@container/card">
                    <CardHeader>
                        <CardDescription>Sent to Slack</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                            {stats.slackNotified}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconBrandSlack className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardFooter className="flex-col items-start gap-1.5 text-sm">
                        <div className="line-clamp-1 flex gap-2 font-medium">
                            Recommended articles
                        </div>
                        <div className="text-muted-foreground">
                            Shared via Slack notifications
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Articles by Status */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardTitle>Articles by Status</CardTitle>
                        <CardDescription>Distribution of article processing states</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={statusChartConfig} className="h-[300px] w-full">
                            <BarChart data={statusChartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="status"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="count" radius={8} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Score Distribution */}
                <Card className="@container/card">
                    <CardHeader>
                        <CardTitle>Score Distribution</CardTitle>
                        <CardDescription>Articles grouped by quality score ranges</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={scoreChartConfig} className="h-[300px] w-full">
                            <BarChart data={scoreDistributionData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="range"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="count" radius={8} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Articles Over Time */}
                {articlesOverTimeData.length > 0 && (
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Articles Over Time</CardTitle>
                            <CardDescription>Article activity for the last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={timeChartConfig} className="h-[300px] w-full">
                                <AreaChart data={articlesOverTimeData}>
                                    <defs>
                                        <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-completed)"
                                                stopOpacity={1.0}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-completed)"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                        <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-total)"
                                                stopOpacity={0.8}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-total)"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        minTickGap={32}
                                        tickFormatter={(value) => {
                                            const date = new Date(value);
                                            return date.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            });
                                        }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={
                                            <ChartTooltipContent
                                                labelFormatter={(value) => {
                                                    return new Date(value).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    });
                                                }}
                                                indicator="dot"
                                            />
                                        }
                                    />
                                    <Area
                                        dataKey="total"
                                        type="linear"
                                        fill="url(#fillTotal)"
                                        stroke="var(--color-total)"
                                        stackId="a"
                                    />
                                    <Area
                                        dataKey="completed"
                                        type="linear"
                                        fill="url(#fillCompleted)"
                                        stroke="var(--color-completed)"
                                        stackId="a"
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Top Articles */}
            {topArticles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Top Scoring Articles</CardTitle>
                        <CardDescription>Highest quality articles based on average score</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {topArticles.map((article) => (
                                <TopArticleRow key={article._id} article={article} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}

function TopArticleRow({ article }: { article: Article & { avgScore: number } }) {
    const getScoreColor = (score: number) => {
        if (score >= 7) return 'text-green-500';
        if (score >= 5) return 'text-yellow-500';
        return 'text-red-500';
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
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
            {/* Score badge */}
            <div className="shrink-0 w-12 text-center">
                <span className={`text-lg font-bold ${getScoreColor(article.avgScore)}`}>
                    {article.avgScore.toFixed(1)}
                </span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {article.title}
                </h3>
                <div className="hidden sm:flex gap-3 mt-1 text-xs text-muted-foreground">
                    <ScoreChip icon={IconFlame} value={article.score!.relevance} />
                    <ScoreChip icon={IconSparkles} value={article.score!.uniqueness} />
                    <ScoreChip icon={IconUsers} value={article.score!.engagement} />
                    <ScoreChip icon={IconShieldCheck} value={article.score!.credibility} />
                </div>
            </div>

            {/* Meta info */}
            <div className="shrink-0 flex items-center gap-2">
                <span className="hidden sm:flex text-xs text-muted-foreground items-center gap-1">
                    <IconClock className="size-3" />
                    {formatDate(article.publishedAt)}
                </span>
                <Button variant="ghost" size="icon" className="size-8" asChild>
                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                        <IconExternalLink className="size-4" />
                    </a>
                </Button>
            </div>
        </div>
    );
}

function ScoreChip({ icon: Icon, value }: { icon: typeof IconFlame; value: number }) {
    const getColor = (score: number) => {
        if (score >= 7) return 'text-green-500';
        if (score >= 5) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <span className="flex items-center gap-0.5">
            <Icon className="size-3" />
            <span className={getColor(value)}>{value}</span>
        </span>
    );
}
