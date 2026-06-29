// Build-time feature flags (AUTOPILOT Phase 10 — distribution).
//
// The default build is the SIDELOAD build: every feature on, including the deeper phone-data
// features. A Play-Store build is produced with VITE_STORE_BUILD=1, which DISABLES the
// policy-sensitive deep features so the store listing can honestly declare "no data collected":
//   • Phone Patterns / Behaviour Intelligence (Android PACKAGE_USAGE_STATS usage access)
//   • Location-derived "left home" signal (ACCESS_FINE/COARSE_LOCATION)
//   • Any phone automation (none ships today; the agent's deep automation was always sideload-only)
//
// NOTE: this flag gates the FEATURES (and the permission requests). For the store AAB, also remove
// the matching <uses-permission> lines from AndroidManifest.xml — see DISTRIBUTION.md.
//
// IMPORTANT: reference `import.meta.env.VITE_STORE_BUILD` DIRECTLY and compare it without wrapping it
// in String()/trim() — so Vite inlines the value AND esbuild can constant-fold the comparison. With
// `--mode store` (.env.store sets it to "1"), STORE_BUILD folds to the constant `true`, and the gated
// deep-feature code is TREE-SHAKEN OUT of the store bundle entirely — not merely hidden at runtime.
const v = (import.meta as any).env.VITE_STORE_BUILD;

/** True when this is the locked-down Play Store build (set via `vite build --mode store`). */
export const STORE_BUILD: boolean = v === "1" || v === "true" || v === true;

/** Deep phone-data features (usage stats, location) — enabled only in the sideload build. */
export const PHONE_FEATURES_ENABLED: boolean = !STORE_BUILD;
