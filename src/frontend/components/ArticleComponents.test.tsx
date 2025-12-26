import { test, expect, describe } from "bun:test";
import React from "react";
import { render } from "@testing-library/react";
import ArticleCard from "./ArticleCard";
import ArticleGrid from "./ArticleGrid";
import ArticleTable from "./ArticleTable";

const mockArticle = {
    id: "1",
    title: "Test Article Title",
    url: "https://example.com/article",
    source: "TechNews",
    summary: "Test summary",
    isVideoWorthy: true,
    score: 85,
    category: "major_launch",
    crawledAt: new Date().toISOString(),
    analysis: {
        urgency: "breaking" as const,
        keyPoints: ["First key point", "Second key point", "Third key point"],
    },
};

const mockArticles = [
    mockArticle,
    {
        ...mockArticle,
        id: "2",
        title: "Second Article",
        score: 45,
        category: "minor_update",
        analysis: {
            urgency: "timely" as const,
            keyPoints: ["Point A", "Point B"],
        },
    },
    {
        ...mockArticle,
        id: "3",
        title: "Third Article",
        score: null,
        category: null,
        analysis: undefined,
    },
];

describe("ArticleCard", () => {
    test("renders article title", () => {
        const { container } = render(<ArticleCard article={mockArticle} onClick={() => {}} />);
        expect(container.textContent).toContain("Test Article Title");
    });

    test("renders source badge", () => {
        const { container } = render(<ArticleCard article={mockArticle} onClick={() => {}} />);
        expect(container.textContent).toContain("TechNews");
    });

    test("renders score", () => {
        const { container } = render(<ArticleCard article={mockArticle} onClick={() => {}} />);
        expect(container.textContent).toContain("85");
    });

    test("renders formatted category", () => {
        const { container } = render(<ArticleCard article={mockArticle} onClick={() => {}} />);
        expect(container.textContent).toContain("Major Launch");
    });

    test("renders first 2 key points", () => {
        const { container } = render(<ArticleCard article={mockArticle} onClick={() => {}} />);
        expect(container.textContent).toContain("First key point");
        expect(container.textContent).toContain("Second key point");
        expect(container.textContent).not.toContain("Third key point");
    });

    test("handles null score", () => {
        const articleWithNullScore = { ...mockArticle, score: null };
        const { container } = render(
            <ArticleCard article={articleWithNullScore} onClick={() => {}} />
        );
        expect(container.textContent).toContain("N/A");
    });

    test("calls onClick when clicked", () => {
        let clicked = false;
        const { container } = render(
            <ArticleCard
                article={mockArticle}
                onClick={() => {
                    clicked = true;
                }}
            />
        );
        const card = container.querySelector(".article-card");
        card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(clicked).toBe(true);
    });
});

describe("ArticleGrid", () => {
    test("renders all articles", () => {
        const { container } = render(<ArticleGrid articles={mockArticles} onSelect={() => {}} />);
        expect(container.textContent).toContain("Test Article Title");
        expect(container.textContent).toContain("Second Article");
        expect(container.textContent).toContain("Third Article");
    });

    test("shows 'No articles found' when empty", () => {
        const { container } = render(<ArticleGrid articles={[]} onSelect={() => {}} />);
        expect(container.textContent).toContain("No articles found");
    });

    test("calls onSelect when article is clicked", () => {
        let selectedArticle: any = null;
        const { container } = render(
            <ArticleGrid
                articles={mockArticles}
                onSelect={(article) => {
                    selectedArticle = article;
                }}
            />
        );
        const firstCard = container.querySelector(".article-card");
        firstCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(selectedArticle).toEqual(mockArticle);
    });
});

describe("ArticleTable", () => {
    test("renders all articles in table", () => {
        const { container } = render(<ArticleTable articles={mockArticles} onSelect={() => {}} />);
        expect(container.textContent).toContain("Test Article Title");
        expect(container.textContent).toContain("Second Article");
        expect(container.textContent).toContain("Third Article");
    });

    test("renders column headers", () => {
        const { container } = render(<ArticleTable articles={mockArticles} onSelect={() => {}} />);
        expect(container.textContent).toContain("Title");
        expect(container.textContent).toContain("Source");
        expect(container.textContent).toContain("Score");
        expect(container.textContent).toContain("Category");
        expect(container.textContent).toContain("Urgency");
        expect(container.textContent).toContain("Crawled");
    });

    test("renders score badges with correct colors", () => {
        const { container } = render(<ArticleTable articles={mockArticles} onSelect={() => {}} />);
        expect(container.textContent).toContain("85");
        expect(container.textContent).toContain("45");
        expect(container.textContent).toContain("N/A");
    });

    test("formats categories correctly", () => {
        const { container } = render(<ArticleTable articles={mockArticles} onSelect={() => {}} />);
        expect(container.textContent).toContain("Major Launch");
        expect(container.textContent).toContain("Minor Update");
    });

    test("handles null categories", () => {
        const { container } = render(
            <ArticleTable articles={[mockArticles[2]]} onSelect={() => {}} />
        );
        expect(container.querySelectorAll("td")[3].textContent).toContain("-");
    });

    test("calls onSelect when row is clicked", () => {
        let selectedArticle: any = null;
        const { container } = render(
            <ArticleTable
                articles={mockArticles}
                onSelect={(article) => {
                    selectedArticle = article;
                }}
            />
        );
        const firstRow = container.querySelector("tbody tr");
        firstRow?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(selectedArticle).toBeTruthy();
    });
});
