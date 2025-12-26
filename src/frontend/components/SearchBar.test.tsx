import { test, expect } from "bun:test";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import SearchBar from "./SearchBar";

test("SearchBar renders input and search button", () => {
    const { container } = render(<SearchBar value="" onChange={() => {}} onSearch={() => {}} />);

    const input = container.querySelector("input");
    const button = container.querySelector("button");

    expect(input).toBeDefined();
    expect(button).toBeDefined();
    expect(input?.placeholder).toBe("Search articles...");
});

test("SearchBar calls onChange when typing", () => {
    let value = "";
    const onChange = (newValue: string) => {
        value = newValue;
    };

    const { container } = render(
        <SearchBar value={value} onChange={onChange} onSearch={() => {}} />
    );

    const input = container.querySelector("input");
    expect(input).toBeDefined();

    if (input) {
        fireEvent.change(input, { target: { value: "test query" } });
        expect(value).toBe("test query");
    }
});

test("SearchBar calls onSearch when button clicked", () => {
    let searchCalled = false;
    const onSearch = () => {
        searchCalled = true;
    };

    const { container } = render(<SearchBar value="" onChange={() => {}} onSearch={onSearch} />);

    const button = container.querySelector("button");
    expect(button).toBeDefined();

    if (button) {
        fireEvent.click(button);
        expect(searchCalled).toBe(true);
    }
});

test("SearchBar calls onSearch when Enter pressed", () => {
    let searchCalled = false;
    const onSearch = () => {
        searchCalled = true;
    };

    const { container } = render(<SearchBar value="" onChange={() => {}} onSearch={onSearch} />);

    const input = container.querySelector("input");
    expect(input).toBeDefined();

    if (input) {
        fireEvent.keyDown(input, { key: "Enter" });
        expect(searchCalled).toBe(true);
    }
});

test("SearchBar shows loading state", () => {
    const { container } = render(
        <SearchBar value="" onChange={() => {}} onSearch={() => {}} loading={true} />
    );

    const text = container.textContent || "";
    expect(text).toContain("Searching...");

    const button = container.querySelector("button");
    expect(button?.disabled).toBe(true);
});
