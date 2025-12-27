import React from "react";

export type Page = "home" | "articles" | "crawler" | "settings";

interface SidebarProps {
    currentPage: Page;
    onPageChange: (page: Page) => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
    const menuItems: { id: Page; label: string; icon: string }[] = [
        { id: "home", label: "Home", icon: "🏠" },
        { id: "articles", label: "Articles", icon: "📰" },
        { id: "crawler", label: "Crawler", icon: "🤖" },
        { id: "settings", label: "Settings", icon: "⚙️" },
    ];

    return (
        <aside className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col">
            {/* Logo/Header */}
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-xl font-bold">Article Dashboard</h1>
                <p className="text-sm text-gray-400 mt-1">AI-Powered Analysis</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onPageChange(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                    currentPage === item.id
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-300 hover:bg-gray-800"
                                }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 text-center">Powered by Claude & LangChain</p>
            </div>
        </aside>
    );
}
