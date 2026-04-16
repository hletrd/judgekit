import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VimScrollShortcuts } from "@/components/layout/vim-scroll-shortcuts";

describe("VimScrollShortcuts", () => {
  const windowScrollByMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "scrollBy", {
      configurable: true,
      value: windowScrollByMock,
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("scrolls the nearest vertical scroll container when pressing j", () => {
    render(<VimScrollShortcuts />);

    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    Object.defineProperty(scroller, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(scroller, "clientHeight", { configurable: true, value: 300 });
    const scrollByMock = vi.fn();
    Object.defineProperty(scroller, "scrollBy", {
      configurable: true,
      value: scrollByMock,
    });

    const child = document.createElement("div");
    child.tabIndex = 0;
    scroller.appendChild(child);
    document.body.appendChild(scroller);

    child.focus();
    fireEvent.keyDown(child, { key: "j" });

    expect(scrollByMock).toHaveBeenCalledTimes(1);
    const [options] = scrollByMock.mock.calls[0] ?? [];
    expect(options).toMatchObject({ left: 0, behavior: "auto" });
    expect(options.top).toBeGreaterThan(0);
    expect(windowScrollByMock).not.toHaveBeenCalled();
  });

  it("scrolls the nearest horizontal scroll container when pressing l", () => {
    render(<VimScrollShortcuts />);

    const scroller = document.createElement("div");
    scroller.style.overflowX = "auto";
    Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: 1200 });
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 240 });
    const scrollByMock = vi.fn();
    Object.defineProperty(scroller, "scrollBy", {
      configurable: true,
      value: scrollByMock,
    });

    const child = document.createElement("button");
    scroller.appendChild(child);
    document.body.appendChild(scroller);

    child.focus();
    fireEvent.keyDown(child, { key: "l" });

    expect(scrollByMock).toHaveBeenCalledTimes(1);
    const [options] = scrollByMock.mock.calls[0] ?? [];
    expect(options).toMatchObject({ top: 0, behavior: "auto" });
    expect(options.left).toBeGreaterThan(0);
    expect(windowScrollByMock).not.toHaveBeenCalled();
  });

  it("does not hijack typing inside inputs or textareas", () => {
    render(<VimScrollShortcuts />);

    const input = document.createElement("input");
    document.body.appendChild(input);

    input.focus();
    fireEvent.keyDown(input, { key: "j" });
    fireEvent.keyDown(input, { key: "l" });

    expect(windowScrollByMock).not.toHaveBeenCalled();
  });
});
