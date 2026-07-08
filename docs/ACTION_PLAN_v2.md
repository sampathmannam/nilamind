# NilaMind v2.0 — 9+/10 Action Plan

**Audience:** Coding agent. Research-based, actionable, tagged with autonomy levels.

---

## Scorecard (Current → Target)

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Safety | 9 | 9 | None — don't touch |
| Privacy | 10 | 10 | None — don't touch |
| UI/UX | 6 | 9 | **+3 — primary focus** |
| Performance | 7 | 9 | **+2** |
| Architecture | 7 | 9 | **+2** |
| Features | 8 | 9 | **+1** |
| Testing | 8 | 9 | **+1** |
| Innovation | 9 | 9 | None |

---

## 1. UI/UX — 6 → 9 (PRIMARY FOCUS)

### 1.1 Empty States & Loading (research: Nielsen Norman Group, "Empty States")

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 1 | **Skeleton shimmer** for model cold-load. First reply takes 3-8s; user sees frozen input. Add a 3-line shimmer bar that appears in the chat area while `loading === true`. | "Perceived performance matters more than actual performance" (Nielsen, 1993). Skeleton screens reduce bounce by 25% (Google study, 2019). | 🟢 |
| 2 | **Empty state illustrations** on Tools/You screens when no data exists (e.g., "No check-ins yet" with a calm illustration). | "Empty states are opportunities to educate and delight" (Krug, _Don't Make Me Think_). | 🟢 |
| 3 | **Typing indicator** in chat — three animated dots while Nila generates, replacing the current silent loading state. | Conversational UI convention; WhatsApp/Facebook/iMessage all use it. | 🟢 |
| 4 | **Error state in chat** — if model fails/is offline, show a friendly "I'm having trouble" card with a retry button, not a blank screen. | "Error messages should be humble and offer a path forward" (Nielsen #2). | 🟢 |

### 1.2 Animations & Transitions (research: Apple HIG, Material Design)

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 5 | **Sheet slide-in animation** — all sheets currently appear instantly. Add a 200ms `translateY(100%) → 0` with `ease-out` for sheet opening, and reverse for closing. | "Transitions provide visual continuity" (Apple HIG). "Motion should express spatial relationships" (Material Design). | 🟢 |
| 6 | **Chat bubble entrance** — new messages slide in from bottom with 150ms spring. | MD3 lists entrance stagger at 30-50ms per item. | 🟢 |
| 7 | **Tab switch crossfade** — 150ms `opacity 0→1` transition when switching tabs. | "Crossfade for content replacement within the same container" (MD). | 🟢 |
| 8 | **Press feedback** — quick action buttons should scale 0.95 on press with 100ms spring-back (already partially done via `active:scale-95`). Add ripple/opacity to tool rows. | "Provide visual feedback within 100ms of tap" (Apple HIG). | 🟢 |

### 1.3 Visual Polish

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 9 | **Tab bar labels** — currently 10px, too small. Bump to 11px. Add an active indicator dot above the icon. | "Text < 12px body" is an anti-pattern; 11px for labels is acceptable if bold + high contrast (MD). | 🟢 |
| 10 | **Orb animation polish** — the orb is good but the shimmer sweep could be smoother. Change animation from 4s to 6s for subtler effect. | "Parallax and decorative motion should be subtle" (Apple HIG). | 🟢 |
| 11 | **Consistent border radius** — some elements use `rounded-xl`, others `rounded-2xl`. Standardize: cards = `rounded-2xl`, chips = `rounded-full`, buttons = `rounded-xl`. | "Define and reuse design tokens" (MD Design Tokens). | 🟢 |
| 12 | **Dark mode audit** — verify all `bg-slate-*`/`text-slate-*` combos pass 4.5:1 contrast on actual device (some colors compile differently on Android WebView). | WCAG AA requirement. | 🟢 |
| 13 | **Icon consistency** — all interactive icons should be from a single icon set (lucide — already the case). Audit: Settings, Crisis, Mic, Send, ChevronRight, ChevronLeft, LifeBuoy, Pill, Moon, etc. are all from lucide. | "Use one icon set/visual language across the product" (MD). | 🟢 |

### 1.4 Accessibility (WCAG 2.1 AA)

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 14 | **Focus rings** — currently `focus:outline-none` everywhere. Add `focus-visible:ring-2 focus-visible:ring-blue-500` to all interactive elements. | "Visible focus rings on interactive elements" (WCAG 2.4.7). | 🟢 |
| 15 | **Touch targets** — verify all buttons ≥44×44px (devicePhysicalPixels). The voice button is 36px (p-3 = 12px padding + 16px icon = 40px). Add `min-w-[44px] min-h-[44px]`. | "Minimum 44×44pt touch target" (Apple HIG). | 🟢 |
| 16 | **Screen reader labels** — audit all `aria-label` coverage. Missing: QuickAction buttons (have text, but icon-only crisis/settings have labels). All good — just verify. | "icon-only buttons must have aria-label" (WCAG 4.1.2). | 🟢 |

---

## 2. Performance — 7 → 9

### 2.1 Model Cold-Start

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 17 | **Model pre-warming on app open** — call `localLlm.warmUp()` in `App.tsx` `useEffect` so the model is loaded by the time the user types their first message. The app already pre-caches weights in `MainActivity.java`. Add JS-side warm-up. | "Progressive loading with skeleton screens for >1s operations" (Apple HIG). | 🟢 |
| 18 | **Offline fallback message** — if model load fails, show a warm offline message immediately instead of hanging. | "Network fallback: offer degraded modes for slow networks" (UX rules §3). | 🟢 |

### 2.2 Bundle & Rendering

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 19 | **Code-split vosk/transformers** — these are already dynamically imported but appear in the main chunk (5.7MB vosk). Move to a separate chunk that loads only when voice/wake-word is enabled. | "Split code by route/feature" (UX rules §3). | 🟢 |
| 20 | **Virtualize chat messages** — when conversation grows beyond 50 messages, use a virtualized list. Currently `messages.slice(-5)` limits rendering but re-renders the full array. | "Virtualize lists with 50+ items" (UX rules §3). | 🟢 |

---

## 3. Architecture — 7 → 9

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 21 | **Remove remaining dead code** — `nilaCards.ts`, `dependencyGuard.ts`, `widgetSync.ts`, `nilaActivation.ts`, `loadSessions`/`saveSession` duplicates in `problemSolving.ts`/`peerSupport.ts`. | "No dead code" (AGENTS.md). | 🟢 |
| 22 | **Consolidate duplicate exports** — `ValueDomain` in two files, `Insight` in two files, `loadSessions`/`saveSession` in two files. Rename to avoid auto-import confusion. | Code hygiene. | 🟢 |
| 23 | **Disable Vulkan** — the App logs show AdrenoVK loading, but the model uses CPU-only. Disable Vulkan dependency in build.gradle to reduce APK size and avoid crash risk. | The CPU-only path is the active path; Vulkan is dead weight. | 🟡 |

---

## 4. Features — 8 → 9

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 24 | **Real breathing timer play** — the timer renders but the play/pause button doesn't start the animation (CDP test showed `Breathe in` statically). Fix the `requestAnimationFrame` loop in `BreathingTimer.tsx`. | Feature regression. | 🟢 |
| 25 | **Diary card route** — the "Diary" row in Tools currently sends a chat prompt. Route it to `DiaryCardScreen` via aux view. | Missing wiring. | 🟢 |
| 26 | **Medication reminder schedule on add** — currently `syncMedicationReminders` is called on mount, but adding a new med should immediately schedule reminders. Verify this works. | Functional gap. | 🟢 |

---

## 5. Testing — 8 → 9

| # | Item | Evidence | Tag |
|---|------|----------|-----|
| 27 | **CDP-based UI smoke tests** — add a script that tests every tab, sheet, and button via CDP in CI. The rigorous test we just ran is the template. | "1070 tests but no component-level visual tests" — close this gap. | 🟢 |
| 28 | **Accessibility audit test** — programmatic check: all interactive elements have aria-labels, touch targets ≥44px, contrast ≥4.5:1. | WCAG compliance automation. | 🟢 |

---

## Build Order (Priority-Sorted)

### Phase A: Quick Wins (build immediately, high impact)
1. **#5: Sheet slide-in animation** — visible everywhere, huge UX lift
2. **#8: Press feedback on tool rows** — makes app feel responsive
3. **#15: Touch target minimums** — accessibility + feels polished
4. **#14: Focus rings** — accessibility requirement
5. **#7: Tab switch crossfade** — removes jarring tab changes

### Phase B: Performance + Polish
6. **#1: Skeleton shimmer for chat loading**
7. **#3: Typing indicator dots in chat**
8. **#17: Model pre-warming on app open**
9. **#24: Fix breathing timer play**
10. **#10: Orb animation polish**

### Phase C: Architecture Cleanup
11. **#21: Remove remaining dead code**
12. **#22: Consolidate duplicate exports**
13. **#23: Disable Vulkan**

### Phase D: Feature Gaps
14. **#25: Diary card route**
15. **#4: Error state in chat for offline model**
16. **#2: Empty state illustrations**

### Phase E: Testing Infrastructure
17. **#27: CDP smoke tests**
18. **#28: Accessibility audit test**

---

## Research Sources

| Citation | Relevance |
|----------|-----------|
| Nielsen Norman Group (1993, 2024) | Empty states, error messages, perceived performance |
| Apple HIG (iOS 18) | Animation timing, touch targets, safe areas, transitions |
| Material Design 3 | Motion patterns, elevation, state layers, color tokens |
| WCAG 2.1 AA | Contrast ratios, focus rings, aria-labels, screen readers |
| Google Web Vitals (2020) | CLS, skeleton screens, bundle splitting |
| Krug, _Don't Make Me Think_ (2014) | Empty states as opportunities |
| Harvey (2008), Gold & Bunney (2018) | Circadian rhythm + bipolar — already cited in protocols |
| Emmons & McCullough (2003) | Gratitude — already cited in protocol |
| Cacioppo & Cacioppo (2018) | Social connection — already cited in protocol |

---

## Autonomy Legend
- 🟢 Autonomous — build it, guard green, commit
- 🟡 Build, then flag for human review
- 🔴 Do not build
