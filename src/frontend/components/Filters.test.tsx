import { test, expect } from "bun:test";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import Filters from "./Filters";

test("Filters renders all categories", () => {
    const filters = {
        categories: [],
        urgencies: [],
        minScore: 0,
    };

    const { container } = render(<Filters filters={filters} onChange={() => {}} />);

    const text = container.textContent || "";
    expect(text).toContain("Major Product Launch");
    expect(text).toContain("Industry Impact");
    expect(text).toContain("Developer Tools");
    expect(text).toContain("Not Video Worthy");
});

test("Filters renders all urgency options", () => {
    const filters = {
        categories: [],
        urgencies: [],
        minScore: 0,
    };

    const { container } = render(<Filters filters={filters} onChange={() => {}} />);

    const text = container.textContent || "";
    expect(text).toContain("Breaking");
    expect(text).toContain("Timely");
    expect(text).toContain("Evergreen");
});

test("Filters toggles category selection", () => {
    let filters = {
        categories: [] as string[],
        urgencies: [] as string[],
        minScore: 0,
    };

    const onChange = (newFilters: typeof filters) => {
        filters = newFilters;
    };

    const { container } = render(<Filters filters={filters} onChange={onChange} />);

    // Find and click a category button (e.g., "Developer Tools")
    const buttons = container.querySelectorAll("button");
    const devToolsButton = Array.from(buttons).find((btn) => btn.textContent === "Developer Tools");

    expect(devToolsButton).toBeDefined();
    if (devToolsButton) {
        fireEvent.click(devToolsButton);
        expect(filters.categories).toContain("developer_tools");

        // Click again to deselect
        fireEvent.click(devToolsButton);
        expect(filters.categories).not.toContain("developer_tools");
    }
});

test("Filters toggles urgency selection", () => {
    let filters = {
        categories: [] as string[],
        urgencies: [] as string[],
        minScore: 0,
    };

    const onChange = (newFilters: typeof filters) => {
        filters = newFilters;
    };

    const { container } = render(<Filters filters={filters} onChange={onChange} />);

    const buttons = container.querySelectorAll("button");
    const breakingButton = Array.from(buttons).find((btn) => btn.textContent === "Breaking");

    expect(breakingButton).toBeDefined();
    if (breakingButton) {
        fireEvent.click(breakingButton);
        expect(filters.urgencies).toContain("breaking");
    }
});

test("Filters updates score slider", () => {
    let filters = {
        categories: [] as string[],
        urgencies: [] as string[],
        minScore: 0,
    };

    const onChange = (newFilters: typeof filters) => {
        filters = newFilters;
    };

    const { container } = render(<Filters filters={filters} onChange={onChange} />);

    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeDefined();

    if (slider) {
        fireEvent.change(slider, { target: { value: "75" } });
        expect(filters.minScore).toBe(75);
    }
});

test("Filters displays current score value", () => {
    const filters = {
        categories: [],
        urgencies: [],
        minScore: 42,
    };

    const { container } = render(<Filters filters={filters} onChange={() => {}} />);

    const text = container.textContent || "";
    expect(text).toContain("42");
});
