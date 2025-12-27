import { useEffect, useRef, useCallback } from "react";
import type { CrawlProgressMessage } from "../types";

interface UseWebSocketOptions {
    onMessage: (message: CrawlProgressMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
}

export function useWebSocket({ onMessage, onOpen, onClose, onError }: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const onMessageRef = useRef(onMessage);
    const onOpenRef = useRef(onOpen);
    const onCloseRef = useRef(onClose);
    const onErrorRef = useRef(onError);

    // Keep refs updated
    useEffect(() => {
        onMessageRef.current = onMessage;
        onOpenRef.current = onOpen;
        onCloseRef.current = onClose;
        onErrorRef.current = onError;
    });

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log("[WS] Attempting to connect to:", wsUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("[WS] Connected");
            onOpenRef.current?.();
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as CrawlProgressMessage;
                onMessageRef.current(message);
            } catch (error) {
                console.error("[WS] Failed to parse message:", error);
            }
        };

        ws.onerror = (error) => {
            console.error("[WS] Error:", error);
            onErrorRef.current?.(error);
        };

        ws.onclose = () => {
            console.log("[WS] Disconnected");
            onCloseRef.current?.();
        };

        wsRef.current = ws;

        return () => {
            console.log("[WS] Cleaning up connection");
            ws.close();
        };
    }, []); // Empty dependency array - only connect once

    return wsRef;
}
