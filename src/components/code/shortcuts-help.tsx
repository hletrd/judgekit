"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ShortcutEntry = { keys: string; action: string };

export function ShortcutsHelp() {
  const t = useTranslations("editor");
  const [open, setOpen] = useState(false);

  const shortcuts: ShortcutEntry[] = [
    { keys: "Ctrl+Enter", action: t("shortcutSubmit") || "Submit code" },
    { keys: "Esc", action: t("shortcutExitFullscreen") || "Exit fullscreen" },
    { keys: "F", action: t("shortcutFullscreen") || "Toggle fullscreen" },
    { keys: "+/−", action: t("shortcutFontSize") || "Font size" },
    { keys: "S", action: t("shortcutStats") || "Toggle submission stats" },
    { keys: "1/2/3", action: t("shortcutLayout") || "Switch panel layout" },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    },
    [],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="ghost" size="icon-sm" title={t("shortcutsTitle") || "Keyboard shortcuts"} aria-label={t("shortcutsTitle")}>
          <Keyboard className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shortcutsTitle") || "Keyboard Shortcuts"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{s.action}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press <kbd className="rounded border bg-muted px-1 font-mono text-xs">?</kbd> to toggle this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
