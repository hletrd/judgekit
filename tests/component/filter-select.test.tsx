import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FilterSelect } from "@/components/filter-select";

// Mock the project wrapper instead of the underlying base-ui module.
vi.mock("@/components/ui/select", () => {
  const React = require("react");

  return {
    Select: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "select-root" }, children),
    SelectTrigger: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement("button", { type: "button", ...props }, children),
    SelectValue: ({ placeholder, children }: { placeholder?: string; children?: React.ReactNode }) =>
      React.createElement("span", { "data-testid": "select-value" }, children || placeholder),
    SelectContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "select-popup" }, children),
    SelectItem: ({ children, value, ...props }: { children: React.ReactNode; value?: string; [key: string]: unknown }) =>
      React.createElement("li", { role: "option", "data-value": value, onClick: () => {}, ...props }, children),
  };
});

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("FilterSelect", () => {
  it("renders with placeholder text", () => {
    render(
      <FilterSelect
        name="status"
        options={OPTIONS}
        placeholder="Select status"
      />
    );
    expect(screen.getByTestId("select-value")).toHaveTextContent("Select status");
  });

  it("renders hidden input with correct name", () => {
    const { container } = render(
      <FilterSelect name="category" options={OPTIONS} defaultValue="" />
    );
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.name).toBe("category");
  });

  it("hidden input has defaultValue on initial render", () => {
    const { container } = render(
      <FilterSelect name="lang" defaultValue="b" options={OPTIONS} />
    );
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("b");
  });

  it("renders the selected label instead of the raw value", () => {
    render(
      <FilterSelect name="lang" defaultValue="b" options={OPTIONS} />
    );

    expect(screen.getByTestId("select-value")).toHaveTextContent("Option B");
    expect(screen.getByTestId("select-value")).not.toHaveTextContent(/^b$/);
  });
});
