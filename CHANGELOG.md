# Changelog

All notable changes to NilaMind are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Version reconciliation (2026-08-03):** app versions (Android `versionName` / iOS
> `MARKETING_VERSION` / `package.json`) were drifting from the git release tags — the branch is named
> `release/v1.23.x`, which led to mislabeled tags like `v1.23.1`/`v1.23.2`, while the shipped app was
> already at **1.25.0**. Starting with **1.25.1**, one canonical number is used everywhere: git tag =
> Android/iOS store version = `package.json` = this changelog. The `v1.23.1`/`v1.23.2` tags are
> superseded by `v1.25.1` (same code, reconciled number).

## [Unreleased]

## [1.25.1] - 2026-08-03

### Added
- **Glanceable Today widgets** — glance-first cards on the Today tab (Data phase): Sleep, Mood Trend,
  Next Protocol Step, Quick Actions, Daily Rhythm, Weekly Insight, Current Streak, Upcoming Assessment.
  Lazy-loaded so widget services stay out of the chat's critical path. Every widget reads real on-device
  data (sleep log + self-reported nights, check-ins, protocol progress, social rhythm, streaks,
  wellbeing cadence, assessment prompts).
- **Design system + motion utilities** — `src/design/` token system (spacing, radius, elevation,
  typography, motion, touch targets, z-index, semantic color roles) and utility CSS (staggered fade-up,
  tap feedback, focus-ring, tap-target, toast/backdrop/scale/slide keyframes, reduced-motion +
  high-contrast + reduced-transparency overrides).
- **A11y skip-to-content link** targeting the Today hub for keyboard users.
- **Changelog + version discipline** — this file and `scripts/bump-version.sh` (single-command bump of
  `package.json` + Android `versionName`/`versionCode` + iOS `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`).

### Fixed
- Restored the Phase 9 episode-adaptive theming (`theme-elevated` / `theme-low` CSS) that had been
  deleted while `App.tsx` / `adaptiveTheme.ts` still apply those classes.
- TodayScreen WIP regression: `timeMode` / `userState` / `selectedIntentPhase` state was removed while
  still referenced (Today tab rendered blank / threw `timeMode is not defined`).
- Widget barrel destructure mismatch, a circular `MOOD_EMOJI` import, and `Insight.type` → `kind`.
- Mood Trend widget showed high-distress days as green (inverted semantics) — now amber/rose.
- Sleep widget read a nonexistent storage key (`nilamind_sleep_latest`) and never rendered data.
- `napTracking.test.ts` was coupled to the wall clock (nap fell outside the 14-day window as time
  passed); pinned to an explicit date. Separately labelled robustness fix — no semantics weakened.

## [1.25.0] - 2026-07-22
- UI fix pass (heuristic evaluation): Today micro-copy, You consistency, terminology, state-aware
  components (Batches 3–4). Bumped Android to `1.25.0` (versionCode 87).

## [1.24.2] - 2026-07-22
- Android `1.24.2` (versionCode 86).

## [1.24.1] - 2026-07-22
- UI polish: ModeScreen chat bubble border accent refinement; semantic bubble tokens, Nila reply
  haptic, feedback confirmation, chip press states.

## [1.24.0] - 2026-07-21
- Major UX revamp — card differentiation, crisis button placement, confetti, inline help, a11y focus
  rings, keyboard nav, loading/empty states, terminology fixes, state-aware components (Batches 1–4).

## [1.23.0] - 2026-07-21
- Major UX revamp P0–P4 complete (UI rating 7.2 → 8.5).

[Unreleased]: https://github.com/sampathmannam/nilamind/compare/v1.25.1...HEAD
[1.25.1]: https://github.com/sampathmannam/nilamind/compare/v1.25.0...v1.25.1
[1.25.0]: https://github.com/sampathmannam/nilamind/releases/tag/v1.25.0
[1.24.2]: https://github.com/sampathmannam/nilamind/releases/tag/v1.24.2
[1.24.1]: https://github.com/sampathmannam/nilamind/releases/tag/v1.24.1
[1.24.0]: https://github.com/sampathmannam/nilamind/releases/tag/v1.24.0
[1.23.0]: https://github.com/sampathmannam/nilamind/releases/tag/v1.23.0
