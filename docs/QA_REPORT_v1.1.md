# NilaMind — v1.1 Red-Panel QA Report

Comprehensive audit by a 5-lens red panel (security/privacy/§9, correctness/bugs, performance, UI/UX & accessibility, first-time distressed-user journey). Each finding is code-grounded (`file:line`), prioritized **P0** (blocks help / core broken / safety hole / harmful) → **P3** (polish), with the fix and a status.

Status legend: ✅ fixed · 🔷 partially fixed · ⏳ deferred (tracked) · 👤 user action.

---

## A. §9 CRISIS SAFETY & REACHABILITY (top priority — this is a mental-health app)

The core §9 design is genuinely sound (pre-model, deterministic, fail-closed, model-independent crisis reply). The defects are **inconsistency and reachability**, not a broken core.

- **[P0] Agentic command pre-pass front-runs §9.** `AiCoachScreen.tsx:210` runs `runAgent(userText)` before the gated `sendToNila` (:231); `agent.ts` `classify` has no crisis check. "remind me to end my life tonight" → reminder intent → *"Done — I'll remind you at 8 PM"* + a scheduled notification; §9 never fires (bypasses even the keyword floor). **Fix:** crisis-gate at the very top of `handleSendMessage`, before the pre-pass. — ✅
- **[P0] Classifier enabled but wired into only 1 of 8 send paths.** `main.tsx:23` enables it; only `sendToNila.ts:62` consumes it. Keyword-only elsewhere: `CallNilaScreen.tsx:95` (voice), `EpisodeSupportScreen.tsx:131,214`, `coachAssist.ts:47,70,98`. Euphemistic crises slip. **Fix:** unify — every path goes through async `detectCrisis`. — ✅
- **[P0] In-chat crisis reply shows un-tappable numbers + a "red button" that doesn't exist.** `sendToNila.ts:62` returns `getCrisisReply()` plain text; renders "📞 iCall: …" strings, not tappable `CrisisLines`; copy says "red button below" (`safety.ts:161`) but the crisis state shows only a green button; the offline-nav grid is gated on a different substring the crisis reply never contains. **Fix:** render `<CrisisLines>` + a real "Open safety plan" button in the `result.blocked` branch; fix copy. — ✅
- **[P0] Crisis help unreachable during onboarding + 2.5 GB download.** `IdentityOnboarding` → `ModelSetupGate` funnel exposes no crisis line/lifebuoy; "Not now" loops back to the wall; no skip-into-app. **Fix:** always-visible crisis affordance on the gates + a "use tools & crisis help now" exit. — ✅
- **[P1] Self-Compassion saves persist crisis text with NO scan.** `SelfCompassionScreen.tsx:56-133` — unlike every other free-text tool. **Fix:** scan on save → `CrisisCard`. — ✅
- **[P0(UX)] Episode-Support crisis numbers are fake-clickable, non-tappable.** `EpisodeSupportScreen.tsx:462-464` `cursor-pointer` text, no `tel:`. **Fix:** `<CrisisLines>`. — ✅
- **[P2] Voice-call crisis numbers not callable.** `CallNilaScreen.tsx:222` plain text. **Fix:** tappable `<CrisisLines>` in the crisis panel. — ✅
- **[P2] Keyword list missing firearm/method words.** `safety.ts:8-57` — no gun/shoot/jump/drown/gas/bleach, no "final goodbye". **Fix:** add + paired benign controls. — ✅
- **[P1] Voice call drops the mania "stopping-meds" safety belt.** `localNila.ts:47` appends the note after streaming; `CallNilaScreen.tsx:132-148` flush speaks only the streamed text. **Fix:** speak the appended tail. — ✅

## B. CORRECTNESS / BUGS

- **[P1] Send path re-entrant during the agent pre-pass** → double reply, stale history, context collision. `AiCoachScreen.tsx:195,225` (`loading` set too late). **Fix:** synchronous in-flight ref. — ✅
- **[P2] `handleSendMessage` has no try/finally** → a throw leaves the UI stuck "thinking" forever. `AiCoachScreen.tsx:225-283`. **Fix:** wrap in try/finally. — ✅
- **[P1] "Ask Nila" (Thought Record / Diary / Dashboard) dead-ends for every first-run user** (no model yet). `coachAssist.ts:62,76,104`. **Fix:** check `isLocalLlmReady()`, purpose-built "still downloading" copy. — ✅
- **[P1] Offline-fallback buttons render off a fragile copy substring.** `AiCoachScreen.tsx:262,461`. **Fix:** drive off `activeTier`/a flag. — ✅
- **[P2] `windowMessages` can overflow `n_ctx` / drop the §9 prefix on a huge single message.** `gemmaPrompt.ts:57-72`. **Fix:** count system budget, hard-truncate oversized turn. — ✅
- **[P2] No abort on unmount mid-generation** → setState-after-unmount + wasted CPU. `AiCoachScreen.tsx` + `sendToNila`. **Fix:** mounted-guard (lightweight). — ✅
- **[P3] `rememberSession`/reflection store model output ungated + run after crisis.** `nilaMemory.ts:64`, `AiCoachScreen.tsx:121`. **Fix:** skip after crisis; gate note through output safety. — ✅
- **[P3] `findInstalledModel` deletes the real model on a transient `stat` throw.** `modelDownload.ts:83-96`. **Fix:** distinguish stat-threw from size-mismatch. — ✅
- **[P3] Download progress filter breaks on the HF 302 redirect** → frozen 0% bar. `modelDownload.ts:109`. **Fix:** don't filter when one download is active. — ✅
- **[P3] Voice reply silent until flush for punctuation-less replies.** `voice.ts:140`. **Fix:** flush on newline/max-len. — ⏳ (low)

## C. SECURITY / PRIVACY

- **[P1] Live Anthropic key + app-token in plaintext `.env`** (leaked in chat, NOT shipped/committed — verified). **Fix:** delete `.env`, `.env.production.local`, dead `dist-server/`. Rotation = user. — ✅ (files) / 👤 (rotate)
- **[P1] No SHA-256 on the model download** — a same-size poisoned GGUF would be accepted. `modelDownload.ts:129`. **Fix:** add expected sha256 to catalog, verify `.part` before rename. — ✅
- **[P1] `allowBackup=true`** → encrypted DB + prefs eligible for cloud/adb backup (contradicts "never leaves device"). `AndroidManifest.xml:4`. **Fix:** `allowBackup="false"`. — ✅
- **[P1] Two unused dangerous location permissions.** `AndroidManifest.xml:50-51`. **Fix:** remove. — ✅
- **[P1] No `network_security_config.xml`** (cleartext allowed API 24-27; redirects unpinned). **Fix:** ship one disabling cleartext. — ✅
- **[P1] Replayed user context unescaped (in-band self-injection).** `episodePrompt.ts:27`, `nilaContext.ts`. **Fix:** data-fence replayed notes. — ✅
- **[P2] JSON-parse logs raw `SyntaxError` (snippet of decrypted content) to logcat.** DiaryCard/CheckIn/ThoughtRecord/SelfCompassion/EpisodeSupport. **Fix:** static log strings. — ✅
- **[note] PACKAGE_USAGE_STATS is actually used** (Phone-patterns, encrypted). Keep. — ✅ (no change)

## D. PERFORMANCE / SPEED

- **[P1] Full 40-skill library injected every turn; RAG top-3 unused.** `localNila.ts:35` (no query) → `nila.ts:60` dumps all skills; the "byte-identical prefix for KV reuse" rationale is moot (KV persistence is impossible on this binding). **Fix:** pass the last user msg → top-3 RAG block. ~300–500 fewer prompt tokens re-prefilled every reply. — ✅
- **[P0] 7.5 MB eager JS boot chunk, no code-splitting.** `vite.config.ts` (no manualChunks), 0 `React.lazy`. **Fix:** `manualChunks` split heavy libs (recharts/jspdf/react-markdown/dexie) + lazy aux screens. — 🔷 (manualChunks done; lazy-screens deferred)
- **[P2] `vosk-browser` JS glue eager at boot.** `wakeWord.ts:4`. **Fix:** dynamic-import inside `start()`. — ✅
- **[P3] `n_predict:220` too generous** for a ~50-word model. `llamaCppLlmAdapter.ts:104`. **Fix:** 140. — ✅
- **[P2] `detectCrisis("hello")` warm competes with the first reply.** `AiCoachScreen.tsx:130`. **Fix:** defer to idle/after first paint. — ✅
- **[P2] Chat list index keys + `cardsForReply` recomputed each render.** `AiCoachScreen.tsx:447,599`. **Fix:** stable ids + memo. — 🔷 (memo module regex) 
- **[P3] `sun-aurora` animations render on dark theme (meant light-only).** `App.tsx:234`. **Fix:** conditional. — ✅

## E. UI / UX / ACCESSIBILITY

- **[P0] Primary CTA + user bubbles fail contrast (2.7–3.4:1).** `.sun-cta` (`index.css:152`). **Fix:** darken gradient. — ✅
- **[P1] Icon-only feedback controls are 14px targets.** `AiCoachScreen.tsx:487`. **Fix:** 44px hit area. — ✅
- **[P1] Floating crisis lifebuoy 36px + hover-only + notch collision.** `AiCoachScreen.tsx:341`. **Fix:** 44px, safe-area, resting contrast. — ✅
- **[P1] Episode dock `h-[76vh]` cropped by mobile chrome.** `EpisodeSupportScreen.tsx:400`. **Fix:** `dvh`. — ✅
- **[P1] Reach-out green button ~4.1:1 white text.** `ReachOutScreen.tsx:179`. **Fix:** dark text on emerald. — ✅
- **[P1] Light-theme peach/emerald/slate-650 fail contrast.** `index.css:110,127,129`. **Fix:** darken tokens. — ✅
- **[P2] User bubbles + input 14px (<16px; iOS zoom).** `AiCoachScreen.tsx:454,752`. **Fix:** `text-base`. — ✅
- **[P2] Bottom-nav active state color-only + 10px labels.** `App.tsx:539`. **Fix:** non-color cue. — ✅
- **[P2] Smooth-scroll ignores reduced-motion.** `AiCoachScreen.tsx:117`, `AssessmentScreen.tsx:79`. **Fix:** gate on matchMedia. — ✅
- **[P2] Assessment 8px option labels + digit-only buttons.** `AssessmentScreen.tsx:226`. **Fix:** ≥11px + caption. — ✅
- **[P3] Duplicate/contradictory Tailwind classes on crisis controls.** `AiCoachScreen.tsx:477,735,719`. **Fix:** collapse. — ✅
- **[P1] Model-download: no offline pre-check / cancel / resume.** `ModelSetupScreen.tsx`. **Fix:** `navigator.onLine` pre-check + clearer error causes. — ✅

## F. COPY / TONE (for someone unwell)

- **[P1] Dependency nudge reads as a soft rejection** (presumes a support network). `DependencyNudge.tsx:12`. **Fix:** reframe, no "but", no presumption. — ✅
- **[P1] Inflection opener presumes state, no "you've got this wrong".** `nilaInflection.ts:69`. **Fix:** epistemic humility. — ✅
- **[P2] First cold reply can be ~5 min; wait copy tops out at 45s, no bail.** `useSettlingNote.ts:11`. **Fix:** 3rd phase + grounding shortcut. — ✅
- **[P3] Episode Support clinical copy + "Return to Dashboard" (no Dashboard exists).** `EpisodeSupportScreen.tsx`. **Fix:** warm microcopy. — ✅
- **[P2] Pact notice fires off a noisy sleep signal.** `pactNotice.ts:39`. **Fix:** stronger signal + "I'm okay" dismiss. — ⏳ (tracked)
- **[P2] PIN-forgotten = permanent lockout.** `SecureGate.tsx:98`. **Fix:** biometric-backed disable-PIN. — ⏳ (tracked, larger)

---

## Confirmed strong (not changed)
No production data egress (only dev-gated localhost); no shipped/committed secret; §9 core fail-closed; prompt-injection into UI architecturally impossible (nav/openSkill hard-wired off); AES-GCM-256 encryption-at-rest with biometric-gated destructive actions; reach-out private (sms: only); data-wipe well-guarded; reduced-motion CSS honored; hardware-back walks the nav stack from crisis; PHQ-9 Q9 safety route; `CrisisOverlay` hotline buttons already tappable/44px.

---

## v1.1 build & verification result

Fixed by a 4-agent parallel pass (disjoint file sets) + orchestrator finalization. **~47 findings addressed** across all six categories; the few larger items are tracked below.

- **Verification:** `tsc --noEmit` clean; **476/476 tests pass** (added: SHA-256 accept/reject, `stat`-throw non-deletion, §9 ingestion + command-bypass regressions); web build splits the boot chunk **7.5 MB → 724 KB**; signed release **v1.1 (versionCode 2)** builds at **77 MB**; on-device the stripped `.so` loads llama.cpp + the 4B and the trimmed-wasm §9 classifier initializes clean.
- **§9 device note:** the *typed* end-to-end crisis test (input → tappable lines) is pending a phone unlock (auto-locked mid-run; PIN can't be bypassed). Covered meanwhile by unit tests (incl. the exact bypass phrase) + a code read of the pre-pass gate. Recommended 30-sec self-test: type "i want to die" in chat → crisis reply with tappable lines must appear instantly.
- **Voice flush** (B P3) — ✅ fixed (Agent 2: harvest now drains on newline / max-length).
- **Firearm keywords** (A P2) — addressed via the classifier unification (all paths now use `detectCrisis`), NOT by adding idiom-colliding bare keywords ("shoot myself in the foot", "gun to my head") to the high-precision floor; added only non-colliding ingestion phrases (bleach).
- **Deferred to v1.2 (tracked):** React.lazy of aux screens (manualChunks split already landed the main win); stable message ids (memoization landed); true byte-level download resume/cancel (UX-level cancel landed); pact-notice signal tuning; PIN-forgotten biometric-disable path.
- **User actions still required:** rotate the leaked Anthropic key + the HF write-token + NVIDIA key (server-side — the dead local `.env`/`dist-server` were deleted, but deletion ≠ revocation); back up `android/nilamind-release.jks`.
