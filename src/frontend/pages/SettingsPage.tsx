import React from "react";

export default function SettingsPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">⚙️</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Settings Coming Soon</h2>
                <p className="text-gray-600">
                    Configuration options will be available here in a future update.
                </p>
            </div>

            {/* Placeholder for future settings */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Crawler Settings</h3>
                    <p className="text-sm text-gray-600">
                        Configure crawl intervals, sources, and filters
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Model Settings</h3>
                    <p className="text-sm text-gray-600">
                        Adjust AI model, video-worthiness threshold
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Notification Settings
                    </h3>
                    <p className="text-sm text-gray-600">
                        Configure Slack alerts and notification preferences
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">API Settings</h3>
                    <p className="text-sm text-gray-600">Configure API keys and endpoints</p>
                </div>
            </div>
        </div>
    );
}
