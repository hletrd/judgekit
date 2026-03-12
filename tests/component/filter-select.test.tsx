import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { FilterSelect } from "@/components/filter-select";

// Mock @base-ui/react/select — it relies on browser APIs not available in jsdom
vi.mock("@base-ui/react/select", () => {
  const React = require("react");

  return {
    Root: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) =>
      React.createElement("div", { "data-testid": "select-root" }, children),
    Trigger: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement("button", { type: "button", ...props }, children),
    Value: ({ placeholder }: { placeholder?: string }) =>
      React.createElement("span", { "data-testid": "select-value" }, placeholder),
    Icon: ({ render: renderProp }: { render?: React.ReactElement }) => renderProp ?? null,
    Portal: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Positioner: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
    Popup: ({ children }: { children: React.ReactNode }) => React.createElement("div", { "data-testid": "select-popup" }, children),
    List: ({ children }: { children: React.ReactNode }) => React.createElement("ul", null, children),
    Item: ({ children, value, ...props }: { children: React.ReactNode; value?: string; [key: string]: unknown }) =>
      React.createElement("li", { role: "option", "data-value": value, onClick: () => {}, ...props }, children),
    ItemText: ({ children }: { children: React.ReactNode }) => React.createElement("span", null, children),
    ItemIndicator: ({ children, render: renderProp }: { children?: React.ReactNode; render?: React.ReactElement }) =>
      React.createElement("span", null),
    GroupLabel: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
    Group: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
    Separator: () => React.createElement("hr", null),
    ScrollUpArrow: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
    ScrollDownArrow: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
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
});
