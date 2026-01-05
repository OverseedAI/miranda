'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import Parser from 'rss-parser';

const parser = new Parser();

export type FeedArticle = {
    title: string;
    link: string;
    pubDate?: string;
    author?: string;
    contentSnippet?: string;
    content?: string;
};

export type FeedData = {
    title: string;
    description?: string;
    link?: string;
    articles: FeedArticle[];
};

/**
 * Fetches and parses an RSS feed for preview purposes.
 * Returns formatted feed data with article list.
 */
export const fetchFeedPreview = action({
    args: {
        xmlUrl: v.string(),
    },
    returns: v.object({
        success: v.boolean(),
        error: v.optional(v.string()),
        feed: v.optional(
            v.object({
                title: v.string(),
                description: v.optional(v.string()),
                link: v.optional(v.string()),
                articles: v.array(
                    v.object({
                        title: v.string(),
                        link: v.string(),
                        pubDate: v.optional(v.string()),
                        author: v.optional(v.string()),
                        contentSnippet: v.optional(v.string()),
                        content: v.optional(v.string()),
                    })
                ),
            })
        ),
    }),
    handler: async (ctx, args) => {
        try {
            const feedData = await parser.parseURL(args.xmlUrl);

            const articles: FeedArticle[] = feedData.items.map((item) => ({
                title: item.title || 'No title',
                link: item.link || '',
                pubDate: item.pubDate,
                author: item.author || item.creator,
                contentSnippet: item.contentSnippet,
                content: item.content,
            }));

            return {
                success: true,
                feed: {
                    title: feedData.title || 'Untitled Feed',
                    description: feedData.description,
                    link: feedData.link,
                    articles,
                },
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    },
});
