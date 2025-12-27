import type { Urgency } from "../types";

// Score utilities
export function getScoreColor(score: number | null): string {
    if (score === null) return "#6b7280";
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#eab308";
    return "#6b7280";
}

export function getScoreColorClass(score: number | null): string {
    if (score === null) return "text-gray-600";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-gray-600";
}

export function getScoreBgClass(score: number | null): string {
    if (score === null) return "bg-gray-500";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-500";
}

// Urgency utilities
export function getUrgencyColor(urgency?: Urgency): string {
    switch (urgency) {
        case "breaking":
            return "#ef4444";
        case "timely":
            return "#f59e0b";
        case "evergreen":
            return "#10b981";
        default:
            return "#9ca3af";
    }
}

export function getUrgencyBadgeClass(urgency?: Urgency): string {
    switch (urgency) {
        case "breaking":
            return "bg-red-500 text-white";
        case "timely":
            return "bg-orange-500 text-white";
        case "evergreen":
            return "bg-green-500 text-white";
        default:
            return "bg-gray-500 text-white";
    }
}

// Time utilities
export function getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1d ago";
    return `${diffDays}d ago`;
}

export function formatDate(dateString?: string): string {
    if (!dateString) return "Unknown date";
    try {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
}

// Category utilities
export function formatCategory(category: string | null): string {
    if (!category) return "";
    return category
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
