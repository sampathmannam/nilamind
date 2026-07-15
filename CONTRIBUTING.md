# Contributing to NilaMind

Thank you for your interest in contributing to NilaMind — a privacy-first, fully on-device mental wellness companion.

## Important: Read This First

NilaMind is a **safety-critical application**. It includes a deterministic crisis-safety layer (§9), an elevation guard (mania detection), and an output gate that wraps every single reply the AI produces. Before contributing, read:

- **[AGENTS.md](AGENTS.md)** — the build guide and golden rules
- **[SAFETY.md](SAFETY.md)** — the safety architecture and crisis response design
- **[docs/TRANSPARENCY.md](docs/TRANSPARENCY.md)** — model card, privacy datasheet, and safety system card

## Golden Rules

1. **Wellness, never therapy.** Never ship copy or claims using "therapy / therapist / treat / diagnose / cure."
2. **§9 crisis safety is DETERMINISTIC.** Never route crisis judgment through the LLM. Every reply passes the output gate.
3. **Nothing leaves the device.** No third-party network calls, analytics, ad SDKs, or external fonts.
4. **TDD is mandatory.** Write a failing test first, watch it fail, then write minimal code to make it pass.
5. **Never weaken, skip, or delete a test to make the suite pass.** A green suite achieved by editing tests is a failure.

## How to Contribute

### Reporting Bugs
Use the bug report template. Include:
- Android device model and OS version
- App version (from Settings)
- Steps to reproduce
- What happened vs. what you expected

### Suggesting Features
Use the feature request template. NilaMind's architecture rule is: **wellness, never therapy; on-device only.** Features that require cloud services, collect user data, or make clinical claims will be declined.

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Follow the [build guide](AGENTS.md) — TDD, guard green
3. Run `npm run guard` before pushing (must be exit 0)
4. Conventional commit messages (e.g., `feat(safety): add X` or `fix(chat): resolve Y`)
5. If your change touches `safety.ts`, `crisisClassifier*`, `elevationGuard`, `nilaSafetyGate`, `secureLocal`, `secureStore`, or `nilaContext` — flag it explicitly in the PR description for safety review

### Development Setup

```bash
npm install
npm run dev            # web preview (UI + logic)
npm run build          # production build
npx cap sync android   # android native sync
```

**Tests:** `npm test` (Vitest, ~2500+ tests)
**Typecheck:** `npx tsc --noEmit`
**Guard (full gate):** `npm run guard`

## Project Structure

- `src/services/safety.ts` — deterministic crisis keyword scanner + output gate (Rules 1-6)
- `src/services/crisisClassifier.ts` — MiniLM on-device classifier
- `src/services/elevationGuard.ts` — mania input detection
- `src/services/localLlm.ts` — LLM backend seam
- `src/components/` — React components (Ionic-based UI)
- `android/` — Android native build (Capacitor)

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
