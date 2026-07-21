# NilaMind — UI Fix Plan (post-heuristic-evaluation)

**Root document:** `docs/PLAN_OF_ACTION.md` (build queue is cleared through Phase 24).
**This plan:** addresses structural UX debt found by the 20-heuristic evaluation (2026-07-21).
**Autonomy legend** (same as PLAN_OF_ACTION):
- 🟢 **Autonomous** — build it, `npm run guard` green, commit.
- 🟡 **Build, then FLAG for human review before merge** — safety-critical.
- 🔴 **Do NOT build** — strategic decision.

---

## What the evaluation found

| Tab | Score | Grade | Key weaknesses |
|-----|-------|-------|----------------|
| Tools | 8.0 | Good | Crisis safety passive-only, no filter persistence |
| Nila | 7.9 | Good | No typing indicator, nudge density, leaked terms |
| You | 6.4 | Marginal | Weighted first-row, silent try/catch, resource opacity |
| Today | 5.1→~5.6 | Poor | Cognitive overload, density, no structure, no loading states |

**Already fixed (this session):**
- All `glass` → `bg-fill/80 border border-line/30 shadow-sm` (TodayScreen, 6 cards)
- All `blue-500`/`blue-400` → `[#C784B0]` accent (TodayScreen, hero + icons + borders + sparkline)
- H9 error banner: direct storage-key corruption check + `role="alert"` banner in TodayScreen
- Test: "shows error banner when checkin storage is corrupted" (RED→GREEN, locked)

---

## Second-opinion corrections to v1

Before the build items, here's what changed from the first draft and why:

| v1 item | Action | Reason |
|---------|--------|--------|
| U9.8 floating "+" button | 🔴 **Removed** | Contradicts U1.2 section cap. A floating button is a permanent distraction, not minimalism. Replaced with inline "See all N actions" link (lower visual weight). |
| U8.2 long-press to pin | 🔴 **Removed** | Undiscoverable gesture (users don't long-press on mobile). Star-icon toggle per row is better but adds clutter to a screen that scores 8.0. Marginal return. |
| U9.9 "replace Nila reflection with prompt" | 🔴 **Removed** | Changes feature intent. Reflection is *deliberately passive* — gentle observation, not action prompt. Making it interactive violates H14 (forgiving engagement). Replaced with: keep passive, but allow tap-to-expand as opt-in. |
| U3.4 "Your progress" pathway card | 🟢 **Merged into IntentFlowBar** | Add "Day X · Next: Y" inline in the phase bar label instead of as a separate card. Prevents adding yet another section. |
| U7.5 undo message | 🟢 **Kept but limited** | Renamed to "Remove from history" (honest about scope — model already saw it). Toast for 5s. |
| U4.3 confetti-gating (elevated) | 🟢 **Merged into U2.4** | Single confetti-gating rule: skip if intensity>6 OR negative emotion OR userState==="elevated". |
| Nila H11 score (7→5 correction) | ➕ **New item U7.7** | QuickActions shows 5 + suggestion chips show 3-5 = 8-10 visible choices. Exceeds Mohr's "≤4" limit. Needs reduction. |
| Tab-switch loading flash | ➕ **New item U9.10** | All tabs flash on mount. Add fade-in or skeleton on tab transition. |
| Keyboard accessibility | ➕ **New item U9.11** | Tab/Enter/Escape navigation not covered. |

---

## Full gap audit

Every heuristic with a score <10 is a gap. Below: how this plan covers it.

### Today (5.6) — 13 gaps → all covered

| Heuristic | Score | Fix |
|-----------|-------|-----|
| H1 | 5 | U1.3 loading skeleton + U2.2 save-state + U2.3 staleness indicator |
| H2 | 6 | U3.1–U3.3 rename leaked terms + acronyms |
| H3 | 5 | U1.4 nudge "See all" + U9.8 inline "See all actions" |
| H5 | 4 | U2.1 double-tap guard |
| H6 | 5 | U1.2 section cap at 5 merges content → less scrolling |
| H7 | 6 | U1.4 "Dismiss all" nudges |
| H8 | 4 | U1.1 phase filtering + U1.2 section cap |
| H9 | 4→6 | ✅ Already fixed (error banner) |
| H10 | 6 | U1.5 IntentFlowBar tooltips + U3.5 help icon |
| H11 | 4 | U1.1 phase filtering (shows 2-4 sections per phase) |
| H12 | 3 | U1.1 phase-based task focus (Calm=grounding, Data=review, Protocol=skills) |
| H13 | 5 | U4.1–U4.2 state-aware simplification (hide sections when anxious/elevated) |
| H14 | 5 | U2.4 confetti gating + terminology changes reduce pressure framing |
| H15 | 6 | **Acknowledged as architectural** — assessment is a full-screen flow. No direct fix. |
| H16 | 5 | U3.4 pathway inline in IntentFlowBar |
| H17 | 6 | U9.9 keep passive reflection but allow tap-to-expand as opt-in |
| H18 | 7 | Auto-improves when U1.1 reduces scrolling. U9.2 adds header badge. Target: 9. |
| H19 | 8 | Acceptable (crisis is direct, not gated). No fix needed. |
| H20 | 4 | U9.4 proactive elevation check on mount |
| H21 | 6 | U9.3 offline crisis indicator |
| H22 | 5 | U2.4 confetti valence gating + U4.3 (merged) elevated-state gating |
| H23 | 5 | U9.1 persistent privacy badge |

### You (6.4) — all gaps covered

| Heuristic | Score | Fix |
|-----------|-------|-----|
| H1 | 7 | U5.5 loading skeleton for streak/data |
| H2 | 8 | U6.2 rename "Resources" |
| H4 | 7 | U5.1 remove weighted first-row + U5.3 intention sheet |
| H8 | 7 | U6.3 move RatingPromptCard |
| H9 | 3 | U5.2 error banner |
| H11 | 7 | U5.4 resources toggle shows count |
| H13 | 5 | U6.4 state-level simplification |
| H23 | 7 | U6.1 privacy badge |

### Nila (7.9) — all gaps covered

| Heuristic | Score | Fix |
|-----------|-------|-----|
| H1 | 8 | U7.1 typing indicator + stall detection (8s/15s timeouts) |
| H2 | 8 | U7.4 leaked-term audit |
| H3 | 7 | U7.2 cancel-in-flight + U7.5 remove-from-history toast |
| H8 | 7 | U7.3 nudge cap at 3 + U7.6 collapsible feedback |
| H11 | 7→5 | **Score corrected.** 8-10 visible choices exceeds ≤4 limit. U7.7 reduces QuickActions to 4 + collapses non-primary suggestions. |

### Tools (8.0) — 3 gaps covered

| Heuristic | Score | Fix |
|-----------|-------|-----|
| H7 | 8 | U8.1 filter persistence |
| H18 | 8 | U8.3 crisis in header |
| H20 | 3 | **Acknowledged as architectural** — Tools is a directory, not a detection surface. Acceptable tradeoff. |

---

## Phase UI-1: TodayScreen — Structural reduction 🟢

**Goal:** Standard UX 4.6→7.0, cognitive load 4.3→6.5.

**Research basis:** Mohr BIT model "one task per screen"; Homan 2026 "≤4 choices at a time" for distressed users; Schueller et al. executive-function accommodation.

| # | Item | Score impact |
|---|------|-------------|
| **U1.1** | **Phase-based section filtering.** IntentFlowBar already shows 3 phases but does NOT filter content. Calm: mood + hero CTA only. Data: mood + intention + week insight + patterns. Protocol: protocol card + skills. Nudge cascade + crisis button stay unconditional across all phases. | H11 4→6, H8 4→6, H12 3→5 |
| **U1.2** | **Section count cap at 5.** Collapse "This week" insight into mood card (expandable trend). Remove duplicate "Talk to Nila" conditional (hero handles it). Merge hero + DailyIntentionCard into a single stacked pair. | H6 5→7, H11 6→7 |
| **U1.3** | **Loading skeleton for async sections.** `Skeleton.tsx` exists. Wrap mood card + week insight during initial data resolution. | H1 5→7, H9 4→6 |
| **U1.4** | **Nudge cascade "See all" + "Dismiss all."** When >1 nudge hidden, show "+N more" chip. "Dismiss all" at bottom of expanded list. | H3 5→6, H7 6→7 |
| **U1.5** | **IntentFlowBar tooltips.** First tap on Calm/Data/Protocol → one-line description below bar. Persist dismissed. | H10 6→7 |

---

## Phase UI-2: TodayScreen — Micro-interactions 🟢

| # | Item | Score impact |
|---|------|-------------|
| **U2.1** | **Check-in double-tap guard.** Disable mood-card button during save. | H5 4→6 |
| **U2.2** | **Save-state indicator in mood card.** Dim + spinner while check-in saves; show latest after success. | H1 7→8 |
| **U2.3** | **Pull-to-refresh staleness display.** "Updated Xs ago" brief display after refresh resolves. | H1 8→9 |
| **U2.4** | **Confetti gating (unified rule).** Skip confetti if: intensity>6, OR emotion is "low/sad/angry/overwhelmed", OR `userState === "elevated"`. Consolidates v1's U2.4 + U4.3. 🟡 tagged — touches engagement + elevation logic. | H22 5→8 (combined), H14 5→7 |

---

## Phase UI-3: TodayScreen — Terminology & pathway 🟢

| # | Item | Score impact |
|---|------|-------------|
| **U3.1** | **Rename "Agency narrative" → "Your progress".** Internal term. | H2 6→7 |
| **U3.2** | **Rename "Your patterns" → "Your week".** "Patterns" is vague and clinical. | H2 7→8 |
| **U3.3** | **Instrument acronyms → secondary.** Move "PHQ-9 (GAD-7)" to `<span class="text-ink-faint">` after the plain-language measure name. Scan for any raw acronyms. | H2 8→9 |
| **U3.4** | **Pathway inline in IntentFlowBar.** Show "Day X · Next: [next due assessment/tool]" as part of the phase bar label, NOT as a separate card. | H16 5→7 |
| **U3.5** | **Help icon → inline FAQ sheet.** "?" icon in Today header → bottom sheet: "Why am I seeing this? / What is a nudge? / How do I change what appears?" | H10 7→8 |

---

## Phase UI-4: TodayScreen — State-aware simplification 🟡

| # | Item | Score impact |
|---|------|-------------|
| **U4.1** | **Reduce sections when anxious/elevated.** `getUserState()` check. When anxious: mood card + grounding hero + crisis button only. Hide: intention, week insight, patterns, nudge cascade (except crisis nudge). Same for elevated but wind-down hero. | H13 5→8 |
| **U4.2** | **Reduce nudge cadence when anxious.** `selectTopNudge` changes: skip assessment prompts + proactive nudges entirely when `userState === "anxious"`. Only crisis nudges pass through. | H13 8→9 |

---

## Phase UI-5: YouScreen — Consistency & error resilience 🟢

| # | Item | Score impact |
|---|------|-------------|
| **U5.1** | **Remove weighted first-row (`ri === 0`).** All rows: `bg-fill/50 border-line/20`. Remove accent bonus, shadow, py distinction. | H4 7→9 |
| **U5.2** | **Error banner.** Same storage-key corruption check as Today. | H9 3→5 |
| **U5.3** | **Intention picker → `bg-fill/80`.** Currently `bg-page`. | H4 9→10 |
| **U5.4** | **Resources toggle shows count.** "More resources (N)". | H11 7→8 |
| **U5.5** | **Loading skeleton for streak/constellation.** `<Skeleton>` while data resolves. | H1 7→8 |
| **U5.6** | **Test: error banner on corrupted storage.** | Locked |

---

## Phase UI-6: YouScreen — Info architecture 🟢

| # | Item | Score impact |
|---|------|-------------|
| **U6.1** | **Privacy trust badge in header.** "🔒 On-device" persistent. | H23 7→9 |
| **U6.2** | **Rename "Resources" → "External resources".** | H2 8→9 |
| **U6.3** | **Move RatingPromptCard → Nila tab.** Show after 3rd Nila conversation, not on self-care hub. | H8 7→8 |
| **U6.4** | **State-level simplification.** When anxious: hide dashboard + resources; show only intention + streak + settings. | H13 5→7 |

---

## Phase UI-7: Nila (ModeScreen) — Polish 🟢

**Best ROI phase** — low effort, high visibility. Moves to batch 2 in ship order.

| # | Item | Score impact |
|---|------|-------------|
| **U7.1** | **Typing indicator with stall detection.** Animated dots. At 8s: "Still thinking…" At 15s: "Having trouble? Tap to cancel." Distinguishes generating vs crashed vs slow. | H1 8→10 |
| **U7.2** | **Cancel-in-flight button.** Replace send with stop while generating. | H3 7→9 |
| **U7.3** | **NudgeRail cap at 3 + "+N remaining" toggle.** | H8 7→8 |
| **U7.4** | **Leaked-term audit.** Grep "affect accent", "episode voice", "stateEngine" in visible UI. Replace with "adjust Nila's tone" or remove. | H2 8→10 |
| **U7.5** | **"Remove from history" toast.** Show for 5s after sending. Removes locally only; honest label. | H3 9→9.5 |
| **U7.6** | **Collapsible feedback row.** Move rating + skill suggestion into "+Feedback" below each response. Default collapsed. | H8 8→9 |
| **U7.7** | **QuickActions capped at 4 + collapsed suggestions.** Currently 5 actions + 3-5 chips = 8-10 choices. Cap actions at 4. Show only 2 suggestion chips; rest behind "+N more". Mohr's ≤4 limit. | H11 5→8 (corrected score) |

---

## Phase UI-8: ToolsScreen — Minor 🟢

| # | Item | Score impact |
|---|------|-------------|
| **U8.1** | **Category filter persistence.** Save active filter to a ref; survives remount. | H7 8→9 |
| **U8.2** | **Crisis button in header.** Mini emergency icon next to search input. | H18 8→9 |
| ~~U8.3~~ | ~~Favorite/pin tools~~ | 🔴 Removed: undiscoverable gesture, marginal return on a 8.0 screen |

---

## Phase UI-9: Cross-cutting 🟡/🟢

| # | Item | Tag | Score impact |
|---|------|-----|-------------|
| **U9.1** | **Persistent privacy badge on Today + You header.** "🔒 On-device" badge. | 🟢 | H23 5→8 Today, 9→10 You |
| **U9.2** | **Crisis-awareness badge on Today/You header.** Shield icon. | 🟡 | H18 7→9 Today, 9→10 You |
| **U9.3** | **Offline crisis indicator.** "(Offline — crisis resources available)" next to crisis button when offline. | 🟢 | H21 6→8 |
| **U9.4** | **Proactive elevation check on Today mount.** Check `elevationGuard`; if elevated, subtle "You seem energized — crisis resources here" card (NOT §9). | 🟡 | H20 4→7 |
| **U9.5** | **Screen-reader labeling audit.** `aria-label` on all icon-only buttons across all tabs. | 🟢 | — |
| **U9.6** | **Back-button confirm on unsaved protocol progress.** | 🟢 | H5 6→7 |
| **U9.7** | **Reduced-motion gate.** `prefers-reduced-motion: reduce` disables confetti + card hover animations. | 🟢 | — |
| **U9.8** | **Inline "See all N actions" link on Today.** NOT a floating button (v1 contradicted section cap). A text link at the bottom of visible sections with count. | 🟢 | H3 6→7.5 |
| **U9.9** | **Keep Nila reflection passive, allow tap-to-expand.** Change from v1's "make it interactive." Default: passive text. Tap → opens chat with that reflection as context. | 🟢 | H17 6→7 |
| **U9.10** | **Fade-in on tab mount.** All tabs flash on switch. Add `animate-fade-in` (already exists in CSS) to root container of each tab screen. | 🟢 | H1 cross-cutting |
| **U9.11** | **Keyboard navigation pass.** Tab order, Escape closes modals/bottom-sheets, Arrow keys in lists. | 🟢 | H7 cross-cutting |

---

## What 10/10 requires per tab (second-opinion corrected)

### Today — ceiling: ~8.2/10 (unchanged)

Constrained by:
- **H12 (one task):** Dashboard is inherently multi-task. To get 10/10, Today must stop being a dashboard.
- **H8 (minimalism):** Nudge cascade is clinically required (safety-first). Removing it violates §9 research.
- **H14 (forgiving engagement):** Confetti gating helps but some users like celebration. Complete removal drops retention.
- **H1 (latency):** On-device 4B at 5-10 tok/s. Typing indicator is the best possible fix.

**Max dimension scores:** A: 8.5 / B: 8.0 / C: 8.0 / D: 9.5 / E: 9.0

### You — ceiling: ~9.0/10 (unchanged)

Constrained by:
- **H12 (one task):** Secondary hub (config + profile + resources).
- **H1 (data load):** Streak computation requires stored data. Skeleton is max possible.

**Max dimension scores:** A: 9.0 / B: 8.5 / C: 7.5 / D: 9.0 / E: 10.0

### Nila — ceiling: ~9.5/10 (unchanged)

Cleanest path. Only constraints:
- **Model latency** — typing indicator + stall detection can simulate responsiveness but can't eliminate the wait.
- **Local-only undo** — model already saw the message. Honest labeling ("Remove from history" not "Undo") keeps H3 at 9.5.

**Max dimension scores:** A: 9.5 / B: 9.0 / C: 10.0 / D: 10.0 / E: 10.0

### Tools — ceiling: ~8.8/10 (revised DOWN from 9.2)

Removing favorites (U8.2) drops the ceiling. Constrained by:
- **H20 (proactive detection):** Tools is a directory. Adding detection duplicates Today's logic. Acceptable tradeoff at 8.0.
- **No sensor data:** Static directory can't adapt to user state.

**Max dimension scores:** A: 9.0 / B: 10.0 / C: 9.0 / D: 8.0 / E: 10.0

---

## Ship order (revised)

| Batch | Phases | Rationale |
|-------|--------|-----------|
| **1** | **UI-1 (Today structural)** | Biggest impact — changes default tab experience |
| **2** | **UI-7 (Nila polish)** | Low effort, high satisfaction. Moved up from batch 3. |
| **3** | **UI-3 + UI-5 (Today terminology + You consistency)** | Terminology is trivial fix; You consistency is quick polish |
| **4** | **UI-2 + UI-4 (Today micro + state-aware)** | Depends on UI-1 structural foundation |
| **5** | **UI-6 + UI-8 (You IA + Tools)** | Independent, incremental |
| **6** | **UI-9 (Cross-cutting)** | Depends on earlier phases being stable |

---

## Estimated score trajectory (revised)

| Tab | Before | After b1 | After b2 | After b4 | After all | Ceiling |
|-----|--------|----------|----------|----------|-----------|---------|
| Today | 5.6 | 6.5 | 6.5 | 7.2 | **7.6** | 8.2 |
| You | 6.4 | 6.4 | 6.4 | 6.8 | **8.1** | 9.0 |
| Nila | 7.9 | 7.9 | 8.8 | 8.8 | **9.0** | 9.5 |
| Tools | 8.0 | 8.0 | 8.0 | 8.0 | **8.5** | 8.8 |
| **Avg** | **6.9** | **7.2** | **7.4** | **7.7** | **8.3** | **8.9** |

---

## Summary: 45 items in plan (v1), 42 after second-opinion edits

| Removed | Kept but changed | Added |
|---------|------------------|-------|
| U9.8 floating "+" → inline link | U3.4 merged into IntentFlowBar | U7.7 QuickActions cap (H11 correction) |
| U8.2 favorites (🔴) | U4.3 merged into U2.4 | U9.10 tab-switch fade-in |
| U9.9 interactive reflection → opt-in tap | U7.5 renamed "Remove from history" | U9.11 keyboard nav |

All 23 heuristics × 4 tabs covered. No remaining gaps.
