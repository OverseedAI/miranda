import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { articlesApi, statusApi, crawlApi } from "../services/api";
import type { Article, ArticleDetail, Status } from "../types";
import { REFETCH_INTERVAL } from "../utils/constants";

// Query keys
export const queryKeys = {
    articles: (params?: { videoWorthy?: boolean; limit?: number }) => ["articles", params] as const,
    article: (id: string) => ["article", id] as const,
    search: (query: string, limit: number) => ["search", query, limit] as const,
    status: () => ["status"] as const,
};

// Articles query
export function useArticles(params?: { videoWorthy?: boolean; limit?: number }) {
    return useQuery({
        queryKey: queryKeys.articles(params),
        queryFn: () => articlesApi.getAll(params),
        staleTime: 30000, // Consider data fresh for 30 seconds
        refetchInterval: REFETCH_INTERVAL,
    });
}

// Single article query
export function useArticle(id: string | null) {
    return useQuery({
        queryKey: queryKeys.article(id || ""),
        queryFn: () => articlesApi.getById(id!),
        enabled: !!id,
        staleTime: 60000, // Consider fresh for 1 minute
    });
}

// Search query
export function useSearchArticles(query: string, limit = 50) {
    return useQuery({
        queryKey: queryKeys.search(query, limit),
        queryFn: () => articlesApi.search(query, limit),
        enabled: query.length > 0,
        staleTime: 30000,
    });
}

// Status query
export function useStatus() {
    return useQuery({
        queryKey: queryKeys.status(),
        queryFn: statusApi.get,
        staleTime: 10000, // Refresh every 10 seconds
        refetchInterval: 10000,
    });
}

// Trigger crawl mutation
export function useTriggerCrawl() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: crawlApi.trigger,
        onSuccess: () => {
            console.log("[Crawl] Successfully triggered crawl");
            // Invalidate and refetch articles after crawl completes
            queryClient.invalidateQueries({ queryKey: ["articles"] });
            queryClient.invalidateQueries({ queryKey: queryKeys.status() });
        },
        onError: (error) => {
            console.error("[Crawl] Error triggering crawl:", error);
        },
    });
}
