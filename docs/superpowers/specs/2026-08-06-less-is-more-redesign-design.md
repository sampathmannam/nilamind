# NilaMind — Less-Is-More Redesign (Design Spec)

**Date:** 2026-08-06 · **Branch:** `feat/ui-ux-redesign-less-is-more` · **Baseline:** v1.27.0 + the branch's in-flight WIP (absorbed, see R1) · **Target release:** v1.28.0

## 1. Problem

User-reported: "lot of clutter in the app, repeated screens and UI/UX issues." Codebase exploration (2026-08-06) confirms and quantifies:

- **Duplication:** 5+ check-in implementations; 3 journaling surfaces reachable via 2 routes to the same screen; 4 overlapping calm surfaces (WindDown and EpisodeSupport re-implement their own breathing inline); 21 near-sibling card components; 4 sheet/modal implementations; Settings reachable 4 ways.
- **Clutter:** Nila tab shows ~10 interactive controls before a single message; Home has 5 mood buttons that all fire the identical `go("ema_checkin")` (the selection is discarded); Tools is 14 flat identical rows.
- **Dead weight:** 12 orphaned components (incl. `TodayWidgets.tsx`, 572 lines); `youRows.ts` is a dead parallel definition of the You tab (YouScreen hardcodes 7 English rows instead), orphaning 4 destinations; `useNudges` computes 7 nudge signals on a 5-minute poll and renders none of them.
- **Safety regressions/gaps:** the crisis Help pill (shipped on all 4 tabs in v1.20.10) is now missing from Tools and You; `EpisodeSupportScreen` (832 lines, crisis-adjacent) and `GuidedProgramsScreen` have no tappable entry point; Safety Plan has no calm-time entry.

## 2. Goals / Non-goals

**Goals:** clutter-free, no repeated surfaces, one honest path per job, research-backed decisions, §9 crisis layer preserved exactly, all existing user data preserved, shipped visual identity kept.

**Non-goals:** rebrand or new navigation paradigm; new features beyond re-surfacing already-built orphans; model/backend/data-schema changes; changes to §9 logic, copy, or tests.

## 3. Research basis

Every structural move below traces to one of these (no fabricated citations; all are established literature or prior in-repo validated findings):

1. **Cognitive load is elevated in the user base.** Depression involves measurable executive-function and attention deficits (Rock et al., *Psychological Medicine* 2014 meta-analysis). UI consequence: fewer simultaneous choices, one primary action per screen.
2. **Real-world MH-app engagement is brief and fragile.** Objective usage data shows low daily open rates and short sessions (Baumel et al., *JMIR* 2019); usability burden is a leading driver of abandonment (Torous et al., *Evidence-Based Mental Health* 2018). UI consequence: the core loop (check-in, talk, calm) must cost seconds, not navigation.
3. **Hick–Hyman law:** decision time grows with the number and complexity of choices. 14 flat identical rows is the worst shape for a distressed user.
4. **Progressive disclosure** (Nielsen): show the core, defer the advanced behind meaningful hubs. Choice overload is context-dependent (Iyengar & Lepper 2000; Scheibehenne et al. 2010 meta-analysis), so the remedy is curation and grouping — not deleting clinical capability.
5. **Recognition over recall** (Nielsen heuristic): hub names must be plain-language ("Calm", "Journal", "Skills"), never tool IDs or jargon (already an in-repo rule since v1.20.13).
6. **Streaks can shame, not motivate, in depression** (Six et al. 2021; forgiveness model). The WIP's 0-streak welcome fallback stays.
7. **Safety planning works when built before the crisis** (Stanley & Brown 2012, the intervention the app already implements). Consequence: Safety Plan needs a calm-time entry point, not only the crisis overlay.
8. **Platform IA guidance:** 3–5 bottom tabs (Apple HIG / Material). The 4-tab shell is already correct; it stays.
9. **In-repo validated design equity:** the warm lavender/Lora direction was independently validated against the ui-ux-pro-max MH-app recommendation (Jul 18); the 4-tab IA and 2-tap check-in survived four shipped UX passes + device verification. Familiarity is load-reduction; we keep both.

## 4. Information architecture (unchanged shell)

4 tabs: **Nila · Home · Tools · You** (WIP already renamed "Today"→"Home"; keep). Aux screens stay Sheet-based on the single nav stack. Android back keeps rooting to Home. Crisis overlay stays above everything.

## 5. Per-surface design

### 5.1 Home (`TodayScreen`) — one glance, one action

| Now | After |
|---|---|
| Gear · 5 mood buttons all → same route, selection discarded · recommended action · Recently (WIP) · RatingPromptCard inline (WIP) · Help pill | Header (greeting + gear + Help) · mood strip where **the tapped face carries into the check-in pre-selected** (honest affordance, saves a tap; research #2) · **one** recommended-action card · Recently (≤3, tap-through now records use) · **one ambient slot** · nothing else |

**The ambient slot** is the single place any prompt/nudge card may appear on Home — max 1 at a time, dismissible, priority-ordered using the existing `selectVisibleNudges` priority (safety-plan follow-up > review > others), with the rating prompt at lowest priority. This re-homes the dormant-but-shipped nudge engine's output (JITAI investment from v1.27.0 stays alive) and bounds prompt fatigue structurally: the UI cannot stack cards. Nila tab keeps only §9's `SoftCrisisCard` + protocol card — ambient nudges never render there anymore.

### 5.2 Nila (`ModeScreen`) — the conversation is the screen

Keep the WIP shrink (48px inline avatar row; voice on tap, long-press crisis path unchanged). Keep Breathe/Ground as the compact 2-button toolbar (crisis-adjacent, must stay 1 tap). Suggestion chips: show up to 3 in a horizontal scroll, delete the "+N more" hidden toggle. Replace the hand-rolled new-chat confirm modal with the shared `ConfirmDialog`. Conversational check-in card, capture sheets, §9 surfaces: untouched.

### 5.3 Tools (`ToolsScreen`) — 14 flat rows → 4 sections, 9 rows, 3 restored destinations

Single source of truth returns to `toolsRows.ts` (delete the `SECTIONS` whitelist that silently drops built rows). Pinned row keeps real per-tool icons (not the generic Pin). Help pill added to header (regression fix). Sections in order:

1. **In the moment** — Episode support (restores the orphaned 832-line screen) · Safety plan (calm-time entry; research #7). Placed first: when someone opens Tools in distress, the top row is the right one.
2. **Calm** — **Calm hub** (launcher: Breathing & Grounding [existing 3-tab sheet] · Wind down · Sounds) · Reach out (stays top-level; it's support-seeking, not self-soothing).
3. **Track** — Quick check-in · **Journal hub** (one entry: Free write · DBT diary card · Thought record inside; the duplicate `dbt_diary_card` route dies) · Medication.
4. **Skills** — Screenings · **Skills hub** (launcher: Problem solving · Values work · Social rhythm · Exposure · Relapse prevention · Chain analysis · **Guided programs** [restores the orphaned 21-protocol hub]).

Net: 14 flat rows → 9 rows under 4 headers, while *adding* Episode support, Safety plan, and Guided programs back to the reachable surface. Fewer visible choices, strictly more capability (research #3, #4).

### 5.4 You (`YouScreen`) — one source, six rows

Adopt `youRows.ts` as the single (already-i18n'd) source; delete the hardcoded English rows. Curated rows: **Patterns** (DashboardScreen; absorbs InsightsScreen, which duplicates its data — InsightsScreen deleted after folding any unique content) · Your data · Nila memory · Learn · Caregiver · Settings. About Nila moves to a Settings row (transparency content preserved, one fewer top-level destination). ProgressDashboard (orphan duplicating the streak card) deleted. Streak card keeps the WIP welcome fallback. Help pill added (regression fix). `dataErrors` banner stays.

### 5.5 Crisis (§9) — restore, standardize, never touch logic

- `CrisisHeaderButton` on **all 4 tab headers**, same position/size (restores the v1.20.10 invariant).
- Byte-identical: CrisisOverlay, SoftCrisisCard, CrisisCard, CrisisLines, crisis long-press, `suppressNudgesForCrisis` latch, `activateCrisis` ordering, all gates' `CrisisHelpButton`, §9 golden tests (401), safety.boundary + secureData.boundary + nav.contract tests.
- The deliberate raw `rose-*` classes in crisis components get explicit `--color-danger`-family tokens **only if the rendered values are verified identical**; otherwise left as-is and documented.

### 5.6 System-level consolidation

- **Dialogs:** Sheet + ConfirmDialog are the only two modal primitives outside §9 (ModeScreen's hand-rolled confirm migrates).
- **Cards:** screens touched by this redesign compose the `Card` primitive instead of hand-rolling `bg-card border…`. No app-wide big-bang card rewrite.
- **Dead code deleted:** TodayWidgets, IntentFlowBar, MoodBar, OnboardingMomentum, PullToRefresh, lowFrictionReCheckIn, ConversationalCheckinCard, DailyContentCard, ProactiveNudgeRail, PleaseAuditNudgeCard, ProgressDashboard, InsightsScreen (after merge), youRows/YouScreen divergence, `dbt_diary_card` route. NudgeRail/PactNoticeCard/SafetyPlanNudgeCard: reused or deleted depending on what the Home ambient slot consumes (decided in the plan, not ad hoc). Orphans that are part of live roadmap investments (none identified beyond the nudge cards) are not deleted silently.
- **Tokens:** every file touched by this redesign finishes its raw-ramp → semantic-token migration (the agreed touch-it-fix-it rule).
- **i18n:** Tools/You rows come from the i18n'd builders; Sheet titles (`AUX_LABELS`) get localized (en/hi/ta/te) — closes the open gap from Jul 19.

## 6. What must not change (hard invariants)

§9 logic/copy/tests and crisis reachability in ≤1 tap from every tab · 2-tap check-in reducer semantics (v1.20.11) · capture DRAFT→CONFIRM rails · all `nilamind_*` storage keys and data formats (zero migration) · on-device seam · warm palette/Lora identity/500ms calm motion · a11y floor (44px targets, focus traps, aria roles, contrast) · transparency copy (About Nila content moves but does not change).

## 7. Acceptance criteria (measurable)

1. Home ≤6 interactive zones; ambient prompts structurally capped at 1; mood tap pre-selects in check-in (no discarded selection).
2. Tools = 9 catalog rows under 4 headers, plus Pinned (≤3); Episode support, Safety plan, Guided programs reachable by tapping; zero rows built-but-dropped.
3. Crisis Help pill present and identically placed on all 4 tabs (new test).
4. Every `KNOWN_AUX_VIEWS` route reachable or deliberately removed — no silent orphans (contract test updated deliberately).
5. `youRows.ts`/`toolsRows.ts` are the only row sources; zero hardcoded row lists in screens.
6. Full suite green (≥3510 incl. §9 goldens 401, boundary + contract tests unmodified except deliberate nav-contract updates); tsc + build clean.
7. Zero raw-ramp classes in files touched by the redesign.
8. axe: 0 serious/critical on all 4 tabs + new hubs (existing e2e harness).
9. Browser + emulator/device smoke of: check-in from Home, each hub, episode support, crisis pill ×4, back-button matrix.

## 8. Phasing (each phase = commit, suite green; no adversarial review passes — per user 2026-08-06)

- **R1 Foundation:** commit/absorb the in-flight WIP (after baseline suite run), restore crisis pill ×4 + test.
- **R2 Home:** honest mood strip, ambient slot, rating card into slot, Recently records use.
- **R3 Tools:** single-source rows, 4 sections, Calm/Journal/Skills hubs, restore the 3 orphaned destinations, real Pinned icons.
- **R4 You:** youRows adoption, Patterns merge (Insights→Dashboard), About→Settings, i18n.
- **R5 Nila:** chips ≤3 scrollable, ConfirmDialog swap.
- **R6 Sweep + ship:** dead-code deletion, token tail, AUX_LABELS i18n, axe pass, device smoke, version → v1.28.0, tag + push per the versioning convention. GitHub release + APK publication only after explicit user confirmation.

## 9. Risks & mitigations

- **Hubs add one tap to Sounds/Wind down/skills** → mitigated by Pinned + Recently (frequency shortcuts) on both Home and Tools.
- **Moving nudges to Home changes their context** → slot consumes the existing priority logic; §9 suppression latch behavior unchanged; JITAI quick-actions open the same tools from Home.
- **Test churn from moved elements** → phases sized so each keeps the suite green; §9 goldens and boundary tests are never edited.
- **"From scratch" expectation vs. keeping the shell** → deliberate: literal ground-up rebuild would discard device-verified safety/QA equity and validated identity for zero research-backed gain; this spec rebuilds the *experience* (every screen's content model changes) on the proven shell.
