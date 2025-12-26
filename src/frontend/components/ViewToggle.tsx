import React from "react";

interface ViewToggleProps {
    mode: "grid" | "table";
    onChange: (mode: "grid" | "table") => void;
}

export default function ViewToggle({ mode, onChange }: ViewToggleProps) {
    const buttonClass = (isActive: boolean) =>
        `p-2 rounded-md transition-colors ${
            isActive ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
        }`;

    return (
        <div className="flex items-center gap-1 border border-gray-300 rounded-md p-1 bg-white">
            {/* Grid View Button */}
            <button
                onClick={() => onChange("grid")}
                className={buttonClass(mode === "grid")}
                title="Grid view"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
                </svg>
            </button>

            {/* Table View Button */}
            <button
                onClick={() => onChange("table")}
                className={buttonClass(mode === "table")}
                title="Table view"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 4h18v3H3V4zm0 6h18v3H3v-3zm0 6h18v3H3v-3z" />
                </svg>
            </button>
        </div>
    );
}
