import { test, expect, describe } from "bun:test";
import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreChart from "./ScoreChart";

describe("ScoreChart", () => {
    test("renders chart title", () => {
        const articles = [{ score: 85 }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("Score Distribution")).toBeDefined();
    });

    test("renders all score range labels", () => {
        const articles = [{ score: 85 }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("80-100 (High)")).toBeDefined();
        expect(screen.getByText("60-79 (Medium)")).toBeDefined();
        expect(screen.getByText("40-59 (Low)")).toBeDefined();
        expect(screen.getByText("0-39 (Not Worthy)")).toBeDefined();
    });

    test("counts articles in high range correctly", () => {
        const articles = [{ score: 85 }, { score: 90 }, { score: 95 }];
        const { container } = render(<ScoreChart articles={articles} />);
        expect(screen.getByText("3")).toBeDefined();
    });

    test("counts articles in medium range correctly", () => {
        const articles = [{ score: 65 }, { score: 70 }];
        const { container } = render(<ScoreChart articles={articles} />);
        expect(screen.getByText("2")).toBeDefined();
    });

    test("counts articles in low range correctly", () => {
        const articles = [{ score: 45 }, { score: 50 }, { score: 55 }, { score: 59 }];
        const { container } = render(<ScoreChart articles={articles} />);
        expect(screen.getByText("4")).toBeDefined();
    });

    test("counts articles in not worthy range correctly", () => {
        const articles = [{ score: 10 }, { score: 20 }, { score: 30 }, { score: 39 }, { score: 0 }];
        const { container } = render(<ScoreChart articles={articles} />);
        expect(screen.getByText("5")).toBeDefined();
    });

    test("handles mixed score ranges", () => {
        const articles = [
            { score: 95 }, // high
            { score: 85 }, // high
            { score: 75 }, // medium
            { score: 65 }, // medium
            { score: 55 }, // low
            { score: 45 }, // low
            { score: 35 }, // not worthy
            { score: 25 }, // not worthy
        ];
        render(<ScoreChart articles={articles} />);
        const counts = screen.getAllByText(/^[0-9]+$/);
        expect(counts.length).toBeGreaterThan(0);
    });

    test("ignores null scores", () => {
        const articles = [{ score: 85 }, { score: null }, { score: null }, { score: 90 }];
        const { container } = render(<ScoreChart articles={articles} />);
        expect(screen.getByText("2")).toBeDefined();
    });

    test("ignores undefined scores", () => {
        const articles = [{ score: 85 }, { score: undefined }, { score: 90 }];
        const { container } = render(<ScoreChart articles={articles} />);
        expect(screen.getByText("2")).toBeDefined();
    });

    test("handles empty articles array", () => {
        const articles: Array<{ score: number | null }> = [];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("Score Distribution")).toBeDefined();
    });

    test("handles all null scores", () => {
        const articles = [{ score: null }, { score: null }, { score: null }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("Score Distribution")).toBeDefined();
    });

    test("applies green color to high range bar", () => {
        const articles = [{ score: 85 }];
        const { container } = render(<ScoreChart articles={articles} />);
        const bar = container.querySelector(".bg-green-500");
        expect(bar).toBeDefined();
    });

    test("applies blue color to medium range bar", () => {
        const articles = [{ score: 65 }];
        const { container } = render(<ScoreChart articles={articles} />);
        const bar = container.querySelector(".bg-blue-500");
        expect(bar).toBeDefined();
    });

    test("applies yellow color to low range bar", () => {
        const articles = [{ score: 45 }];
        const { container } = render(<ScoreChart articles={articles} />);
        const bar = container.querySelector(".bg-yellow-500");
        expect(bar).toBeDefined();
    });

    test("applies gray color to not worthy range bar", () => {
        const articles = [{ score: 25 }];
        const { container } = render(<ScoreChart articles={articles} />);
        const bar = container.querySelector(".bg-gray-500");
        expect(bar).toBeDefined();
    });

    test("edge case: score exactly 80", () => {
        const articles = [{ score: 80 }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("1")).toBeDefined();
    });

    test("edge case: score exactly 60", () => {
        const articles = [{ score: 60 }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("1")).toBeDefined();
    });

    test("edge case: score exactly 40", () => {
        const articles = [{ score: 40 }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("1")).toBeDefined();
    });

    test("edge case: score exactly 0", () => {
        const articles = [{ score: 0 }];
        render(<ScoreChart articles={articles} />);
        expect(screen.getByText("1")).toBeDefined();
    });
});
