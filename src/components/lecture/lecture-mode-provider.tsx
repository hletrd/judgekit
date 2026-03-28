"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type LectureColorScheme = "dark" | "light" | "solarized";
type LectureFontScale = "1.25" | "1.5" | "1.75" | "2.0" | "2.5" | "3.0" | "3.5" | "4.0";

type LectureModeContextValue = {
  active: boolean;
  toggle: () => void;
  fontScale: LectureFontScale;
  setFontScale: (scale: LectureFontScale) => void;
  colorScheme: LectureColorScheme;
  setColorScheme: (scheme: LectureColorScheme) => void;
  panelLayout: "split" | "problem" | "code";
  setPanelLayout: (layout: "split" | "problem" | "code") => void;
};

const LectureModeContext = createContext<LectureModeContextValue | null>(null);

export function useLectureMode() {
  const ctx = useContext(LectureModeContext);
  if (!ctx) {
    return {
      active: false,
      toggle: () => {},
      fontScale: "1.5" as LectureFontScale,
      setFontScale: () => {},
      colorScheme: "dark" as LectureColorScheme,
      setColorScheme: () => {},
      panelLayout: "split" as const,
      setPanelLayout: () => {},
    };
  }
  return ctx;
}

function persistPreference(key: string, value: string | null) {
  import("@/lib/actions/update-preferences").then(({ updatePreferences }) => {
    updatePreferences({ [key]: value }).catch(() => {});
  }).catch(() => {});
}

export function LectureModeProvider({
  children,
  initialActive = false,
  initialFontScale = "1.5",
  initialColorScheme = "dark",
}: {
  children: React.ReactNode;
  initialActive?: boolean;
  initialFontScale?: string;
  initialColorScheme?: string;
}) {
  const [active, setActive] = useState(initialActive);
  const [fontScale, setFontScaleState] = useState<LectureFontScale>(
    (["1.25", "1.5", "1.75", "2.0", "2.5", "3.0", "3.5", "4.0"].includes(initialFontScale) ? initialFontScale : "1.5") as LectureFontScale
  );
  const [colorScheme, setColorSchemeState] = useState<LectureColorScheme>(
    (["dark", "light", "solarized"].includes(initialColorScheme) ? initialColorScheme : "dark") as LectureColorScheme
  );
  const [panelLayout, setPanelLayout] = useState<"split" | "problem" | "code">("split");

  // Apply/remove CSS classes on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (active) {
      html.classList.add("lecture-mode");
      html.classList.remove("lecture-theme-dark", "lecture-theme-light", "lecture-theme-solarized");
      html.classList.add(`lecture-theme-${colorScheme}`);
      html.style.setProperty("--lecture-font-scale", fontScale);
    } else {
      html.classList.remove("lecture-mode", "lecture-theme-dark", "lecture-theme-light", "lecture-theme-solarized");
      html.style.removeProperty("--lecture-font-scale");
    }
  }, [active, colorScheme, fontScale]);

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev;
      persistPreference("lectureMode", next ? "on" : null);
      return next;
    });
  }, []);

  const setFontScale = useCallback((scale: LectureFontScale) => {
    setFontScaleState(scale);
    persistPreference("lectureFontScale", scale);
  }, []);

  const setColorScheme = useCallback((scheme: LectureColorScheme) => {
    setColorSchemeState(scheme);
    persistPreference("lectureColorScheme", scheme);
  }, []);

  return (
    <LectureModeContext.Provider
      value={{ active, toggle, fontScale, setFontScale, colorScheme, setColorScheme, panelLayout, setPanelLayout }}
    >
      {children}
    </LectureModeContext.Provider>
  );
}
