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
        },
    },
    plugins: [],
};
