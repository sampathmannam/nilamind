# NilaMind V2 — Research & Design Program (2026-08-03)

Plan-of-record for the post-1.25 build queue: **Wave A (trust & polish) → Wave B (strengthen) →
Wave C (innovation wedge) → Wave D (signature + pilot)**. Grounded in a 2026-08-03 research pass
(~20 sources: npj Digital Medicine 169-RCT meta-regression, Nature Comms Med Limbic-Care RCT, BMJ
Mental Health JITAI/EMI meta-analysis, JAD bipolar digital-phenotyping, SmartBipolar, NIMH Life Chart
literature, narrative-identity/possible-selves, PRIORI/npj voice-diary) and the repo's own gap audits
(`docs/UI_GAP_ANALYSIS.md`, `docs/RESEARCH_BACKED_AUDIT.md`, `docs/APP_EVALUATION.md`).

**Golden rules (unchanged):** wellness never therapy · §9 crisis safety is deterministic &
model-independent · nothing leaves the device · personalization = memory-into-context · structure
beats free chat. **TDD mandatory · `npm run guard` green before every commit · wire what you build
(no dead code).** Autonomy tags: 🟢 build autonomously · 🟡 build, FLAG diff for human review ·
🔴 do not build.

---

## Wave A — Trust & Polish (UI_GAP_ANALYSIS-driven)

| # | Item | Source | Status |
|---|------|--------|--------|
| A1 | "Remove from history" → honest "Hide from view" + aria-describedby | M-1 / P-1 / MH-2 / A-4 | ✅ shipped (2026-07, big-pickle) |
| A2 | RatingPromptCard out of chat flow (never mid-conversation) | A-3 | ✅ shipped (2026-08-03) |
| A3 | Remove Tools context chips (redundant with QuickActions) | C-4 | ✅ shipped (2026-07, big-pickle) |
| A4 | NilaFace listening speed-doubling removed (E-3) + comment cleanup | E-3 | ✅ shipped (2026-07 + 2026-08-03 comment) |
| A5 | Delete orphaned `temporalRiskAssessment.ts` / `crisisSafetyValidation.ts` 🟡 | — | ✅ shipped (commit 2603527) |
| A6 | Breathing cycle 4.5s→12s (4-2-6 keyframe), config authoritative; aurora reduced-motion; soft-register mood toning wired | E-1 / E-2 / E-4 | ✅ shipped (2026-07 + 2026-08-03 keyframe/constants) |

**A6 detail (2026-08-03):** `nilaFaceMotion.ts` BASELINE `breatheSec` 3→12, SETTLED 6→18 (was
2.6× too fast to deliver parasympathetic benefit); `@keyframes nila-breathe` split into true
4-2-6 (inhale 0–33.3% → hold 33.3–50% → exhale 50–100%); `.nila-orb` CSS default already 12s;
CSS comment contract now matches the TS constants (they were contradictory before).

---

## Wave B — Strengthen (meta-regression of 169 RCTs: activity scheduling, stimulus control,
desensitization, imagery exposure, self-reinforcement most robust; more elements = more effective)

| # | Item | Tag |
|---|------|-----|
| B1 | BA → true activity scheduling (plan specific activities, not just "do things") | 🟢 |
| B2 | Imagery/interoceptive exposure pathway | 🟢 |
| B3 | Wire `optimalFireHour` into notifications + notification-ethics copy audit (MH-4) | 🟢 |
| B4 | Proactive sleep-protocol offer (sleep→next-day-intensity EMA, Littlewood 2016) | 🟢 |
| B5 | Evidence-language calibration — no guided-package effect sizes on isolated techniques | 🟡 |
| B6 | Gratitude gate during elevation + episode-marker symptom checklists (anosognosia) | 🟢/🟡 |
| B7 | Guided Programs → 5–7-day micro-programs | 🟢 |

---

## Wave C — Innovation Wedge

| # | Item | Tag |
|---|------|-----|
| N1 | NIMH Life Chart visual (Leverich & Post 1996; Born 2014 r=-.718 IDS-C) | 🟢 |
| N2 | Weekly Voice Diary affect biomarker (npj Digit Med R² 0.34–0.41; PRIORI) | 🟡 |
| N3 | Personal Digital Baseline (JAD 2026: idiosyncratic markers > population rules) | 🟡 |

---

## Wave D — Signature + Honesty

| # | Item | Tag |
|---|------|-----|
| D1 | "Possible Self" program (Markus & Nurius 1986; narrative identity) | 🟢 |
| D2 | "Truth Guard" — user-facing anti-sycophancy surface | 🟢/🟡 |
| D3 | Safety-plan rehearsal (high-leverage, evidence-gap) | 🟡 |
| D4 | Forecast with honest uncertainty (no false precision) | 🟢/🟡 |
| D5 | In-app opt-in Pilot mode (closes APA Level-3 "no study of the app" gap) | 🟡 |

---

## Explicit exclusions (do NOT build without owner sign-off)

- Cloud/Tier-2 model layer (reverses the deliberate on-device decision; strategy thesis 2026-07-06).
- India-market localization push (P4 paused by owner).
- Trauma/IFS protocol work.
- Widget audio capture.

## Sequencing rule

Top-down through the table within each wave; every item ships wired to a user surface in the same
change. 🟡 diffs flagged pre-merge for human review. No deletions of `safety.ts` / `crisisClassifier*`
/ `elevationGuard` / `nilaSafetyGate` / `secureLocal` / `secureStore` code without a separate flagged step.

## Status log

- **2026-08-03** — Wave A complete (items above). TDD per item; 4,234 tests green; tsc clean; guard green.
