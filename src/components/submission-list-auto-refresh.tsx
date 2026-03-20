"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const ACTIVE_INTERVAL_MS = 3000;
const IDLE_INTERVAL_MS = 10000;

export function SubmissionListAutoRefresh({
  hasActiveSubmissions,
  activeIntervalMs = ACTIVE_INTERVAL_MS,
  idleIntervalMs = IDLE_INTERVAL_MS,
}: {
  hasActiveSubmissions: boolean;
  activeIntervalMs?: number;
  idleIntervalMs?: number;
}) {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const interval = hasActiveSubmissions ? activeIntervalMs : idleIntervalMs;

    intervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasActiveSubmissions, activeIntervalMs, idleIntervalMs, router]);

  return null;
}
