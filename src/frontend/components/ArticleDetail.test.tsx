import { test, expect, describe, mock } from "bun:test";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ArticleDetail from "./ArticleDetail";

describe("ArticleDetail", () => {
    const mockArticle = {
        id: "1",
        title: "Test Article",
        url: "https://example.com/article",
        source: "Test Source",
        summary: "This is a test summary",
        rawContent: "Raw content here",
        publishedAt: "2025-12-25T10:00:00Z",
        crawledAt: "2025-12-25T11:00:00Z",
        isVideoWorthy: true,
        score: 85,
        category: "Technology",
        analysis: {
            isVideoWorthy: true,
            score: 85,
            category: "Technology",
            reasoning: "This article has high engagement potential",
            suggestedTitle: "Amazing Tech Breakthrough!",
            keyPoints: ["Point 1", "Point 2", "Point 3"],
            urgency: "timely" as const,
        },
    };

    test("renders article title", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("Test Article")).toBeDefined();
    });

    test("renders article source and metadata", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("Test Source")).toBeDefined();
        expect(screen.getByText("TIMELY")).toBeDefined();
    });

    test("displays score with correct color class", () => {
        const onClose = mock(() => {});
        const { container } = render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        const scoreElement = screen.getByText("85");
        expect(scoreElement.className).toContain("text-green-600");
    });

    test("displays category", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("Technology")).toBeDefined();
    });

    test("displays analysis reasoning", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("This article has high engagement potential")).toBeDefined();
    });

    test("displays suggested video title when available", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("Amazing Tech Breakthrough!")).toBeDefined();
    });

    test("displays key points as list items", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("Point 1")).toBeDefined();
        expect(screen.getByText("Point 2")).toBeDefined();
        expect(screen.getByText("Point 3")).toBeDefined();
    });

    test("displays summary when available", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        expect(screen.getByText("This is a test summary")).toBeDefined();
    });

    test("renders Read Original button with correct URL", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        const link = screen.getByText("Read Original Article") as HTMLAnchorElement;
        expect(link.href).toBe("https://example.com/article");
        expect(link.target).toBe("_blank");
    });

    test("calls onClose when close button is clicked", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        const closeButton = screen.getByLabelText("Close");
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalled();
    });

    test("calls onClose when backdrop is clicked", () => {
        const onClose = mock(() => {});
        const { container } = render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        const backdrop = container.querySelector(".modal-backdrop");
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(onClose).toHaveBeenCalled();
        }
    });

    test("does not call onClose when content area is clicked", () => {
        const onClose = mock(() => {});
        render(<ArticleDetail article={mockArticle} onClose={onClose} />);
        const title = screen.getByText("Test Article");
        fireEvent.click(title);
        expect(onClose).not.toHaveBeenCalled();
    });

    test("handles article without analysis", () => {
        const articleWithoutAnalysis = {
            ...mockArticle,
            analysis: undefined,
        };
        const onClose = mock(() => {});
        render(<ArticleDetail article={articleWithoutAnalysis} onClose={onClose} />);
        expect(screen.getByText("Test Article")).toBeDefined();
        expect(screen.getByText("85")).toBeDefined();
    });

    test("handles null score", () => {
        const articleWithNullScore = {
            ...mockArticle,
            score: null,
            analysis: undefined,
        };
        const onClose = mock(() => {});
        render(<ArticleDetail article={articleWithNullScore} onClose={onClose} />);
        expect(screen.getByText("0")).toBeDefined();
    });

    test("handles missing publishedAt date", () => {
        const articleWithoutDate = {
            ...mockArticle,
            publishedAt: undefined,
        };
        const onClose = mock(() => {});
        render(<ArticleDetail article={articleWithoutDate} onClose={onClose} />);
        expect(screen.getByText("Unknown date")).toBeDefined();
    });

    test("applies correct urgency badge color for breaking news", () => {
        const breakingArticle = {
            ...mockArticle,
            analysis: {
                ...mockArticle.analysis!,
                urgency: "breaking" as const,
            },
        };
        const onClose = mock(() => {});
        render(<ArticleDetail article={breakingArticle} onClose={onClose} />);
        const badge = screen.getByText("BREAKING");
        expect(badge.className).toContain("bg-red-500");
    });

    test("applies correct urgency badge color for evergreen", () => {
        const evergreenArticle = {
            ...mockArticle,
            analysis: {
                ...mockArticle.analysis!,
                urgency: "evergreen" as const,
            },
        };
        const onClose = mock(() => {});
        render(<ArticleDetail article={evergreenArticle} onClose={onClose} />);
        const badge = screen.getByText("EVERGREEN");
        expect(badge.className).toContain("bg-green-500");
    });

    test("displays rawContent when summary is not available", () => {
        const articleWithRawContent = {
            ...mockArticle,
            summary: undefined,
            rawContent: "Raw content here",
        };
        const onClose = mock(() => {});
        render(<ArticleDetail article={articleWithRawContent} onClose={onClose} />);
        expect(screen.getByText("Raw content here")).toBeDefined();
    });
});
