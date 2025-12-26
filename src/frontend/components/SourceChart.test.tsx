import { test, expect, describe } from "bun:test";
import React from "react";
import { render, screen } from "@testing-library/react";
import SourceChart from "./SourceChart";

describe("SourceChart", () => {
    test("renders chart title", () => {
        const articles = [{ source: "Test Source" }];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("Articles by Source")).toBeDefined();
    });

    test("displays single source with count", () => {
        const articles = [
            { source: "TechCrunch" },
            { source: "TechCrunch" },
            { source: "TechCrunch" },
        ];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("TechCrunch")).toBeDefined();
        expect(screen.getByText("3")).toBeDefined();
    });

    test("displays multiple sources", () => {
        const articles = [
            { source: "TechCrunch" },
            { source: "The Verge" },
            { source: "Ars Technica" },
        ];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("TechCrunch")).toBeDefined();
        expect(screen.getByText("The Verge")).toBeDefined();
        expect(screen.getByText("Ars Technica")).toBeDefined();
    });

    test("counts articles from same source correctly", () => {
        const articles = [
            { source: "TechCrunch" },
            { source: "TechCrunch" },
            { source: "The Verge" },
            { source: "The Verge" },
            { source: "The Verge" },
        ];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("2")).toBeDefined();
        expect(screen.getByText("3")).toBeDefined();
    });

    test("sorts sources by count in descending order", () => {
        const articles = [
            { source: "Source A" },
            { source: "Source B" },
            { source: "Source B" },
            { source: "Source C" },
            { source: "Source C" },
            { source: "Source C" },
        ];
        const { container } = render(<SourceChart articles={articles} />);
        const sourceLabels = Array.from(container.querySelectorAll(".w-48")).map(
            (el) => el.textContent
        );

        // First should be Source C (count: 3), then Source B (count: 2), then Source A (count: 1)
        expect(sourceLabels[0]).toBe("Source C");
        expect(sourceLabels[1]).toBe("Source B");
        expect(sourceLabels[2]).toBe("Source A");
    });

    test("handles empty articles array", () => {
        const articles: Array<{ source: string }> = [];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("No sources to display")).toBeDefined();
    });

    test("handles unknown source", () => {
        const articles = [{ source: "" }];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("Unknown")).toBeDefined();
    });

    test("applies color classes to bars", () => {
        const articles = [{ source: "Source A" }, { source: "Source B" }, { source: "Source C" }];
        const { container } = render(<SourceChart articles={articles} />);

        // Should have colored bars
        const coloredBars = container.querySelectorAll("[class*='bg-']");
        expect(coloredBars.length).toBeGreaterThan(0);
    });

    test("cycles through color palette for many sources", () => {
        const articles = Array.from({ length: 15 }, (_, i) => ({
            source: `Source ${i}`,
        }));
        const { container } = render(<SourceChart articles={articles} />);

        // Should render all 15 sources
        const sourceLabels = container.querySelectorAll(".w-48");
        expect(sourceLabels.length).toBe(15);
    });

    test("shows count label on each bar", () => {
        const articles = [
            { source: "Source A" },
            { source: "Source A" },
            { source: "Source B" },
            { source: "Source B" },
            { source: "Source B" },
        ];
        render(<SourceChart articles={articles} />);

        expect(screen.getByText("2")).toBeDefined(); // Source A
        expect(screen.getByText("3")).toBeDefined(); // Source B
    });

    test("handles single article", () => {
        const articles = [{ source: "Single Source" }];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("Single Source")).toBeDefined();
        expect(screen.getByText("1")).toBeDefined();
    });

    test("groups identical source names correctly", () => {
        const articles = [
            { source: "TechCrunch" },
            { source: "TechCrunch" },
            { source: "techcrunch" }, // Different case
        ];
        render(<SourceChart articles={articles} />);

        // Should have two separate entries (case-sensitive)
        expect(screen.getByText("TechCrunch")).toBeDefined();
        expect(screen.getByText("techcrunch")).toBeDefined();
    });

    test("handles many articles from single source", () => {
        const articles = Array.from({ length: 100 }, () => ({
            source: "Popular Source",
        }));
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("Popular Source")).toBeDefined();
        expect(screen.getByText("100")).toBeDefined();
    });

    test("handles special characters in source names", () => {
        const articles = [
            { source: "Source & Co." },
            { source: "Source @ Place" },
            { source: "Source #1" },
        ];
        render(<SourceChart articles={articles} />);
        expect(screen.getByText("Source & Co.")).toBeDefined();
        expect(screen.getByText("Source @ Place")).toBeDefined();
        expect(screen.getByText("Source #1")).toBeDefined();
    });

    test("truncates long source names with title attribute", () => {
        const longSource = "This is a very long source name that should be truncated";
        const articles = [{ source: longSource }];
        const { container } = render(<SourceChart articles={articles} />);

        const sourceElement = container.querySelector(".truncate");
        expect(sourceElement).toBeDefined();
        expect(sourceElement?.getAttribute("title")).toBe(longSource);
    });
});
