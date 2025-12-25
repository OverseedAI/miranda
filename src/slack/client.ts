import { WebClient } from "@slack/web-api";
import { config } from "../config";

// Initialize Slack Web API client
export const slackClient = new WebClient(config.slackBotToken);

export const ALERT_CHANNEL = config.slackAlertChannel;

export function isSlackConfigured(): boolean {
  return Boolean(config.slackBotToken && config.slackAppToken);
}
