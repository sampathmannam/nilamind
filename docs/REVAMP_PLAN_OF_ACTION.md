# NilaMind — UI/UX Revamp Plan of Action

**Written:** 2026-07-21 | **Status:** In Progress
**Overall Rating:** 7.5/10 | **Target:** 9/10

---

## Current State Assessment

### What's excellent (8-9/10)
- Safety architecture (9.5) — crisis always reachable, deterministic §9 gate, adaptive UI
- Privacy-first design (9) — self-hosted fonts, no network calls, encrypted local storage
- Trauma-informed color (8.5) — warm palette, no high-vibrancy red, sensory comfort mode
- Accessibility (8) — WCAG AA, 44px tap targets, prefers-reduced-motion, ARIA
- Capacity-aware UI (8.5) — orb slows, animations reduce, dashboard collapses during distress

### What needs work (4-5/10)
- Dashboard density (5) — 848 lines, 5 bands, overwhelming
- Visual hierarchy (5) — 8-12 similar glass cards, no clear hero metric
- Card consistency (5) — glass/fill/raised used inconsistently, no unified taxonomy
- Empty states (6) — 13 exist but inconsistently applied

---

## Priority Items

### P0 — Must Build (HIGH impact, do first)

#### 1. Hero Metric Component
Large-format number + sparkline + trend arrow for Dashboard.
Shows: "How am I doing?" at a glance.

#### 2. Card Taxonomy Standardization
Define 3 card types with strict rules:
- **StatCard**: Large number + label + sparkline → KPIs
- **ActionCard**: Icon + title + subtitle + ChevronRight → CTAs
- **InfoCard**: Title + body text → Narratives

### P1 — Should Build (HIGH impact)

#### 3. Dashboard 3-Level Progressive Disclosure
- Level 1: Hero metric + 3 stat pills + contextual CTA
- Level 2: Trends + insights (tap "See more")
- Level 3: Full bands (existing)

#### 4. TodayScreen Simplification
Max 5 visible cards:
1. Greeting + time-aware CTA (hero)
2. Mood check-in (if not done)
3. One contextual nudge (priority-based)
4. Daily insight (sparkline + one insight)
5. "Talk to Nila" (always last)

#### 5. Onboarding Flow Redesign
Show value BEFORE asking for data:
1. Welcome + privacy (5s)
2. "What brought you here?" (single tap)
3. Show personalized plan
4. First interaction (breathing or mood check)
5. "Continue to Nila"

### P2 — Nice to Have (MEDIUM impact)

#### 6. Heading Hierarchy Strengthening
- Screen title: text-2xl font-semibold
- Section headers: text-sm uppercase tracking-wider
- Hero numbers: text-4xl font-bold

#### 7. StatPill Row Component
Horizontal row of 3 compact stat pills for quick-glance metrics.

#### 8. Empty State System Unification
Consistent illustration + copy + CTA pattern for all screens.

#### 9. Remove Redundant Elements
- Dashboard "Step-away nudge"
- Redundant "Talk to Nila" cards
- "Your patterns" toggle (move to Dashboard)
- DashboardCharts raw data tables
- "Manage data" button (move to Settings)
- Consent screen in onboarding (merge into welcome)

### P3 — Future (LOW impact) ✅ COMPLETE

#### 10. Chart Component Library ✅
- TrendChart (line chart, 7d/30d) — already existed
- MoodBar (horizontal bar) — built with 9 tests
- ProgressRing (circular progress) — built with 9 tests

#### 11. Notification Nudge Prioritization ✅
Max 1 nudge visible at a time, priority-based. Implemented via `selectTopNudge()` + wired into TodayScreen.

### P4 — Verification & Polish (HIGH impact, gate ship) ✅ COMPLETE

#### 12. Accessibility Audit — New Components ✅
- MoodBar: `role="meter"` + `aria-label` ✅
- ProgressRing: `role="progressbar"` + `aria-label` ✅
- HeroMetric: `aria-label` on button + trend ✅
- StatPill: `aria-label` ✅
- ActionCard: `aria-label` with title+subtitle ✅ (fixed)
- InfoCard: `<section>` + `<h3>` + `aria-label` ✅ (fixed)

#### 13. Responsive Check — Small Screens ✅
- All components use flex + truncate + min-w-0 for narrow screens

#### 14. Dark/Light Theme Compatibility ✅
- All components use semantic tokens: `text-ink`, `text-ink-muted`, `glass`, `bg-white/5`

#### 15. Episode-Adaptive UI Compatibility ✅
- CSS transitions covered by global `prefers-reduced-motion: reduce` rule (line 283)
- Sensory comfort mode also disables transitions (line 292)

---

## Verification Checklist
- [x] All new components have tests
- [x] npm run guard green (tsc + vitest + reward-hacking)
- [x] Accessibility: ARIA, focus management, screen reader
- [x] Responsive: works on small screens
- [x] Dark/light theme compatible
- [x] Episode-adaptive UI compatible
- [x] i18n keys for new strings
- [x] Wired to user surfaces (no dead code)
