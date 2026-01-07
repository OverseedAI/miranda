import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import type { Id } from '@/convex/_generated/dataModel';

type RssFeed = {
    _id: Id<'rss'>;
    name: string;
    type: string;
    htmlUrl: string;
    xmlUrl: string;
    tags?: string[];
};

type RssModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editFeed?: RssFeed | null;
};

export function RssModal({ open, onOpenChange, editFeed }: RssModalProps) {
    const createRss = useMutation(api.services.rss.createRss);
    const updateRss = useMutation(api.services.rss.updateRss);
    const bulkCreateRss = useMutation(api.services.rss.bulkCreateRss);
    const allTags = useQuery(api.services.rss.getAllTags);

    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Single feed form state
    const [name, setName] = useState('');
    const [xmlUrl, setXmlUrl] = useState('');
    const [htmlUrl, setHtmlUrl] = useState('');
    const [type, setType] = useState('rss');
    const [tags, setTags] = useState<string[]>([]);

    // Bulk import state
    const [bulkText, setBulkText] = useState('');
    const [bulkError, setBulkError] = useState<string | null>(null);

    const isEditing = !!editFeed;

    // Reset form when modal opens/closes or edit feed changes
    useEffect(() => {
        if (open) {
            if (editFeed) {
                setName(editFeed.name);
                setXmlUrl(editFeed.xmlUrl);
                setHtmlUrl(editFeed.htmlUrl);
                setType(editFeed.type);
                setTags(editFeed.tags ?? []);
                setActiveTab('single');
            } else {
                setName('');
                setXmlUrl('');
                setHtmlUrl('');
                setType('rss');
                setTags([]);
                setBulkText('');
                setBulkError(null);
            }
        }
    }, [open, editFeed]);

    const handleSingleSubmit = async () => {
        if (!name.trim() || !xmlUrl.trim()) return;

        setIsSubmitting(true);
        try {
            if (isEditing && editFeed) {
                await updateRss({
                    id: editFeed._id,
                    name: name.trim(),
                    xmlUrl: xmlUrl.trim(),
                    htmlUrl: htmlUrl.trim() || xmlUrl.trim(),
                    type,
                    tags: tags.length > 0 ? tags : undefined,
                });
            } else {
                await createRss({
                    name: name.trim(),
                    xmlUrl: xmlUrl.trim(),
                    htmlUrl: htmlUrl.trim() || xmlUrl.trim(),
                    type,
                    tags: tags.length > 0 ? tags : undefined,
                });
            }
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const parseBulkFeeds = (text: string) => {
        const lines = text.split('\n').filter((line) => line.trim());
        const feeds: { name: string; xmlUrl: string; htmlUrl: string; type: string }[] = [];
        const errors: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Support formats:
            // 1. Just URL: https://example.com/feed.xml
            // 2. Name, URL: My Feed, https://example.com/feed.xml
            // 3. Name, XML URL, HTML URL: My Feed, https://example.com/feed.xml, https://example.com

            const parts = line.split(',').map((p) => p.trim());

            if (parts.length === 1) {
                // Just URL - extract name from URL
                const url = parts[0];
                if (!url.startsWith('http')) {
                    errors.push(`Line ${i + 1}: Invalid URL "${url}"`);
                    continue;
                }
                const urlName = new URL(url).hostname.replace('www.', '');
                feeds.push({ name: urlName, xmlUrl: url, htmlUrl: url, type: 'rss' });
            } else if (parts.length === 2) {
                // Name, URL
                const [feedName, url] = parts;
                if (!url.startsWith('http')) {
                    errors.push(`Line ${i + 1}: Invalid URL "${url}"`);
                    continue;
                }
                feeds.push({ name: feedName, xmlUrl: url, htmlUrl: url, type: 'rss' });
            } else if (parts.length >= 3) {
                // Name, XML URL, HTML URL
                const [feedName, xmlUrlPart, htmlUrlPart] = parts;
                if (!xmlUrlPart.startsWith('http')) {
                    errors.push(`Line ${i + 1}: Invalid XML URL "${xmlUrlPart}"`);
                    continue;
                }
                feeds.push({
                    name: feedName,
                    xmlUrl: xmlUrlPart,
                    htmlUrl: htmlUrlPart.startsWith('http') ? htmlUrlPart : xmlUrlPart,
                    type: 'rss',
                });
            }
        }

        return { feeds, errors };
    };

    const handleBulkSubmit = async () => {
        if (!bulkText.trim()) return;

        const { feeds, errors } = parseBulkFeeds(bulkText);

        if (errors.length > 0) {
            setBulkError(errors.join('\n'));
            return;
        }

        if (feeds.length === 0) {
            setBulkError('No valid feeds found');
            return;
        }

        setIsSubmitting(true);
        setBulkError(null);

        try {
            const ids = await bulkCreateRss({ feeds });
            const skipped = feeds.length - ids.length;
            if (skipped > 0) {
                setBulkError(`Added ${ids.length} feeds. ${skipped} were skipped (already exist).`);
            }
            if (ids.length > 0) {
                onOpenChange(false);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmitSingle = name.trim() && xmlUrl.trim();
    const canSubmitBulk = bulkText.trim();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit RSS Feed' : 'Add RSS Feed'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the RSS feed details below.'
                            : 'Add a single feed or import multiple feeds at once.'}
                    </DialogDescription>
                </DialogHeader>

                {isEditing ? (
                    <SingleFeedForm
                        name={name}
                        setName={setName}
                        xmlUrl={xmlUrl}
                        setXmlUrl={setXmlUrl}
                        htmlUrl={htmlUrl}
                        setHtmlUrl={setHtmlUrl}
                        type={type}
                        setType={setType}
                        tags={tags}
                        setTags={setTags}
                        allTags={allTags ?? []}
                    />
                ) : (
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'bulk')}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">Single Feed</TabsTrigger>
                            <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
                        </TabsList>
                        <TabsContent value="single" className="mt-4">
                            <SingleFeedForm
                                name={name}
                                setName={setName}
                                xmlUrl={xmlUrl}
                                setXmlUrl={setXmlUrl}
                                htmlUrl={htmlUrl}
                                setHtmlUrl={setHtmlUrl}
                                type={type}
                                setType={setType}
                                tags={tags}
                                setTags={setTags}
                                allTags={allTags ?? []}
                            />
                        </TabsContent>
                        <TabsContent value="bulk" className="mt-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bulk">Feed URLs</Label>
                                    <Textarea
                                        id="bulk"
                                        placeholder={`Enter one feed per line:\nhttps://example.com/feed.xml\nMy Blog, https://blog.example.com/rss\nNews Site, https://news.com/feed, https://news.com`}
                                        value={bulkText}
                                        onChange={(e) => {
                                            setBulkText(e.target.value);
                                            setBulkError(null);
                                        }}
                                        rows={8}
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Formats: URL only, or Name, URL, or Name, XML URL, HTML URL
                                    </p>
                                </div>
                                {bulkError && (
                                    <p className="text-sm text-destructive whitespace-pre-wrap">{bulkError}</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    {activeTab === 'single' || isEditing ? (
                        <Button onClick={handleSingleSubmit} disabled={!canSubmitSingle || isSubmitting}>
                            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Feed'}
                        </Button>
                    ) : (
                        <Button onClick={handleBulkSubmit} disabled={!canSubmitBulk || isSubmitting}>
                            {isSubmitting ? 'Importing...' : 'Import Feeds'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SingleFeedForm({
    name,
    setName,
    xmlUrl,
    setXmlUrl,
    htmlUrl,
    setHtmlUrl,
    type,
    setType,
    tags,
    setTags,
    allTags,
}: {
    name: string;
    setName: (v: string) => void;
    xmlUrl: string;
    setXmlUrl: (v: string) => void;
    htmlUrl: string;
    setHtmlUrl: (v: string) => void;
    type: string;
    setType: (v: string) => void;
    tags: string[];
    setTags: (v: string[]) => void;
    allTags: string[];
}) {
    const [tagInput, setTagInput] = useState('');

    const handleAddTag = (tag: string) => {
        const trimmed = tag.trim().toLowerCase();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag(tagInput);
        }
    };

    // Filter suggestions to tags not already selected
    const suggestions = allTags.filter((t) => !tags.includes(t) && t.includes(tagInput.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                    id="name"
                    placeholder="My Favorite Blog"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="xmlUrl">Feed URL (XML) *</Label>
                <Input
                    id="xmlUrl"
                    placeholder="https://example.com/feed.xml"
                    value={xmlUrl}
                    onChange={(e) => setXmlUrl(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="htmlUrl">Website URL</Label>
                <Input
                    id="htmlUrl"
                    placeholder="https://example.com (optional)"
                    value={htmlUrl}
                    onChange={(e) => setHtmlUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Leave empty to use the feed URL
                </p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="type">Feed Type</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="rss">RSS</SelectItem>
                        <SelectItem value="atom">Atom</SelectItem>
                        <SelectItem value="json">JSON Feed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-0.5 hover:text-destructive"
                                >
                                    <IconX className="size-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                <Input
                    id="tags"
                    placeholder="Add tags (press Enter or comma)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => tagInput.trim() && handleAddTag(tagInput)}
                />
                {suggestions.length > 0 && tagInput && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {suggestions.slice(0, 5).map((tag) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="cursor-pointer hover:bg-accent"
                                onClick={() => handleAddTag(tag)}
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
                {allTags.length > 0 && !tagInput && (
                    <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1.5">Existing tags:</p>
                        <div className="flex flex-wrap gap-1">
                            {allTags.filter((t) => !tags.includes(t)).map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-accent text-xs"
                                    onClick={() => handleAddTag(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Tags help organize and filter feeds
                </p>
            </div>
        </div>
    );
}
