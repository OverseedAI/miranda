'use node';

import { internalAction, action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { WebClient } from '@slack/web-api';
import type { Doc } from '../_generated/dataModel';

type CheckResult =
    | { sent: false; reason: string }
    | { sent: true; articleCount: number; channelId: string };

/**
 * Gets the Slack WebClient instance.
 * Requires SLACK_BOT_TOKEN environment variable.
 */
function getSlackClient(): WebClient | null {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
        return null;
    }
    return new WebClient(token);
}

/**
 * Lists available Slack channels for the settings UI.
 */
export const listChannels = action({
    args: {},
    handler: async (): Promise<{ ok: boolean; channels?: { id: string; name: string }[]; error?: string }> => {
        const client = getSlackClient();
        if (!client) {
            return { ok: false, error: 'Slack bot token not configured' };
        }

        try {
            const result = await client.conversations.list({
                types: 'public_channel,private_channel',
                exclude_archived: true,
                limit: 100,
            });

            const channels = (result.channels ?? [])
                .filter((c): c is { id: string; name: string } => !!c.id && !!c.name)
                .map((c) => ({ id: c.id, name: c.name }));

            return { ok: true, channels };
        } catch (error) {
            return { ok: false, error: (error as Error).message };
        }
    },
});

/**
 * Sends a test message to verify Slack configuration.
 */
export const sendTestMessage = action({
    args: {
        channelId: v.string(),
    },
    handler: async (_, args): Promise<{ ok: boolean; error?: string }> => {
        const client = getSlackClient();
        if (!client) {
            return { ok: false, error: 'Slack bot token not configured' };
        }

        try {
            await client.chat.postMessage({
                channel: args.channelId,
                text: 'Test message from Miranda',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*Test Message*\n\nSlack integration is working correctly!',
                        },
                    },
                ],
            });

            return { ok: true };
        } catch (error) {
            return { ok: false, error: (error as Error).message };
        }
    },
});

/**
 * Formats articles into Slack Block Kit format.
 */
function formatArticlesAsBlocks(articles: Doc<'articles'>[]): object[] {
    const blocks: object[] = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'Top Recommended Articles',
                emoji: true,
            },
        },
        {
            type: 'divider',
        },
    ];

    // Group by recommendation level
    const highlyRecommended = articles.filter((a) => a.recommendation === 'highly_recommended');
    const recommended = articles.filter((a) => a.recommendation === 'recommended');

    if (highlyRecommended.length > 0) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Highly Recommended*',
            },
        });

        for (const article of highlyRecommended) {
            const avgScore = article.score
                ? ((article.score.relevance + article.score.uniqueness + article.score.engagement + article.score.credibility) / 4).toFixed(1)
                : 'N/A';

            const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });

            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*<${article.url}|${article.title}>*\nScore: ${avgScore}/10 | Published: ${publishedDate}${article.summary ? `\n>${article.summary.substring(0, 200)}${article.summary.length > 200 ? '...' : ''}` : ''}${article.videoAngle ? `\n_Video Angle: ${article.videoAngle}_` : ''}`,
                },
            });
        }
    }

    if (recommended.length > 0) {
        if (highlyRecommended.length > 0) {
            blocks.push({ type: 'divider' });
        }

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*Recommended*',
            },
        });

        for (const article of recommended) {
            const avgScore = article.score
                ? ((article.score.relevance + article.score.uniqueness + article.score.engagement + article.score.credibility) / 4).toFixed(1)
                : 'N/A';

            const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });

            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*<${article.url}|${article.title}>*\nScore: ${avgScore}/10 | Published: ${publishedDate}${article.summary ? `\n>${article.summary.substring(0, 150)}${article.summary.length > 150 ? '...' : ''}` : ''}`,
                },
            });
        }
    }

    blocks.push(
        { type: 'divider' },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Sent by Miranda | ${new Date().toLocaleString()}`,
                },
            ],
        }
    );

    return blocks;
}

/**
 * Checks if a Slack digest should be sent and sends it if conditions are met.
 * This is called by a cron job every 5 minutes.
 */
export const checkAndSendDigest = internalAction({
    args: {},
    handler: async (ctx): Promise<CheckResult> => {
        // Check if Slack is enabled
        const enabled = await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'slack.enabled',
        });

        if (!enabled) {
            return { sent: false, reason: 'Slack notifications are disabled' };
        }

        // Check if we have a valid token
        const client = getSlackClient();
        if (!client) {
            return { sent: false, reason: 'Slack bot token not configured' };
        }

        // Get the channel ID
        const channelId = (await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'slack.channelId',
        })) as string | null;

        if (!channelId) {
            return { sent: false, reason: 'No Slack channel configured' };
        }

        // Check if notification interval has elapsed
        const intervalMinutes = ((await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'slack.notifyIntervalMinutes',
        })) as number | null) ?? 60;

        const lastNotifiedAt = (await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'slack.lastNotifiedAt',
        })) as string | null;

        if (lastNotifiedAt) {
            const lastTime = new Date(lastNotifiedAt).getTime();
            const now = Date.now();
            const elapsedMinutes = (now - lastTime) / (1000 * 60);

            if (elapsedMinutes < intervalMinutes) {
                return {
                    sent: false,
                    reason: `Interval not elapsed (${Math.round(elapsedMinutes)}/${intervalMinutes} minutes)`,
                };
            }
        }

        // Get the article count setting
        const topArticleCount = ((await ctx.runQuery(internal.services.settings.getSettingInternal, {
            key: 'slack.topArticleCount',
        })) as number | null) ?? 5;

        // Get unnotified recommended articles
        const articles = await ctx.runQuery(internal.services.articles.getUnnotifiedRecommendedArticles, {
            limit: topArticleCount,
        });

        if (articles.length === 0) {
            return { sent: false, reason: 'No new recommended articles to send' };
        }

        // Format and send the message
        const blocks = formatArticlesAsBlocks(articles);

        try {
            await client.chat.postMessage({
                channel: channelId,
                text: `${articles.length} new recommended articles`,
                blocks: blocks as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            });
        } catch (error) {
            return { sent: false, reason: `Slack API error: ${(error as Error).message}` };
        }

        // Mark articles as notified
        await ctx.runMutation(internal.services.articles.markArticlesAsSlackNotified, {
            articleIds: articles.map((a) => a._id),
        });

        // Update last notified timestamp
        await ctx.runMutation(internal.services.settings.setSettingInternal, {
            key: 'slack.lastNotifiedAt',
            value: new Date().toISOString(),
        });

        return { sent: true, articleCount: articles.length, channelId };
    },
});
