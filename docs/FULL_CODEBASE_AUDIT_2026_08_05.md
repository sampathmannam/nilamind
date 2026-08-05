# Full Codebase Audit — 2026-08-05

Systematic agent-driven review of every layer of NilaMind. 8 parallel review agents covered safety, brain path, insights/protocols, persistence, UI/IA, native Android, cross-cutting concerns, and build configuration. Fixes applied TDD-style (red→green) where possible; remaining items flagged for human decision.

**Baseline:** 395 files / 4,249 tests green, `tsc --noEmit` clean, `npm run build` green.

---

## Fixes Applied (TDD, guard green)

### FIX 1 — CRITICAL: HealthConnectPlugin never registered (native)
**File:** `android/app/src/main/java/com/nilamind/app/MainActivity.java`

`HealthConnectPlugin.kt` was compiled into the APK but never registered with the Capacitor bridge (`addPlugin()` was missing from `onCreate()`). Every call to `HC.isAvailable()`, `HC.requestPermissions()`, and `HC.readSleep()` silently failed — the entire Health Connect integration (sleep prodrome, circadian feedback, inflection signals) was dead on device.

**Fix:** Added `addPlugin(new HealthConnectPlugin())` after `super.onCreate()`. Also removed the dead `onStart()` override.

### FIX 2 — HIGH: Zero-width character evasion in elevationGuard + distortionSpotter
**Files:** `src/services/elevationGuard.ts`, `src/services/distortionSpotter.ts`

Both modules had their own `normalize()` functions that did NOT strip zero-width Unicode characters (U+200B–U+200D, U+FEFF). The safety module (`safety.ts`) explicitly documented this exact evasion class and strips them, but the elevation guard and distortion spotter had drifted. An attacker (or accidental paste from rich text) could evade mania-risk detection by inserting zero-width spaces between letters (e.g., "stop\u200B taking\u200B my\u200B meds").

**Fix:** Added `.replace(/[\u200B-\u200D\uFEFF]/g, "")` to both `normalize()` functions, matching `safety.ts`. Added 4 regression tests (2 per module) confirming zero-width chars no longer evade detection.

### FIX 3 — HIGH: secureLocal migrate() unconditional version bump + hydrate() silent data loss
**File:** `src/services/secureLocal.ts`

Two bugs:
1. `migrate()` bumped `migratedVersion` unconditionally — if any key failed to encrypt, the version was still raised, so failed keys were never retried on next boot. Their plaintext lingered in localStorage.
2. `hydrate()` silently dropped keys that failed to decrypt — data disappeared from the UI with no diagnostic evidence.

**Fix:**
- `migrate()` now only bumps version when ALL keys succeed (`allSucceeded` flag).
- `hydrate()` now logs specific failing key names and a count summary.

### FIX 4 — HIGH: Cordova config.xml wildcard access
**File:** `android/app/src/main/res/xml/config.xml`

`<access origin="*">` allowed the WebView to reach any origin, contradicting the "nothing leaves the device" privacy claim. While NilaMind doesn't use Cordova's navigation policy directly, Capacitor's Cordova compatibility layer reads this file.

**Fix:** Replaced with domain-specific access rules: `huggingface.co`, `github.com`, `api.github.com` only.

### FIX 5 — MEDIUM: FileProvider overbroad external-path
**File:** `android/app/src/main/res/xml/file_paths.xml`

`<external-path name="my_images" path="." />` exposed the entire external storage root via FileProvider. A narrower scope follows least-privilege.

**Fix:** Replaced with `<external-files-path name="nilamind_external" path="." />` which scopes to the app's own external files directory.

### FIX 6 — MEDIUM: ExampleInstrumentedTest wrong package assertion
**File:** `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java`

Asserted `com.getcapacitor.app` instead of `com.nilamind.app`. Would fail on any device.

**Fix:** Corrected the expected package name.

---

## Findings Flagged for Human Decision (NOT changed)

### CRITICAL — Dead Wiring (engines built+tested but never connected to UI)

| Engine | Dead Export | Impact |
|--------|------------|--------|
| `agent.ts` | `runAgent` — never called from any component | Entire intent pipeline (mood logging, reminders, dashboard, navigation) unreachable |
| `nilaMemory.ts` | `rememberSession` — never called | Cross-session memory summarisation never fires |
| `allianceSignal.ts` | `refreshAlliance()` — never called | Therapeutic alliance engine exists but never produces snapshots |
| `nilaInflection.ts` | `recordDetectionPass()`, `surfaceOpener()` — never called | Persistent inflection log never populated; 1/day surfacing dead |
| `values.ts` | `runValuesMigrationIfNeeded()` — never called | One-time migration from valuesWork never runs |
| `nilaInsights.ts` | `upsertUserInsight()` — never imported | User insight creation API unused |
| `patternInsights.ts` | `medicationMoodInsight()` — never called | Medication-mood correlation insight dead |

**Recommendation:** Wire these to user surfaces or explicitly delete per the AGENTS.md cardinal rule: "WIRE WHAT YOU BUILD."

### HIGH — UI Missing ErrorBoundaries

Aux-view sheets (settings, dashboard, medication, caregiver, legal, breathing) use `<Suspense>` without `<ErrorBoundary>`. If any lazy screen throws, the entire App shell crashes. The 4 main tabs (Nila/Today/Tools/You) have ErrorBoundary wrappers — the aux sheets do not.

### HIGH — ~85-90% Hardcoded English in UI

Crisis safety copy, assessment instruments, tool descriptions, form labels, empty states, and settings group headers are all hardcoded English. The i18n framework is solid (656 keys, `t()` calls in components) but many screens bypass it entirely. Key offenders: `AboutNilaScreen`, `LegalScreen`, `NilaMemoryScreen`, `SettingsScreen` group headers, `CrisisOverlay`, `CrisisHelpButton`, all assessment instruments.

### MEDIUM — Duplicate normalizers across 3 files

`safety.ts` `normalizeText()`, `elevationGuard.ts` `normalize()`, `distortionSpotter.ts` `normalize()` — three independent copies that have already drifted (fixed in this session for zero-width chars, but the structural duplication remains). Consider extracting a shared utility.

### MEDIUM — `usageAnalytics.ts` protocol completion rate overstates

`protocolCompletions()` reads the single-slot `started` counter which resets after completion, making the rate approach 1.0 after one completion. Should use a historical counter.

### LOW — `autoUpdate.ts` fetches GitHub API

Opt-in, disabled by default, but the `checkForGitHubUpdate()` call fires on every native launch (the internal guard prevents the actual fetch, but the module is still dynamically imported).

### LOW — Build tool deps in `dependencies`

`vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` are in `dependencies` instead of `devDependencies`. Semantically wrong but functionally harmless.

---

## Verified Healthy (no action needed)

- **§9 crisis path:** Deterministic, model-independent, fail-closed. All outputs gated.
- **Brain path:** Model fixed (Qwen2.5-1.5B/3B), no on-device fine-tuning, no weight adaptation.
- **Egress:** No analytics/tracking SDKs, all fonts self-hosted, model download SHA-256 verified.
- **Encryption:** AES-GCM-256 with 48-key SENSITIVE_KEYS allowlist, migration system, protectedLiterals pin test.
- **Native model prewarming:** Correctly configured, background thread, foreground service preserves cache.
- **Protocol exit/abort:** Clean, no abandoned state, self-healing corrupt storage.
- **TypeScript:** `tsc --noEmit` clean, `strict: true`.
- **Test suite:** 4,249 tests, no skip/only, guard green.

---

## Files Changed in This Session

| File | Change | Severity |
|------|--------|----------|
| `android/app/src/main/java/com/nilamind/app/MainActivity.java` | Register HealthConnectPlugin, remove dead onStart | CRITICAL |
| `src/services/elevationGuard.ts` | Add zero-width char stripping to normalize() | HIGH |
| `src/services/elevationGuard.test.ts` | Add 4 zero-width evasion tests | HIGH |
| `src/services/distortionSpotter.ts` | Add zero-width char stripping to normalize() | HIGH |
| `src/services/distortionSpotter.test.ts` | Add 2 zero-width evasion tests | HIGH |
| `src/services/secureLocal.ts` | Conditional migration version bump + hydrate error surfacing | HIGH |
| `android/app/src/main/res/xml/config.xml` | Restrict access origin from * to specific domains | HIGH |
| `android/app/src/main/res/xml/file_paths.xml` | Narrow FileProvider scope | MEDIUM |
| `android/app/src/androidTest/.../ExampleInstrumentedTest.java` | Fix wrong package assertion | MEDIUM |
