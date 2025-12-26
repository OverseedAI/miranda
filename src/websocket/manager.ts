import type { ServerWebSocket } from "bun";
import type { CrawlStats } from "../scheduler/cron";

// WebSocket connection pool
const connections = new Set<ServerWebSocket>();

// Message types for crawl progress
export type CrawlProgressMessage =
    | { type: "connected" }
    | { type: "started"; timestamp: string }
    | { type: "sources_crawled"; count: number }
    | { type: "filtered"; newCount: number; duplicateCount: number }
    | { type: "analyzing_article"; current: number; total: number; title: string }
    | { type: "article_saved"; score: number; isVideoWorthy: boolean }
    | { type: "completed"; stats: CrawlStats; durationSeconds: number }
    | { type: "error"; message: string; phase?: string };

export function addConnection(ws: ServerWebSocket) {
    connections.add(ws);
    console.log(`[WebSocket] Client connected. Total connections: ${connections.size}`);
}

export function removeConnection(ws: ServerWebSocket) {
    connections.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total connections: ${connections.size}`);
}

export function broadcast(message: CrawlProgressMessage) {
    const json = JSON.stringify(message);
    let sent = 0;

    for (const ws of connections) {
        try {
            ws.send(json);
            sent++;
        } catch (error) {
            console.error("[WebSocket] Failed to send to client:", error);
            // Remove dead connections
            connections.delete(ws);
        }
    }

    if (sent > 0) {
        console.log(`[WebSocket] Broadcast '${message.type}' to ${sent} client(s)`);
    }
}
