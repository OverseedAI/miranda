import { slackClient, ALERT_CHANNEL, isSlackConfigured } from "./client";
import type { Article } from "../db/repositories/articles";
import type { VideoWorthiness } from "../analysis/schemas";
import type { KnownBlock } from "@slack/web-api";

const CATEGORY_EMOJI: Record<string, string> = {
  major_product_launch: "🚀",
  industry_impact: "💥",
  trending_viral: "🔥",
  developer_tools: "🛠️",
  research_breakthrough: "🔬",
  pricing_change: "💰",
  api_update: "⚙️",
  not_video_worthy: "📰",
};

const URGENCY_LABEL: Record<string, string> = {
  breaking: "🔴 BREAKING",
  timely: "🟡 Timely",
  evergreen: "🟢 Evergreen",
};

export async function sendVideoWorthyAlert(
  article: Article,
  analysis: VideoWorthiness
): Promise<boolean> {
  if (!isSlackConfigured()) {
    console.log("[Slack] Not configured, skipping alert");
    console.log(
      `[Alert] Would send: ${article.title} (Score: ${analysis.score})`
    );
    return false;
  }

  const emoji = CATEGORY_EMOJI[analysis.category] || "📰";
  const urgencyLabel = URGENCY_LABEL[analysis.urgency] || "";

  try {
    const blocks: KnownBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Video-Worthy News Alert`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${article.url}|${article.title}>*`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Source:* ${article.source} | *Score:* ${analysis.score}/100 | ${urgencyLabel}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Why it matters:*\n${analysis.reasoning}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Key Points:*\n${analysis.keyPoints.map((p) => `• ${p}`).join("\n")}`,
        },
      },
    ];

    if (analysis.suggestedTitle) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Suggested Video Title:*\n_"${analysis.suggestedTitle}"_`,
        },
      });
    }

    blocks.push(
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Read Article",
              emoji: true,
            },
            url: article.url,
            action_id: "read_article",
          },
        ],
      }
    );

    await slackClient.chat.postMessage({
      channel: ALERT_CHANNEL,
      text: `${emoji} Video-Worthy: ${article.title}`,
      blocks,
    });

    console.log(`[Slack] Sent alert for: ${article.title}`);
    return true;
  } catch (error) {
    console.error("[Slack] Failed to send alert:", error);
    return false;
  }
}

export async function sendDailySummary(
  articles: Array<{ article: Article; analysis: VideoWorthiness }>
): Promise<boolean> {
  if (!isSlackConfigured() || articles.length === 0) {
    return false;
  }

  const sortedArticles = articles.sort(
    (a, b) => b.analysis.score - a.analysis.score
  );

  try {
    const blocks: KnownBlock[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Daily AI News Summary",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Found *${articles.length}* video-worthy articles today:`,
        },
      },
      { type: "divider" },
    ];

    for (const { article, analysis } of sortedArticles.slice(0, 10)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${CATEGORY_EMOJI[analysis.category] || "📰"} *<${article.url}|${article.title}>*\n_Score: ${analysis.score} | ${article.source}_`,
        },
      });
    }

    await slackClient.chat.postMessage({
      channel: ALERT_CHANNEL,
      text: `Daily AI News Summary: ${articles.length} video-worthy articles`,
      blocks,
    });

    return true;
  } catch (error) {
    console.error("[Slack] Failed to send daily summary:", error);
    return false;
  }
}
