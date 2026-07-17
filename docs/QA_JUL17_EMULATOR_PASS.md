# QA pass — Jul 17 2026, emulator (MindAnchor AVD, Android 14) — base v1.18.17

Method grounded in: OWASP MASVS/MASTG (security), Nielsen heuristics + Android safe-area/a11y (UI),
knip + jscpd (dead code / duplication), fresh-install zero-data dynamic run (`pm clear`), and a 15-day
time-travel simulation (`adb root` + clock, plus a deterministic service-level harness). Full suite:
**272 files / 3063 tests green** (TZ=Asia/Kolkata).

## FIXED (this pass)

### P0 — device crashes (app was unusable on normal hardware)
- **mlock OOM kill-storm** — `use_mlock: true` was unconditional; on a 2 GB device lmkd killed the
  FOREGROUND app + launcher + GMS mid-check-in (reproduced on the emulator). Now `shouldMlock(deviceMemory)`
  pins only on 8 GB+ devices; below that it uses plain mmap (evictable, no OOM). `llamaCppLlmAdapter.ts` + tests.
- **n_threads contention collapse** — hardcoded `n_threads: 8`; on a 3-vCPU device that meant ~50 s/token
  (measured). Now `optimalThreads(cores)` = 8 on 8+ cores, else cores−1 (floor 2). Tests added.

### Wiring
- **W1 dead elevation nudge** — `chooseNudge`'s only caller never passed `elevationSignal`, so the manic-first
  `ELEVATION_NUDGES` branch was unreachable. Wired `emaElevationSignal() !== "none"`. Tests added.
- **W2 learned-hour window escape** — the nudge fire-hour clamp destructured `windowStart` for BOTH bounds,
  so the upper clamp was a no-op and a learned hour could fire outside the user's window (e.g. 22:00 on a
  10:00–20:00 window). Now parses `windowEnd`.
- **W4 boot permission prompt** — `syncDailyReminders()` defaulted to `{request:true}`, firing the system
  notification dialog at cold boot for onboarded users. Now `{request:false}` (matches the EMA sync).

### Day-bucketing unification (systemic correctness)
- The whole day-key system is now on the **LOCAL calendar day** (`localDateKey`), replacing the prior
  cross-module **UTC convention** under which a late-night IST entry (00:00–05:30) stamped *yesterday* and was
  dropped from streaks / retention / the activity strip. Converted consistently: the `.split("T")[0]` sweep
  (41 files) **plus** the `.slice(0,10)` "UTC-day convention" cluster the sweep first missed — `streaks.ts`
  `ymd`, `retentionMetrics` `dayKey`, `clinicianPeriod`, `clinicianCharts` end-key, `YouScreen`,
  `YourDataScreen`. Basis-agnostic string-arithmetic sites (`socialRhythm.shiftYmd`, `retention.diffDays`,
  the chart's inner UTC-midnight walk) were correctly left as-is. No DST in the IST target market, so the
  `DAY_MS` day-walk stays exact. Stored historical UTC keys are left as-is (correct-forward, self-healing).
  Frame-specific streaks/retention/socialRhythm tests updated to the local frame, made TZ-robust.
- **15-day harness** (`fifteenDaySimulation.test.ts`): drives 15 consecutive daily sessions incl. 3 late-night
  ones through the real streak + retention services; asserts 15 distinct local day-keys, a 15-day streak,
  freeze-bridging of a skipped day, 15-distinct-day retention with a 14-day span, and correct lapse detection.

### UI / UX
- **Safe-area (incl. the §9 crisis overlay)** — the app is edge-to-edge; on non-notch Android
  `env(safe-area-inset-top)` reports 0, so the old `12px` floor let headers draw under the status bar. The
  CrisisOverlay red header had **no** top inset at all — its heading rendered under the clock. Introduced a
  single `--safe-top: max(24px, env(safe-area-inset-top))` token; every top-inset site now uses it, and the
  crisis header gets `calc(var(--safe-top) + 1rem)`. Notched devices still win via the larger env().
- **U2 day-zero "due" framing** — a fresh install saw "Your 2-week wellbeing check is **due**" / "…check
  **due**". Nothing is overdue on day 0. Added `firstTime` to `AssessmentPrompt` + baseline i18n strings
  (4 locales); the first prompt now reads "Set your wellbeing baseline" / "set your baseline".

### Duplication / dead code
- **PeerSupportScreen retired** — a documented duplicate of ReachOut whose session-stats feature could never
  render (no production writers for `saveSession`/`createProfile`). Removed the tools row, route, screen,
  service, both test files, i18n keys, and nav entries; ReachOut (§9-gated) remains canonical.
- Deleted dead `EmptyStateIllustrations.tsx`. **Kept** `crisisTestCorpus.ts` — it's a 974-line C-SSRS-grounded
  crisis-eval corpus (a safety asset, "unused" only because its eval harness isn't in the default run).

## Verified clean (no change needed)
- **Security (MASVS)**: `allowBackup=false`; cleartext forbidden on all API levels; deep link routes only;
  FileProvider unexported; minimal permissions; no secrets (test fixture only); sensitive keys encrypted at
  rest (WebCrypto + IndexedDB, fail-safe passthrough); analytics 100% on-device; DEV-gated cloud adapters
  absent from the prod bundle; HTTPS model download with a pinned SHA-256.
- **§9 crisis path** (device-verified): explicit ideation → deterministic full crisis surface renders
  **instantly** (synchronous keyword floor, no model dependency) with grounding tools, ride-the-wave copy,
  and TIPP cold-water (with a beta-blocker medical caveat).
- Onboarding: AgeGate (under-18 → crisis lines + exit), 9-step optional flow, honest anti-overclaim copy,
  a11y skip-links; identity gate gates "Enter" behind the recovery-phrase confirmation.
- Model download: honest sizing/why copy; catalog matches the shipped artifact (Qwen2.5-1.5B, SHA-pinned).

## OPEN (reported, not fixed here — bigger scope)
- **Verify-pass is slow + bypassable** — post-download SHA-256 runs in-JS on the UI thread over the Capacitor
  bridge (~1 %/min ⇒ ~90 min for 1.1 GB), while a kill+relaunch accepts the byte-complete `.part` without
  re-hashing. Fix: hash in a Web Worker, keep the phase UI, re-verify (fast) on `.part` recovery.
- **Offline/no-model fallback** ~30 s skeleton before a scripted reply when no model is installed.
- 133 MB stale `gemma-3-1b-…gguf.part` from a retired catalog entry never cleaned — add catalog-diff GC at boot.
- jscpd 2.18 %: `gemmaPrompt↔qwenPrompt`, `cloudLlmAdapter↔freeApiLlmAdapter`, `Breathing*`, and the
  `notifications.ts` sync-guard cascade (×5, ~69 ln — where W1/W2 hid) — extract shared helpers.
