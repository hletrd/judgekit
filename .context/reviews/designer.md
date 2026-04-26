# Designer — RPF Cycle 6/100

**Date:** 2026-04-26
**Cycle:** 6/100
**Lens:** UI/UX review of recent changes; web frontend exists (Next.js + Tailwind + shadcn UI)
**Method:** source-level review; no live runtime (Postgres + Docker not available in sandbox per cycle-3 history note)

---

**Cycle-5 carry-over verification:**
- DES5-1 (filter chips not keyboard-accessible in `anti-cheat-dashboard.tsx`): UNCHANGED — carried deferred.
- DES5-3 (dark-mode contrast not verified): UNCHANGED — carried deferred (no live runtime).

---

## DES6-1: [LOW, NEW] AntiCheatMonitor privacy notice dialog cannot be dismissed with Esc or backdrop click — UX is intentionally restrictive but lacks a "decline" path

**Severity:** LOW (UX — same as carried-deferred AGG3-8 / DES3-1)
**Confidence:** HIGH

**Evidence:**
- `src/components/exam/anti-cheat-monitor.tsx:274-298` renders a `<Dialog>` with `disablePointerDismissal` and `showCloseButton={false}`. The only path forward is the "I accept" button.

**Status:** This is a known carried-deferred item (AGG3-8 / DES3-1). The cycle-3 deferral reason was "UX/legal judgment call." Reaffirmed: no action this cycle unless product/legal decides to add a decline path.

---

## DES6-2: [LOW, NEW] Privacy notice dialog uses `<DialogContent showCloseButton={false}>` but does not set `aria-labelledby` / `aria-describedby` explicitly

**Severity:** LOW (a11y — relies on shadcn/Radix internal wiring)
**Confidence:** MEDIUM

**Evidence:**
- `src/components/exam/anti-cheat-monitor.tsx:277-296` uses `<DialogTitle>` and `<DialogDescription>` (Radix primitives). Radix-UI Dialog wires `aria-labelledby` and `aria-describedby` automatically when these are present, so this is likely a non-issue in practice.

**Why it MIGHT be a problem:** If a future maintainer wraps `<DialogTitle>` in a custom component that doesn't forward the `id`, the auto-wiring breaks silently.

**Fix:** Verify against the Radix Dialog documentation that `<DialogTitle>` always provides `aria-labelledby`. If yes, no action. If no, add explicit `aria-labelledby="..."`.

**Exit criteria:** Either a no-action confirmation citing Radix docs, OR explicit ARIA attributes. Gates green.

---

## DES6-3: [LOW, NEW] Privacy notice's bullet list (`<ul ... list-disc list-inside>`) doesn't have a localized heading — visual hierarchy depends on font weight only

**Severity:** LOW (a11y — heading hierarchy)
**Confidence:** MEDIUM

**Evidence:**
- `src/components/exam/anti-cheat-monitor.tsx:287-292`:
  ```tsx
  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
    <li>{t("privacyNoticeTabSwitch")}</li>
    <li>{t("privacyNoticeCopyPaste")}</li>
    <li>{t("privacyNoticeIpAddress")}</li>
    <li>{t("privacyNoticeCodeSnapshots")}</li>
  </ul>
  ```
- The DialogDescription provides context but there's no `<h3>`/`<h4>` introducing the bullet list.

**Why it's a problem:** Screen readers may announce the description and then jump straight into list items without a clear "what kind of monitoring" heading. For exam takers using assistive tech, the list could feel disconnected.

**Fix:** Either (a) add a small heading or `aria-labelledby` to the list, OR (b) prepend a localized intro string within DialogDescription. Defer if no a11y audit is queued.

**Exit criteria:** Either ARIA hierarchy improved or explicit defer rationale. Gates green.

---

## Final Sweep — UX Surfaces Not Modified This Cycle

- `anti-cheat-dashboard.tsx`: filter chips a11y still pending (DES5-1). No new findings.
- Public navigation: cycle-5 verified the dropdown is the canonical home for non-admin nav. No new findings.
- Sidebar: admin-only after cycle 4-5. No new findings.

**No agent failures.**

**Multimodal note:** This review is text-based; no screenshots were captured because no live runtime is available. Future runtime reviews can re-validate via agent-browser when the sandbox supports Postgres + Docker.
