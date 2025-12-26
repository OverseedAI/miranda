import React from "react";
import type { FilterState } from "../types";
import { CATEGORIES, URGENCIES, URGENCY_COLORS, URGENCY_COLORS_ACTIVE } from "../utils/constants";
import { formatCategory } from "../utils/formatting";

interface FiltersProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
}

export default function Filters({ filters, onChange }: FiltersProps) {
    const toggleCategory = (category: string) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter((c) => c !== category)
            : [...filters.categories, category];
        onChange({ ...filters, categories: newCategories });
    };

    const toggleUrgency = (urgency: string) => {
        const newUrgencies = filters.urgencies.includes(urgency)
            ? filters.urgencies.filter((u) => u !== urgency)
            : [...filters.urgencies, urgency];
        onChange({ ...filters, urgencies: newUrgencies });
    };

    const updateScore = (minScore: number) => {
        onChange({ ...filters, minScore });
    };

    return (
        <div className="space-y-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
            {/* Categories */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((category) => {
                        const isActive = filters.categories.includes(category);
                        return (
                            <button
                                key={category}
                                onClick={() => toggleCategory(category)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                    isActive
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                                }`}
                            >
                                {formatCategory(category)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Urgencies */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Urgency</h3>
                <div className="flex flex-wrap gap-2">
                    {URGENCIES.map((urgency) => {
                        const isActive = filters.urgencies.includes(urgency);
                        return (
                            <button
                                key={urgency}
                                onClick={() => toggleUrgency(urgency)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                    isActive
                                        ? URGENCY_COLORS_ACTIVE[
                                              urgency as keyof typeof URGENCY_COLORS_ACTIVE
                                          ]
                                        : URGENCY_COLORS[urgency as keyof typeof URGENCY_COLORS]
                                }`}
                            >
                                {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Score Slider */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Minimum Score</h3>
                    <span className="text-sm font-medium text-blue-600">{filters.minScore}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => updateScore(Number((e.target as HTMLInputElement).value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                </div>
            </div>
        </div>
    );
}
