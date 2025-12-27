import type {
    Article,
    ArticleDetail,
    ArticlesResponse,
    ArticleDetailResponse,
    Status,
    StatusResponse,
} from "../types";

// Custom error class for API errors
export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public data?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// Base fetch wrapper with error handling
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    try {
        console.log(`[fetchApi] Calling ${options?.method || 'GET'} ${url}`);
        const response = await fetch(url, options);
        console.log(`[fetchApi] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error?: string };
            console.error(`[fetchApi] Error response:`, errorData);
            throw new ApiError(
                errorData.error || `HTTP ${response.status}: ${response.statusText}`,
                response.status,
                errorData
            );
        }

        const data = (await response.json()) as T;
        console.log(`[fetchApi] Response data:`, data);
        return data;
    } catch (error) {
        console.error(`[fetchApi] Exception:`, error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(
            error instanceof Error ? error.message : "An unknown error occurred"
        );
    }
}

// Article API functions
export const articlesApi = {
    getAll: async (params?: { videoWorthy?: boolean; limit?: number }): Promise<Article[]> => {
        const searchParams = new URLSearchParams();
        if (params?.videoWorthy !== undefined) {
            searchParams.set("videoWorthy", String(params.videoWorthy));
        }
        if (params?.limit !== undefined) {
            searchParams.set("limit", String(params.limit));
        }

        const url = `/api/articles${searchParams.toString() ? `?${searchParams}` : ""}`;
        const data = await fetchApi<ArticlesResponse>(url);
        return data.articles || [];
    },

    getById: async (id: string): Promise<ArticleDetail> => {
        return fetchApi<ArticleDetailResponse>(`/api/articles/${id}`);
    },

    search: async (query: string, limit = 50): Promise<Article[]> => {
        const url = `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await fetchApi<ArticlesResponse>(url);
        return data.articles || [];
    },
};

// Status API functions
export const statusApi = {
    get: async (): Promise<Status> => {
        return fetchApi<StatusResponse>("/api/status");
    },
};

// Crawl API functions
export const crawlApi = {
    trigger: async (): Promise<void> => {
        console.log("[API] Calling POST /api/crawl");
        try {
            const result = await fetchApi("/api/crawl", { method: "POST" });
            console.log("[API] Crawl trigger response:", result);
            return result;
        } catch (error) {
            console.error("[API] Crawl trigger error:", error);
            throw error;
        }
    },
};
