"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";

interface AntiCheatMonitorProps {
  assignmentId: string;
  enabled: boolean;
  warningMessage?: string;
}

const STORAGE_KEY = "judgekit_anticheat_pending";
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
const HEARTBEAT_INTERVAL_MS = 30_000;

interface PendingEvent {
  eventType: string;
  details?: string;
  timestamp: number;
  retries: number;
}

function loadPendingEvents(assignmentId: string): PendingEvent[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${assignmentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingEvents(assignmentId: string, events: PendingEvent[]) {
  try {
    if (events.length === 0) {
      localStorage.removeItem(`${STORAGE_KEY}_${assignmentId}`);
    } else {
      localStorage.setItem(`${STORAGE_KEY}_${assignmentId}`, JSON.stringify(events));
    }
  } catch {
    // localStorage unavailable
  }
}

export function AntiCheatMonitor({
  assignmentId,
  enabled,
  warningMessage,
}: AntiCheatMonitorProps) {
  const t = useTranslations("contests.antiCheat");
  const resolvedWarningMessage = warningMessage ?? t("warningTabSwitch");
  const lastEventRef = useRef<Record<string, number>>({});
  const MIN_INTERVAL_MS = 1000;
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendEvent = useCallback(
    async (event: PendingEvent): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/v1/contests/${assignmentId}/anti-cheat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: event.eventType,
            details: event.details,
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [assignmentId]
  );

  const flushPendingEvents = useCallback(async () => {
    const pending = loadPendingEvents(assignmentId);
    if (pending.length === 0) return;

    const remaining: PendingEvent[] = [];
    for (const event of pending) {
      const ok = await sendEvent(event);
      if (!ok && event.retries < MAX_RETRIES) {
        remaining.push({ ...event, retries: event.retries + 1 });
      }
    }
    savePendingEvents(assignmentId, remaining);
  }, [assignmentId, sendEvent]);

  const reportEvent = useCallback(
    async (eventType: string, details?: Record<string, unknown>) => {
      const now = Date.now();
      const lastEventAt = lastEventRef.current[eventType] ?? 0;
      if (now - lastEventAt < MIN_INTERVAL_MS) return;
      lastEventRef.current[eventType] = now;

      const event: PendingEvent = {
        eventType,
        details: details ? JSON.stringify(details) : undefined,
        timestamp: now,
        retries: 0,
      };

      const ok = await sendEvent(event);
      if (!ok) {
        const pending = loadPendingEvents(assignmentId);
        pending.push({ ...event, retries: 1 });
        savePendingEvents(assignmentId, pending);

        if (!retryTimerRef.current) {
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            void flushPendingEvents();
          }, RETRY_BASE_DELAY_MS * 2);
        }
      }
    },
    [assignmentId, sendEvent, flushPendingEvents]
  );

  useEffect(() => {
    if (!enabled) return;
    void flushPendingEvents();
  }, [enabled, flushPendingEvents]);

  useEffect(() => {
    if (!enabled) return;

    void reportEvent("heartbeat");

    const heartbeatTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void reportEvent("heartbeat");
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeatTimer);
  }, [enabled, reportEvent]);

  useEffect(() => {
    if (!enabled) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        void reportEvent("tab_switch");
        toast.warning(resolvedWarningMessage);
      } else {
        void flushPendingEvents();
        void reportEvent("heartbeat");
      }
    }

    function handleBlur() {
      void reportEvent("blur");
    }

    function describeElement(el: HTMLElement | null): string {
      if (!el) return "unknown";
      const tag = el.tagName;
      // Code editor (CodeMirror / Monaco)
      if (el.closest(".cm-editor") || el.closest(".monaco-editor")) return "code-editor";
      // Problem description area
      if (el.closest(".problem-description")) return "problem-description";
      // Textarea / input
      if (tag === "TEXTAREA" || tag === "INPUT") return "input-field";
      // Code block in problem
      if (el.closest("pre") || el.closest("code")) return "code-block";
      // Headings, paragraphs, spans in content
      if (["P", "SPAN", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "A", "STRONG", "EM"].includes(tag)) {
        // Try to get a snippet of the content
        const text = (el.textContent ?? "").trim().slice(0, 80);
        const parent = el.closest("[class]") as HTMLElement | null;
        const parentClass = parent?.className?.split(" ")[0] ?? "";
        if (parentClass) return `${tag.toLowerCase()} in .${parentClass}${text ? `: "${text}"` : ""}`;
        return `${tag.toLowerCase()}${text ? `: "${text}"` : ""}`;
      }
      return tag.toLowerCase();
    }

    function handleCopy(e: ClipboardEvent) {
      void reportEvent("copy", {
        target: describeElement(e.target as HTMLElement),
      });
    }

    function handlePaste(e: ClipboardEvent) {
      void reportEvent("paste", {
        target: describeElement(e.target as HTMLElement),
      });
    }

    function handleContextMenu() {
      void reportEvent("contextmenu");
    }

    function handleOnline() {
      void flushPendingEvents();
      void reportEvent("heartbeat");
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("online", handleOnline);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [enabled, flushPendingEvents, reportEvent, resolvedWarningMessage]);

  return null;
}
