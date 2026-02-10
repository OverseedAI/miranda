import { createFileRoute } from '@tanstack/react-router';
import { api } from '@/convex/_generated/api';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { IconClockHour4, IconBrandSlack, IconRefresh, IconSend, IconCheck, IconX, IconSparkles } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/app/settings')({
    component: RouteComponent,
});

type AnalyzerPromptConfig = {
    version: number;
    focusAreas: string[];
    recommendationGuidelines: string[];
    styleNotes: string;
};

const DEFAULT_ANALYZER_PROMPT_CONFIG: AnalyzerPromptConfig = {
    version: 1,
    focusAreas: [
        'AI coding tools and workflows',
        'Major model releases and updates',
        'Best practices for AI-assisted development',
        'AI impact on software jobs and economics',
        'AI infrastructure and compute economics',
        'Agentic AI systems for software engineering',
        'Practical build tutorials for developers',
    ],
    recommendationGuidelines: [
        'highly_recommended: major breaking updates or highly actionable content',
        'recommended: useful updates, strong trends, or quality tutorial content',
        'maybe: partially relevant or already saturated angle',
        'not_recommended: off-topic or low relevance for AI software development',
    ],
    styleNotes:
        'Prioritize practical insights for software engineers and specific implications for building products.',
};

function parseMultilineList(value: string): string[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function normalizeAnalyzerPromptConfig(value: unknown): AnalyzerPromptConfig {
    if (!value || typeof value !== 'object') {
        return DEFAULT_ANALYZER_PROMPT_CONFIG;
    }

    const config = value as Partial<AnalyzerPromptConfig>;
    const parsedVersion = Number(config.version);
    const version =
        Number.isInteger(parsedVersion) && parsedVersion > 0
            ? parsedVersion
            : DEFAULT_ANALYZER_PROMPT_CONFIG.version;

    const focusAreas =
        Array.isArray(config.focusAreas) && config.focusAreas.length > 0
            ? config.focusAreas.filter((line): line is string => typeof line === 'string')
            : DEFAULT_ANALYZER_PROMPT_CONFIG.focusAreas;
    const recommendationGuidelines =
        Array.isArray(config.recommendationGuidelines) &&
        config.recommendationGuidelines.length > 0
            ? config.recommendationGuidelines.filter(
                  (line): line is string => typeof line === 'string'
              )
            : DEFAULT_ANALYZER_PROMPT_CONFIG.recommendationGuidelines;
    const styleNotes =
        typeof config.styleNotes === 'string' && config.styleNotes.trim().length > 0
            ? config.styleNotes
            : DEFAULT_ANALYZER_PROMPT_CONFIG.styleNotes;

    return {
        version,
        focusAreas,
        recommendationGuidelines,
        styleNotes,
    };
}

// Setting keys
const SETTINGS_KEYS = [
    'autoScan.enabled',
    'autoScan.intervalMinutes',
    'autoScan.daysBack',
    'autoScan.parallelism',
    'autoScan.filterTags',
    'slack.enabled',
    'slack.channelId',
    'slack.notifyIntervalMinutes',
    'slack.topArticleCount',
    'aiAnalyzer.promptConfig',
] as const;

// Default values
const DEFAULTS: Record<string, unknown> = {
    'autoScan.enabled': false,
    'autoScan.intervalMinutes': 240,
    'autoScan.daysBack': 7,
    'autoScan.parallelism': 3,
    'autoScan.filterTags': [],
    'slack.enabled': false,
    'slack.channelId': '',
    'slack.notifyIntervalMinutes': 60,
    'slack.topArticleCount': 5,
    'aiAnalyzer.promptConfig': DEFAULT_ANALYZER_PROMPT_CONFIG,
};

function RouteComponent() {
    const settings = useQuery(api.services.settings.getSettings, { keys: [...SETTINGS_KEYS] });
    const allTags = useQuery(api.services.rss.getAllTags);
    const setSetting = useMutation(api.services.settings.setSetting);
    const listChannels = useAction(api.node.slackService.listChannels);
    const sendTestMessage = useAction(api.node.slackService.sendTestMessage);

    const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
    const [channelsLoading, setChannelsLoading] = useState(false);
    const [channelsError, setChannelsError] = useState<string | null>(null);
    const [slackConnected, setSlackConnected] = useState<boolean | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [testError, setTestError] = useState<string | null>(null);

    const getValue = <T,>(key: string): T => {
        if (!settings) return DEFAULTS[key] as T;
        return (settings[key] ?? DEFAULTS[key]) as T;
    };

    const promptConfig = normalizeAnalyzerPromptConfig(getValue<unknown>('aiAnalyzer.promptConfig'));

    const handleChange = async (key: string, value: unknown) => {
        await setSetting({ key, value });
    };

    const updatePromptConfig = async (patch: Partial<AnalyzerPromptConfig>) => {
        await handleChange('aiAnalyzer.promptConfig', {
            ...promptConfig,
            ...patch,
        });
    };

    const resetPromptConfig = async () => {
        await handleChange('aiAnalyzer.promptConfig', DEFAULT_ANALYZER_PROMPT_CONFIG);
    };

    const fetchChannels = async () => {
        setChannelsLoading(true);
        setChannelsError(null);
        try {
            const result = await listChannels();
            if (result.ok && result.channels) {
                setChannels(result.channels);
                setSlackConnected(true);
            } else {
                setChannelsError(result.error ?? 'Failed to fetch channels');
                setSlackConnected(false);
            }
        } catch {
            setChannelsError('Failed to fetch channels');
            setSlackConnected(false);
        } finally {
            setChannelsLoading(false);
        }
    };

    const toggleFilterTag = (tag: string) => {
        const currentTags = getValue<string[]>('autoScan.filterTags');
        const newTags = currentTags.includes(tag)
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag];
        handleChange('autoScan.filterTags', newTags);
    };

    const handleTestMessage = async () => {
        const channelId = getValue<string>('slack.channelId');
        if (!channelId) return;

        setTestStatus('sending');
        setTestError(null);
        try {
            const result = await sendTestMessage({ channelId });
            if (result.ok) {
                setTestStatus('success');
                setTimeout(() => setTestStatus('idle'), 3000);
            } else {
                setTestStatus('error');
                setTestError(result.error ?? 'Failed to send test message');
            }
        } catch {
            setTestStatus('error');
            setTestError('Failed to send test message');
        }
    };

    // Fetch channels on mount
    useEffect(() => {
        fetchChannels();
    }, []);

    if (settings === undefined) {
        return (
            <div className="p-6 max-w-3xl">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>
                <div className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            <div className="space-y-6">
                {/* Auto-Scan Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
                                <IconClockHour4 className="size-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle>Auto-Scan</CardTitle>
                                <CardDescription>
                                    Automatically scan RSS feeds on a schedule
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="autoScan.enabled">Enable Auto-Scanning</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically scan feeds at the configured interval
                                </p>
                            </div>
                            <Switch
                                id="autoScan.enabled"
                                checked={getValue<boolean>('autoScan.enabled')}
                                onCheckedChange={(checked) =>
                                    handleChange('autoScan.enabled', checked)
                                }
                            />
                        </div>

                        {/* Interval */}
                        <div className="grid gap-2">
                            <Label htmlFor="autoScan.intervalMinutes">Scan Interval</Label>
                            <Select
                                value={String(getValue<number>('autoScan.intervalMinutes'))}
                                onValueChange={(value) =>
                                    handleChange('autoScan.intervalMinutes', Number(value))
                                }
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="60">Every 1 hour</SelectItem>
                                    <SelectItem value="120">Every 2 hours</SelectItem>
                                    <SelectItem value="240">Every 4 hours</SelectItem>
                                    <SelectItem value="480">Every 8 hours</SelectItem>
                                    <SelectItem value="1440">Every 24 hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Feed Coverage</Label>
                            <p className="text-sm text-muted-foreground">
                                Every auto-scan run processes all feeds (or all selected tags if
                                tag filters are enabled).
                            </p>
                        </div>

                        {/* Days Back */}
                        <div className="grid gap-2">
                            <Label htmlFor="autoScan.daysBack">Days to Look Back</Label>
                            <Input
                                id="autoScan.daysBack"
                                type="number"
                                min={1}
                                max={30}
                                className="w-24"
                                value={getValue<number>('autoScan.daysBack')}
                                onChange={(e) =>
                                    handleChange('autoScan.daysBack', Number(e.target.value) || 7)
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                Only fetch articles published within this many days
                            </p>
                        </div>

                        {/* Parallelism */}
                        <div className="grid gap-2">
                            <Label htmlFor="autoScan.parallelism">Parallel Processors</Label>
                            <Input
                                id="autoScan.parallelism"
                                type="number"
                                min={1}
                                max={10}
                                className="w-24"
                                value={getValue<number>('autoScan.parallelism')}
                                onChange={(e) =>
                                    handleChange('autoScan.parallelism', Number(e.target.value) || 3)
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                Number of articles to process in parallel
                            </p>
                        </div>

                        {/* Tag Filter */}
                        <div className="grid gap-2">
                            <Label>Filter by Tags</Label>
                            {allTags && allTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {allTags.map((tag: string) => {
                                        const isSelected = getValue<string[]>('autoScan.filterTags').includes(tag);
                                        return (
                                            <Badge
                                                key={tag}
                                                variant={isSelected ? 'default' : 'outline'}
                                                className="cursor-pointer"
                                                onClick={() => toggleFilterTag(tag)}
                                            >
                                                {tag}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No tags available. Add tags to RSS feeds first.
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                {getValue<string[]>('autoScan.filterTags').length === 0
                                    ? 'All feeds will be scanned'
                                    : 'Only feeds with selected tags will be scanned'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                <IconSparkles className="size-5 text-emerald-500" />
                            </div>
                            <div>
                                <CardTitle>AI Analyzer Prompt</CardTitle>
                                <CardDescription>
                                    Adjust analysis focus while keeping strict structured output
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="aiAnalyzer.promptVersion">Prompt Version</Label>
                            <Input
                                id="aiAnalyzer.promptVersion"
                                type="number"
                                min={1}
                                className="w-24"
                                value={promptConfig.version}
                                onChange={(e) =>
                                    updatePromptConfig({
                                        version: Math.max(1, Number(e.target.value) || 1),
                                    })
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                Stored on analyzed articles for traceability.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="aiAnalyzer.focusAreas">Focus Areas</Label>
                            <Textarea
                                id="aiAnalyzer.focusAreas"
                                rows={6}
                                value={promptConfig.focusAreas.join('\n')}
                                onChange={(e) =>
                                    updatePromptConfig({
                                        focusAreas: parseMultilineList(e.target.value),
                                    })
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                One focus area per line.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="aiAnalyzer.recommendationGuidelines">
                                Recommendation Rubric
                            </Label>
                            <Textarea
                                id="aiAnalyzer.recommendationGuidelines"
                                rows={6}
                                value={promptConfig.recommendationGuidelines.join('\n')}
                                onChange={(e) =>
                                    updatePromptConfig({
                                        recommendationGuidelines: parseMultilineList(
                                            e.target.value
                                        ),
                                    })
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                One rubric rule per line.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="aiAnalyzer.styleNotes">Style Notes</Label>
                            <Textarea
                                id="aiAnalyzer.styleNotes"
                                rows={4}
                                value={promptConfig.styleNotes}
                                onChange={(e) =>
                                    updatePromptConfig({
                                        styleNotes: e.target.value,
                                    })
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                Extra guidance for tone and framing.
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="outline" onClick={resetPromptConfig}>
                                Reset to Default
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Slack Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center">
                                <IconBrandSlack className="size-5 text-purple-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <CardTitle>Slack Integration</CardTitle>
                                    {slackConnected === true && (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                            <IconCheck className="size-3 mr-1" />
                                            Connected
                                        </Badge>
                                    )}
                                    {slackConnected === false && (
                                        <Badge variant="outline" className="text-red-600 border-red-600">
                                            <IconX className="size-3 mr-1" />
                                            Not Connected
                                        </Badge>
                                    )}
                                    {slackConnected === null && channelsLoading && (
                                        <Badge variant="outline" className="text-muted-foreground">
                                            Checking...
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>
                                    Send notifications for top recommended articles
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Enable Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="slack.enabled">Enable Slack Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Send digests of recommended articles to Slack
                                </p>
                            </div>
                            <Switch
                                id="slack.enabled"
                                checked={getValue<boolean>('slack.enabled')}
                                onCheckedChange={(checked) =>
                                    handleChange('slack.enabled', checked)
                                }
                            />
                        </div>

                        {/* Channel Selection */}
                        <div className="grid gap-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="slack.channelId">Channel</Label>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={fetchChannels}
                                    disabled={channelsLoading}
                                >
                                    <IconRefresh className={`size-3 ${channelsLoading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            {channelsError ? (
                                <div className="space-y-2">
                                    <Badge variant="destructive" className="text-xs">
                                        {channelsError}
                                    </Badge>
                                    <Input
                                        id="slack.channelId"
                                        placeholder="C0123456789"
                                        className="w-48"
                                        value={getValue<string>('slack.channelId')}
                                        onChange={(e) => handleChange('slack.channelId', e.target.value)}
                                    />
                                </div>
                            ) : channels.length > 0 ? (
                                <Select
                                    value={getValue<string>('slack.channelId')}
                                    onValueChange={(value) => handleChange('slack.channelId', value)}
                                >
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Select a channel" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {channels.map((channel) => (
                                            <SelectItem key={channel.id} value={channel.id}>
                                                #{channel.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="slack.channelId"
                                    placeholder="C0123456789"
                                    className="w-48"
                                    value={getValue<string>('slack.channelId')}
                                    onChange={(e) => handleChange('slack.channelId', e.target.value)}
                                />
                            )}
                            <p className="text-sm text-muted-foreground">
                                The Slack channel to post notifications to
                            </p>
                        </div>

                        {/* Test Message */}
                        <div className="grid gap-2">
                            <Label>Test Connection</Label>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestMessage}
                                    disabled={!getValue<string>('slack.channelId') || testStatus === 'sending'}
                                >
                                    <IconSend className="size-4 mr-2" />
                                    {testStatus === 'sending' ? 'Sending...' : 'Send Test Message'}
                                </Button>
                                {testStatus === 'success' && (
                                    <Badge variant="default" className="bg-green-500">
                                        Sent!
                                    </Badge>
                                )}
                                {testStatus === 'error' && (
                                    <Badge variant="destructive">{testError}</Badge>
                                )}
                            </div>
                        </div>

                        {/* Notification Interval */}
                        <div className="grid gap-2">
                            <Label htmlFor="slack.notifyIntervalMinutes">Notification Interval</Label>
                            <Select
                                value={String(getValue<number>('slack.notifyIntervalMinutes'))}
                                onValueChange={(value) =>
                                    handleChange('slack.notifyIntervalMinutes', Number(value))
                                }
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">Every 15 minutes</SelectItem>
                                    <SelectItem value="30">Every 30 minutes</SelectItem>
                                    <SelectItem value="60">Every 1 hour</SelectItem>
                                    <SelectItem value="120">Every 2 hours</SelectItem>
                                    <SelectItem value="240">Every 4 hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Articles per Digest */}
                        <div className="grid gap-2">
                            <Label htmlFor="slack.topArticleCount">Articles per Digest</Label>
                            <Input
                                id="slack.topArticleCount"
                                type="number"
                                min={1}
                                max={20}
                                className="w-24"
                                value={getValue<number>('slack.topArticleCount')}
                                onChange={(e) =>
                                    handleChange(
                                        'slack.topArticleCount',
                                        Number(e.target.value) || 5
                                    )
                                }
                            />
                            <p className="text-sm text-muted-foreground">
                                Maximum articles to include in each Slack digest
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
