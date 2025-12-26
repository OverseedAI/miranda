import { test, expect } from "bun:test";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import ViewToggle from "./ViewToggle";

test("ViewToggle renders both buttons", () => {
    const { container } = render(<ViewToggle mode="grid" onChange={() => {}} />);

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
});

test("ViewToggle highlights active mode", () => {
    const { container } = render(<ViewToggle mode="grid" onChange={() => {}} />);

    const buttons = container.querySelectorAll("button");
    const gridButton = buttons[0];
    const tableButton = buttons[1];

    // Grid should be active
    expect(gridButton.className).toContain("bg-blue-600");
    expect(tableButton.className).toContain("bg-white");
});

test("ViewToggle calls onChange when clicked", () => {
    let mode: "grid" | "table" = "grid";
    const onChange = (newMode: "grid" | "table") => {
        mode = newMode;
    };

    const { container } = render(<ViewToggle mode={mode} onChange={onChange} />);

    const buttons = container.querySelectorAll("button");
    const tableButton = buttons[1];

    fireEvent.click(tableButton);
    expect(mode).toBe("table");
});
