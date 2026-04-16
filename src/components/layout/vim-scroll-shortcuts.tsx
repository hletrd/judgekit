"use client";

import { useEffect } from "react";

const BLOCKED_TARGET_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[role='textbox']",
  "[role='menu']",
  "[role='listbox']",
  ".cm-editor",
  ".monaco-editor",
  "[data-slot='dropdown-menu-content']",
  "[data-slot='select-content']",
].join(", ");

function isBlockedTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest(BLOCKED_TARGET_SELECTOR));
}

function canScroll(element: HTMLElement, axis: "x" | "y") {
  const style = window.getComputedStyle(element);
  const overflow = axis === "x" ? style.overflowX : style.overflowY;
  const allowsScroll = /(auto|scroll|overlay)/.test(overflow);

  if (!allowsScroll) {
    return false;
  }

  return axis === "x"
    ? element.scrollWidth > element.clientWidth + 1
    : element.scrollHeight > element.clientHeight + 1;
}

function findScrollContainer(start: HTMLElement | null, axis: "x" | "y") {
  let current = start;

  while (current) {
    if (canScroll(current, axis)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function getScrollStep(axis: "x" | "y") {
  if (axis === "x") {
    return Math.max(64, Math.round(window.innerWidth * 0.1));
  }

  return Math.max(64, Math.round(window.innerHeight * 0.12));
}

export function VimScrollShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (isBlockedTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (!["h", "j", "k", "l"].includes(key)) {
        return;
      }

      const axis = key === "h" || key === "l" ? "x" : "y";
      const direction = key === "h" || key === "k" ? -1 : 1;
      const amount = getScrollStep(axis) * direction;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const scrollContainer = findScrollContainer(target, axis);

      event.preventDefault();

      if (scrollContainer) {
        scrollContainer.scrollBy({
          left: axis === "x" ? amount : 0,
          top: axis === "y" ? amount : 0,
          behavior: "auto",
        });
        return;
      }

      window.scrollBy({
        left: axis === "x" ? amount : 0,
        top: axis === "y" ? amount : 0,
        behavior: "auto",
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
