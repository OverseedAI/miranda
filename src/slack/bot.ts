import { App } from "@slack/bolt";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { config } from "../config";
import { articlesRepo } from "../db/repositories/articles";
import { CONVERSATION_SYSTEM_PROMPT } from "../analysis/prompts";
import { isSlackConfigured } from "./client";
import { runCrawlCycle, getSchedulerStatus } from "../scheduler/cron";

let slackApp: App | null = null;

// Initialize Claude for conversations
const conversationModel = new ChatAnthropic({
    model: config.model,
    anthropicApiKey: config.anthropicApiKey,
});

// Simple conversation history per thread
const threadHistory = new Map<string, Array<HumanMessage | AIMessage>>();

function getThreadKey(channel: string, threadTs: string | undefined): string {
    return `${channel}:${threadTs || "main"}`;
}

async function handleQuestion(text: string, threadKey: string): Promise<string> {
    // Get or create conversation history
    let history = threadHistory.get(threadKey) || [];

    // Search for relevant articles based on the question
    const searchTerms = text
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((t) => t.length > 3);

    let contextArticles = "";
    for (const term of searchTerms.slice(0, 3)) {
        const articles = articlesRepo.searchByContent(term, 5);
        if (articles.length > 0) {
            contextArticles +=
                articles
                    .map(
                        (a) =>
                            `- "${a.title}" (${a.source}): ${a.summary?.slice(0, 200) || a.rawContent?.slice(0, 200)}... [${a.url}]`
                    )
                    .join("\n") + "\n";
        }
    }

    // Also get recent video-worthy articles for context
    const recentWorthy = articlesRepo.findRecentVideoWorthy(5);
    const worthyContext = recentWorthy
        .map((a) => `- "${a.title}" (${a.source}, score: ${a.videoWorthinessScore})`)
        .join("\n");

    const contextMessage = `
Recent video-worthy articles:
${worthyContext || "No recent video-worthy articles."}

${contextArticles ? `Relevant articles found:\n${contextArticles}` : "No specific articles found matching the query."}

User question: ${text}`;

    // Add user message to history
    history.push(new HumanMessage(contextMessage));

    // Keep history manageable (last 10 exchanges)
    if (history.length > 20) {
        history = history.slice(-20);
    }

    try {
        const response = await conversationModel.invoke([
            new SystemMessage(CONVERSATION_SYSTEM_PROMPT),
            ...history,
        ]);

        const aiResponse = response.content as string;

        // Add AI response to history
        history.push(new AIMessage(aiResponse));
        threadHistory.set(threadKey, history);

        return aiResponse;
    } catch (error) {
        console.error("[Bot] Error generating response:", error);
        return "Sorry, I encountered an error processing your question. Please try again.";
    }
}

export async function startSlackBot(): Promise<void> {
    if (!isSlackConfigured()) {
        console.log("[Slack Bot] Not configured, skipping bot startup");
        return;
    }

    slackApp = new App({
        token: config.slackBotToken,
        signingSecret: config.slackSigningSecret,
        socketMode: true,
        appToken: config.slackAppToken,
    });

    // Handle direct mentions
    slackApp.event("app_mention", async ({ event, say }) => {
        console.log(`[Bot] Received mention: ${event.text.slice(0, 50)}...`);

        // Remove the bot mention from the text
        const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

        if (!text) {
            await say({
                text: "Hi! I can help you with AI news. Try asking me about recent articles, specific topics, or what's trending.",
                thread_ts: event.thread_ts || event.ts,
            });
            return;
        }

        const threadKey = getThreadKey(event.channel, event.thread_ts || event.ts);
        const response = await handleQuestion(text, threadKey);

        await say({
            text: response,
            thread_ts: event.thread_ts || event.ts,
        });
    });

    // Handle direct messages
    slackApp.event("message", async ({ event, say }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = event as any;

        // Only handle DMs (no subtype means it's a regular message)
        if (msg.channel_type !== "im" || msg.subtype) {
            return;
        }

        const text = msg.text as string | undefined;
        if (!text) return;

        console.log(`[Bot] Received DM: ${text.slice(0, 50)}...`);

        const threadKey = getThreadKey(msg.channel, msg.thread_ts);
        const response = await handleQuestion(text, threadKey);

        await say({
            text: response,
            thread_ts: msg.thread_ts || msg.ts,
        });
    });

    // Quick commands
    slackApp.message(/^!recent$/i, async ({ say, message }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = message as any;
        const recent = articlesRepo.findRecentVideoWorthy(5);
        if (recent.length === 0) {
            await say({
                text: "No recent video-worthy articles found.",
                thread_ts: msg.thread_ts,
            });
            return;
        }

        const list = recent
            .map((a) => `• <${a.url}|${a.title}> (${a.source}, score: ${a.videoWorthinessScore})`)
            .join("\n");

        await say({
            text: `*Recent Video-Worthy Articles:*\n${list}`,
            thread_ts: msg.thread_ts,
        });
    });

    slackApp.message(/^!stats$/i, async ({ say, message }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = message as any;
        const recent = articlesRepo.findRecent(100);
        const videoWorthy = recent.filter((a) => a.isVideoWorthy);
        const hitRate =
            recent.length > 0 ? ((videoWorthy.length / recent.length) * 100).toFixed(1) : "0";

        await say({
            text: `*Stats (last 100 articles):*\n• Total crawled: ${recent.length}\n• Video-worthy: ${videoWorthy.length}\n• Hit rate: ${hitRate}%`,
            thread_ts: msg.thread_ts,
        });
    });

    slackApp.message(/^!crawl$/i, async ({ say, message }) => {
        console.log("Crawl triggered via Slack");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = message as any;

        // Check if a crawl is already running
        const status = getSchedulerStatus();
        if (status.isRunning) {
            await say({
                text: "A crawl is already in progress. Please wait for it to complete.",
                thread_ts: msg.thread_ts,
            });
            return;
        }

        // Send immediate acknowledgment
        await say({
            text: "Starting manual crawl... This may take a few minutes.",
            thread_ts: msg.thread_ts,
        });

        try {
            // Run the crawl cycle
            const stats = await runCrawlCycle();

            // Report final stats
            await say({
                text: `*Crawl Complete:*\n• Crawled: ${stats.crawled}\n• New: ${stats.new}\n• Video-worthy: ${stats.videoWorthy}\n• Alerted: ${stats.alerted}`,
                thread_ts: msg.thread_ts,
            });
        } catch (error) {
            // Report error
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            await say({
                text: `Crawl failed: ${errorMessage}`,
                thread_ts: msg.thread_ts,
            });
        }
    });

    await slackApp.start();
    console.log("[Slack Bot] Started successfully");

    // Test connection by fetching bot info
    try {
        const auth = await slackApp.client.auth.test();
        console.log(`[Slack Bot] Connected as @${auth.user} in workspace "${auth.team}"`);
        console.log(`[Slack Bot] Bot ID: ${auth.user_id}`);
    } catch (error) {
        console.error("[Slack Bot] Failed to verify connection:", error);
    }
}

export function stopSlackBot(): void {
    if (slackApp) {
        slackApp.stop();
        slackApp = null;
        console.log("[Slack Bot] Stopped");
    }
}

export async function getSlackStatus(): Promise<{
    connected: boolean;
    botName?: string;
    workspace?: string;
    error?: string;
}> {
    if (!slackApp) {
        return { connected: false, error: "Slack bot not initialized" };
    }

    try {
        const auth = await slackApp.client.auth.test();
        return {
            connected: true,
            botName: auth.user as string,
            workspace: auth.team as string,
        };
    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
