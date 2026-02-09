import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';
import { api } from '@/convex/_generated/api';
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    IconArrowDownRight,
    IconArrowUpRight,
    IconBolt,
    IconChartBar,
} from '@tabler/icons-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

export const Route = createFileRoute('/app/usage')({
    component: UsageRoute,
});

const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact' });

const formatNumber = (value: number) => numberFormatter.format(value);
const formatCompact = (value: number) => compactFormatter.format(value);

function UsageRoute() {
    const usage = useQuery(api.services.usage.getUsageSummary, { days: 30, recentLimit: 15 });

    const chartData = useMemo(() => {
        if (!usage) return [];

        const byDay = new Map(usage.byDay.map((item) => [item.date, item]));
        const days = usage.windowDays;
        const data = [] as {
            date: string;
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            requests: number;
        }[];

        for (let offset = days - 1; offset >= 0; offset -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            const key = date.toISOString().split('T')[0];
            const entry = byDay.get(key);
            data.push({
                date: key,
                promptTokens: entry?.promptTokens ?? 0,
                completionTokens: entry?.completionTokens ?? 0,
                totalTokens: entry?.totalTokens ?? 0,
                requests: entry?.requests ?? 0,
            });
        }

        return data;
    }, [usage]);

    if (usage === undefined) {
        return (
            <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
                <h1 className="text-2xl sm:text-3xl font-bold">API Usage</h1>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((item) => (
                        <Skeleton key={item} className="h-32" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Skeleton className="h-96 lg:col-span-2" />
                    <Skeleton className="h-96" />
                </div>
                <Skeleton className="h-96" />
            </main>
        );
    }

    const chartConfig = {
        promptTokens: {
            label: 'Prompt tokens',
            color: 'var(--chart-1)',
        },
        completionTokens: {
            label: 'Completion tokens',
            color: 'var(--chart-2)',
        },
    } satisfies ChartConfig;

    return (
        <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">API Usage</h1>
                    <p className="text-sm text-muted-foreground">
                        Token usage across all AI requests
                    </p>
                </div>
                <Badge variant="outline">Last {usage.windowDays} days</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader>
                        <CardDescription>Total tokens</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCompact(usage.totals.totalTokens)}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconBolt className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {formatNumber(usage.totals.totalTokens)} tokens processed
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription>Prompt tokens</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCompact(usage.totals.promptTokens)}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconArrowUpRight className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {formatNumber(usage.totals.promptTokens)} tokens sent
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription>Completion tokens</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCompact(usage.totals.completionTokens)}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconArrowDownRight className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {formatNumber(usage.totals.completionTokens)} tokens generated
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription>Requests</CardDescription>
                        <CardTitle className="text-2xl">
                            {formatCompact(usage.totals.requests)}
                        </CardTitle>
                        <CardAction>
                            <Badge variant="outline">
                                <IconChartBar className="size-4" />
                            </Badge>
                        </CardAction>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        {formatNumber(usage.totals.requests)} total calls
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Tokens over time</CardTitle>
                        <CardDescription>Prompt vs completion tokens</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient
                                        id="fillPromptTokens"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="var(--color-promptTokens)"
                                            stopOpacity={0.9}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--color-promptTokens)"
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                    <linearGradient
                                        id="fillCompletionTokens"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor="var(--color-completionTokens)"
                                            stopOpacity={0.9}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor="var(--color-completionTokens)"
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
                                    tickFormatter={(value) =>
                                        new Date(value).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                        })
                                    }
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => formatCompact(value)}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            indicator="dot"
                                            labelFormatter={(value) =>
                                                new Date(value).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })
                                            }
                                        />
                                    }
                                />
                                <Area
                                    dataKey="promptTokens"
                                    type="linear"
                                    fill="url(#fillPromptTokens)"
                                    stroke="var(--color-promptTokens)"
                                    stackId="a"
                                />
                                <Area
                                    dataKey="completionTokens"
                                    type="linear"
                                    fill="url(#fillCompletionTokens)"
                                    stroke="var(--color-completionTokens)"
                                    stackId="a"
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>By model</CardTitle>
                        <CardDescription>Usage totals per model</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {usage.byModel.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No usage yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Model</TableHead>
                                        <TableHead className="text-right">Tokens</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usage.byModel.map((model) => (
                                        <TableRow key={`${model.provider}-${model.model}`}>
                                            <TableCell>
                                                <div className="font-medium">{model.model}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {model.provider}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-medium">
                                                    {formatCompact(model.totalTokens)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatNumber(model.requests)} calls
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent requests</CardTitle>
                    <CardDescription>Latest token usage entries</CardDescription>
                </CardHeader>
                <CardContent>
                    {usage.recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No usage yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead className="text-right">Tokens</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usage.recent.map((entry) => (
                                    <TableRow key={entry._id}>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(entry._creationTime).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            {entry.agentName ?? 'Unknown'}
                                        </TableCell>
                                        <TableCell>
                                            {entry.model}
                                            <div className="text-xs text-muted-foreground">
                                                {entry.provider}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-medium">
                                                {formatNumber(entry.totalTokens)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatNumber(entry.promptTokens)} in /{' '}
                                                {formatNumber(entry.completionTokens)} out
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
