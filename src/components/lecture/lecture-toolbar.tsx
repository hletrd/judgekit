"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Minus, Plus, Palette, Columns2, PanelLeft, PanelRight, Maximize, Minimize, BarChart3, X } from "lucide-react";
import { useLectureMode } from "./lecture-mode-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FONT_SCALES = ["1.25", "1.5", "1.75", "2.0", "2.5", "3.0", "3.5", "4.0"] as const;
const COLOR_SCHEMES = ["dark", "light", "solarized"] as const;
const AUTO_HIDE_MS = 4000;

export function LectureToolbar({ onToggleStats }: { onToggleStats?: () => void }) {
  const { active, toggle, fontScale, setFontScale, colorScheme, setColorScheme, panelLayout, setPanelLayout } = useLectureMode();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide logic
  const resetHideTimer = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
  }, []);

  useEffect(() => {
    if (!active) return;
    const handleMove = (e: MouseEvent) => {
      // Always show when mouse is near bottom 80px
      if (window.innerHeight - e.clientY < 80) {
        resetHideTimer();
      }
    };
    window.addEventListener("mousemove", handleMove);
    resetHideTimer();
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [active, resetHideTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.target as HTMLElement)?.closest?.(".cm-editor")) return;

      switch (e.key) {
        case "Escape":
          toggle();
          break;
        case "+":
        case "=": {
          const idx = FONT_SCALES.indexOf(fontScale as any);
          if (idx < FONT_SCALES.length - 1) setFontScale(FONT_SCALES[idx + 1]);
          break;
        }
        case "-": {
          const idx = FONT_SCALES.indexOf(fontScale as any);
          if (idx > 0) setFontScale(FONT_SCALES[idx - 1]);
          break;
        }
        case "f":
        case "F":
          if (!e.ctrlKey && !e.metaKey) toggleFullscreen();
          break;
        case "1":
          setPanelLayout("problem");
          break;
        case "2":
          setPanelLayout("split");
          break;
        case "3":
          setPanelLayout("code");
          break;
        case "s":
        case "S":
          if (!e.ctrlKey && !e.metaKey) onToggleStats?.();
          break;
      }
      resetHideTimer();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, fontScale, setFontScale, toggle, setPanelLayout, onToggleStats, resetHideTimer]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    } else {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!active) return null;

  const fontIdx = FONT_SCALES.indexOf(fontScale as any);
  const colorIdx = COLOR_SCHEMES.indexOf(colorScheme as any);

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-1.5 rounded-full border bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur-md transition-all duration-300",
        !visible && "translate-y-20 opacity-0 pointer-events-none"
      )}
      onMouseEnter={resetHideTimer}
    >
      {/* Font size */}
      <Button variant="ghost" size="icon-sm" onClick={() => fontIdx > 0 && setFontScale(FONT_SCALES[fontIdx - 1])} disabled={fontIdx <= 0}>
        <Minus className="size-3.5" />
      </Button>
      <span className="min-w-[3rem] text-center text-xs font-mono tabular-nums">{fontScale}x</span>
      <Button variant="ghost" size="icon-sm" onClick={() => fontIdx < FONT_SCALES.length - 1 && setFontScale(FONT_SCALES[fontIdx + 1])} disabled={fontIdx >= FONT_SCALES.length - 1}>
        <Plus className="size-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Color scheme cycle */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setColorScheme(COLOR_SCHEMES[(colorIdx + 1) % COLOR_SCHEMES.length])}
        title={`Theme: ${colorScheme}`}
      >
        <Palette className="size-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Panel layout */}
      <Button variant={panelLayout === "problem" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setPanelLayout("problem")} title="Problem only (1)">
        <PanelLeft className="size-3.5" />
      </Button>
      <Button variant={panelLayout === "split" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setPanelLayout("split")} title="Split view (2)">
        <Columns2 className="size-3.5" />
      </Button>
      <Button variant={panelLayout === "code" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setPanelLayout("code")} title="Code only (3)">
        <PanelRight className="size-3.5" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Fullscreen */}
      <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} title="Fullscreen (F)">
        {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
      </Button>

      {/* Submission stats */}
      {onToggleStats && (
        <Button variant="ghost" size="icon-sm" onClick={onToggleStats} title="Submission stats (S)">
          <BarChart3 className="size-3.5" />
        </Button>
      )}

      <div className="mx-1 h-5 w-px bg-border" />

      {/* Exit lecture mode */}
      <Button variant="ghost" size="icon-sm" onClick={toggle} title="Exit lecture mode (Esc)">
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
