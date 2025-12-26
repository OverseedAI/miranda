import { test, expect } from "bun:test";
import React from "react";
import { render } from "@testing-library/react";
import StatusBar from "./StatusBar";

test("StatusBar renders with running scheduler", () => {
    const status = {
        scheduler: { isRunning: true, intervalMs: 3600000 }, // 1 hour
        config: { model: "gpt-4", videoWorthyThreshold: 70 },
    };

    const { container } = render(
        <StatusBar status={status} articleCount={42} lastCrawl="2025-12-25 10:00" />
    );

    const text = container.textContent || "";
    expect(text).toContain("Running");
    expect(text).toContain("1.0h");
    expect(text).toContain("gpt-4");
    expect(text).toContain("70");
    expect(text).toContain("42");
    expect(text).toContain("2025-12-25 10:00");
});

test("StatusBar renders with idle scheduler", () => {
    const status = {
        scheduler: { isRunning: false, intervalMs: 7200000 }, // 2 hours
        config: { model: "claude-3", videoWorthyThreshold: 80 },
    };

    const { container } = render(<StatusBar status={status} articleCount={10} />);

    const text = container.textContent || "";
    expect(text).toContain("Idle");
    expect(text).toContain("2.0h");
});

test("StatusBar renders with null status", () => {
    const { container } = render(<StatusBar status={null} articleCount={0} />);

    const text = container.textContent || "";
    expect(text).toContain("Idle");
    expect(text).toContain("0h");
    expect(text).toContain("N/A");
});
