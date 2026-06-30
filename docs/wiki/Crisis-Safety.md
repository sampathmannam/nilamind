# Crisis Safety (§9)

> **This is the most important page in the wiki.** If you fork or redistribute NilaMind, **keep this layer intact.** Shipping a mental-health companion with it removed, disabled, or weakened can cause real harm.

## The principle: safety must not depend on the model

A language model **will** miss things, and must never be the only thing standing between a person and harm. So NilaMind runs a deliberate, **model-independent** safety layer (internally "§9") *around* the model rather than relying on it.

The layer is:
- **Additive** — it can only *add* a supportive crisis surface, never suppress or replace one.
- **Soft** — it complements the conversation; it doesn't hijack the app.
- **Fail-closed** — any error fails *toward* showing support, not away from it.

## How it works

### 1. Deterministic keyword scanner — the universal floor
`src/safety.ts` → `scanForCrisis` is an always-on, pole-agnostic keyword scanner. It's high-recall by design (it tolerates some false alarms to avoid misses) and covers the obvious explicit signals — including gerund forms, overdose phrasing, and method/plan language that a naive list would miss.

### 2. On-device semantic classifier — catches the euphemisms
`src/services/crisisClassifier.ts` (with `crisisEmbedder.*` and bundled MiniLM weights, via **ONNX Runtime Web / Transformers.js**) is a small classifier that runs **entirely offline** and catches euphemistic disclosures the keyword scan misses — e.g. *"the world would be lighter without me,"* which contains no crisis keyword. It raised crisis recall substantially over keywords alone in the project's own evaluation, while staying additive and fail-closed.

### 3. Gating at the right moment
- **Input gating** runs the scan at the *consequential* action (sending a message, starting a search, initiating a reach-out) — not on every keystroke.
- **Output gating** (`applyOutputSafety`) checks the model's full reply, with a live streaming guard so an unsafe token is never shown or spoken mid-stream.

### 4. The surfaces
On a detected crisis the app shows dedicated surfaces (`CrisisCard`, `CrisisOverlay`, `CrisisLines`) that **route toward a human and toward emergency resources** instead of trying to "handle" it in chat. The copy is unconditional — it does not ask the user to self-triage.

## If you are in crisis

A piece of software — including this one — is **not** a reliable way to reach help in an emergency. Contact local emergency services and, if you can, a person you trust.

- **Emergency:** your local number — e.g. **112** (India/EU and much of the world), **911** (US/Canada), **999** (UK), **000** (Australia).
- **Find a helpline anywhere:** https://findahelpline.com · IASP directory: https://www.iasp.info/resources/Crisis_Centres/
- **US:** call or text **988**.
- **India:** **Tele-MANAS 14416** · **KIRAN 1800-599-0019** · **Vandrevala Foundation +91 9999 666 555**.

Helpline numbers change — verify the current number for your country.

## Honest limitations

- **High-recall, not perfect.** It catches more than a keyword list would, but it *will* still miss cases. Do not rely on it.
- **No professional escalation.** NilaMind cannot and does not contact clinicians, emergency services, or your contacts on your behalf. Any reach-out is initiated and confirmed by *you*.
- **Sycophancy / amplification risk.** Warm, agreeable AI can inadvertently validate escalating or grandiose states. There are deterministic guards (`elevationGuard`, the dependency guard), but they are imperfect.

## The rule for forks

1. **Keep §9.** Do not ship without it.
2. **Do not present NilaMind as medical advice** or a replacement for care.
3. **Keep crisis resources accurate** for your audience's region.
4. **Do not add telemetry or data exfiltration.**
5. **Re-test the safety layer against your chosen model** before any real use.

The full statement lives in [`SAFETY.md`](https://github.com/sampathmannam/nilamind/blob/main/SAFETY.md) in the repo.
