# Plan: UI/UX Modernization

**Status**: Long-term / Not started
**Goal**: Upgrade JudgeKit's frontend to a polished, modern design with smooth interactions and professional aesthetics.

---

## Current Stack

- **Next.js 16** (App Router, RSC + Client Components)
- **Tailwind CSS v4** + `tailwind-merge`
- **shadcn/ui v4** (Radix UI primitives)
- **Lucide React** icons
- **CodeMirror** for code editing
- **next-intl** for i18n (en/ko)
- No animation library installed

## Design Goals

1. **Professional dashboard aesthetic** — clean data-dense layouts, proper spacing, consistent hierarchy
2. **Smooth micro-interactions** — page transitions, skeleton loading, toast animations
3. **Responsive design** — full mobile support for student submission flow
4. **Dark mode polish** — not just inverted colors but purpose-designed dark palette
5. **Accessibility** — WCAG 2.1 AA compliance, keyboard navigation, screen reader support

## Phase 1: Animation & Motion

### Add Framer Motion
```bash
npm install motion
```

**Where to apply:**
- Page transitions (route changes)
- Card/list item entrance animations (staggered fade-in)
- Modal/dialog open/close
- Sidebar collapse/expand
- Toast notifications (slide + fade)
- Submission status transitions (pending → judging → accepted)
- Leaderboard rank changes (reorder animation)

### Skeleton Loading States
- Replace spinner/loading text with skeleton screens
- Add to: problem list, submission list, leaderboard, admin tables
- Use shadcn's `Skeleton` component with shimmer effect

## Phase 2: Layout Redesign

### Dashboard Shell
- **Collapsible sidebar** with icon-only mode
- **Breadcrumb navigation** replacing flat headers
- **Command palette** (Cmd+K) for quick navigation to problems/submissions/settings
- **Persistent top bar** with user avatar, notifications bell, role badge

### Problem View
- **Split-pane layout** — problem description on left, code editor on right (resizable)
- **Tab system** — Description | Submissions | Editorial | Discussion
- **Test case runner** — inline test execution with diff viewer
- **Sticky submit bar** at bottom of editor

### Submission View
- **Timeline visualization** — vertical timeline showing submission → queued → judging → verdict
- **Test case results** as expandable accordion with input/expected/actual diff
- **Code viewer** with syntax highlighting and line-level annotations

### Leaderboard
- **Real-time updates** via polling with smooth rank-change animations
- **Freeze indicator** — visual frost overlay when leaderboard is frozen
- **Participant cards** with avatar, score, and solve-time sparkline

## Phase 3: Component Library Upgrade

### shadcn/ui Enhancements
- Audit all existing component usage for consistency
- Add missing components: `Command` (palette), `Breadcrumb`, `Timeline`, `Stepper`
- Standardize color tokens: `--primary`, `--accent`, `--success`, `--warning`, `--error`
- Create JudgeKit-specific compound components:
  - `<VerdictBadge status="accepted" />` — color-coded with icon
  - `<LanguageBadge language="python" />` — with language icon
  - `<ScoreDisplay score={85} max={100} />` — circular progress
  - `<DiffViewer expected={...} actual={...} />` — side-by-side diff
  - `<CountdownTimer deadline={...} />` — for contests

### Typography
- Establish type scale: display, heading, subheading, body, caption, code
- Use variable font (Inter Variable or Geist) for better rendering
- Monospace: JetBrains Mono or Fira Code for code surfaces

### Color System
- Define semantic color palette (not just Tailwind defaults)
- Verdict colors: green (accepted), red (wrong answer), yellow (time limit), orange (runtime error), gray (pending)
- Contest mode: distinct visual theme (darker, more focused)

## Phase 4: Code Editor Upgrade

### CodeMirror Enhancements
- **Vim/Emacs keybindings** toggle
- **Font size control** (slider or Cmd+/-)
- **Auto-save drafts** to localStorage
- **Diff view** for comparing submissions
- **Minimap** for long code
- **Bracket matching** and **auto-indent** polish

### Language-Aware Features
- Syntax highlighting for all 86 language variants
- Language-specific snippets/templates (optional)
- Compile error highlighting with line markers

## Phase 5: Mobile Responsiveness

### Priority Pages for Mobile
1. Problem list — card layout on mobile
2. Problem view — stacked layout (description above, editor below)
3. Submission list — compact cards
4. Leaderboard — horizontal scroll for wide tables
5. Contest timer — sticky top banner

### Mobile-Specific
- Bottom navigation bar on mobile
- Swipe gestures for tab switching
- Touch-friendly code editor controls
- Pull-to-refresh on lists

## Phase 6: Dark Mode Polish

- Redesign dark palette (not just `dark:` prefixes)
- Separate background layers: base, surface, elevated, overlay
- Ensure sufficient contrast ratios (4.5:1 minimum)
- Code editor: dark theme matching dashboard
- Charts/graphs: dark-mode aware colors
- Print stylesheet: force light mode

## Implementation Order

1. Framer Motion + page transitions + skeleton loading (quick wins)
2. Component library audit + semantic colors + typography
3. Dashboard shell redesign (sidebar, breadcrumbs, command palette)
4. Problem view split-pane + submission timeline
5. Mobile responsiveness pass
6. Dark mode polish
7. Code editor enhancements

## Dependencies to Add

```json
{
  "motion": "^12",
  "cmdk": "^1.1",
  "vaul": "^1.2",
  "next-themes": "^0.4",
  "@fontsource-variable/inter": "^5",
  "@fontsource/jetbrains-mono": "^5"
}
```

## Success Criteria

- Lighthouse Performance score >= 90 on dashboard pages
- Lighthouse Accessibility score >= 95
- All pages responsive down to 375px width
- Dark mode has no contrast violations
- Page transitions feel smooth (no layout shift, no flash of unstyled content)
- Students and instructors find the UI intuitive without documentation
