/** @type {import('tailwindcss').Config} */
export default {
    content: ["./src/frontend/**/*.{html,tsx,jsx}"],
    theme: {
        extend: {
            colors: {
                score: {
                    high: "#22c55e",
                    medium: "#3b82f6",
                    low: "#eab308",
                    none: "#6b7280",
                },
                urgency: {
                    breaking: "#ef4444",
                    timely: "#f59e0b",
                    evergreen: "#22c55e",
                },
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
        },
    },
    plugins: [],
};
