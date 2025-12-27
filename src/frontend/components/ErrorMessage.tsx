import React from "react";

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export default function ErrorMessage({
    title = "Error",
    message,
    onRetry,
}: ErrorMessageProps) {
    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">{title}</h3>
                    <p className="text-sm text-red-700">{message}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-3 text-sm font-medium text-red-600 hover:text-red-800"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
