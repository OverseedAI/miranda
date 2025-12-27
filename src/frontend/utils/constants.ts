// App-wide constants

export const CATEGORIES = [
    "major_product_launch",
    "industry_impact",
    "trending_viral",
    "developer_tools",
    "research_breakthrough",
    "pricing_change",
    "api_update",
    "not_video_worthy",
] as const;

export const URGENCIES = ["breaking", "timely", "evergreen"] as const;

export const URGENCY_COLORS = {
    breaking: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
    timely: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
    evergreen: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200",
} as const;

export const URGENCY_COLORS_ACTIVE = {
    breaking: "bg-red-600 text-white border-red-600",
    timely: "bg-yellow-600 text-white border-yellow-600",
    evergreen: "bg-green-600 text-white border-green-600",
} as const;

export const SCORE_RANGES = {
    high: { label: "80-100 (High)", min: 80, color: "bg-green-500" },
    medium: { label: "60-79 (Medium)", min: 60, color: "bg-blue-500" },
    low: { label: "40-59 (Low)", min: 40, color: "bg-yellow-500" },
    notWorthy: { label: "0-39 (Not Worthy)", min: 0, color: "bg-gray-500" },
} as const;

export const DEFAULT_ARTICLE_LIMIT = 50;

export const REFETCH_INTERVAL = 30000; // 30 seconds
