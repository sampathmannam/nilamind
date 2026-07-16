# First-run brain choice: on-device vs. cloud API key

Date: 2026-07-16
Status: Approved for planning

## Problem

Today, the first-run setup screen (`ModelSetupScreen.tsx`, shown by `ModelSetupGate.tsx` right after
onboarding) offers exactly one path: download the on-device model (~1.1GB), or "Skip for now" into a
brainless offline companion. The opt-in cloud API tier (bring-your-own-key, e.g. Groq) exists but is
buried three taps deep in Settings → Advanced → Optional Cloud API — a new user who doesn't want the
download, or is on a low-storage/low-RAM device, has no visible way to get Nila working with their own
key until they stumble onto Settings.

## Goal

Surface the local-vs-cloud choice as a first-class decision at first-run setup, immediately after
onboarding and before the user is forced into the download-or-skip binary that exists today.

## Design

### Where it lives

Extend `ModelSetupScreen.tsx` in place — no new gate, no change to `ModelSetupGate.tsx`'s mounting/timing
logic (it already waits correctly for onboarding to finish before rendering this screen).

### Flow — a `mode` state added to the screen: `"choice" | "device" | "api"`, default `"choice"`

**1. `"choice"` mode (new)** — two equal-weight cards, neither visually favored:

- **On-device card**
  - ✅ Private — nothing you say ever leaves your phone
  - ✅ Works fully offline once downloaded
  - ✅ No account, no API key, no ongoing cost
  - ⚠️ One-time ~1.1GB download (Wi-Fi recommended)
  - ⚠️ Replies are slower and less nuanced than a large cloud model
  - Shows the existing `MODELS[0]` name/size preview.

- **Cloud API key card**
  - ✅ No download — ready the moment you paste a key
  - ✅ Faster, more capable replies (e.g. Groq's Llama 3.3 70B)
  - ⚠️ Your messages leave the device and go to the provider you choose
  - ⚠️ Requires your own free API key (Groq, etc.) and an internet connection
  - ⚠️ Subject to that provider's own privacy policy, not NilaMind's

Both cards use the existing amber-warning / emerald-check visual convention already used in
`CloudApiSection.tsx`'s privacy notice, so the bullets read as "pros" (emerald check) vs. "cons" (amber
warning) rather than plain text.

Below both cards: the existing **"Skip for now — use tools & crisis help"** link, unchanged in behavior
(`recordModelDownloadSkipped()` → `setBrainStatus("ready")` → `onReady()`).

**2. `"device"` mode** — exactly today's screen: idle card → confirm → download progress → error states.
Zero behavior change to `downloadModel`/`registerDownloadedBackend`/verify/error handling. A "Back" link
is added, visible only in the idle/confirm states (not mid-download), returning to `"choice"`.

**3. `"api"` mode (new)** — provider picker (Groq default / Custom) + key entry, rendered via a new shared
component (see refactor below). A **Continue** button is disabled until a non-empty key is entered
(same soft `gsk_` validation hint as Settings — never a hard block). On Continue:

1. `setCloudApiEnabled(true)`
2. `setCloudApiProvider(provider)`
3. `setCloudApiKey(key)`
4. `setCloudApiModel(model)` / `setCloudApiUrl(url)` if the user customized either
5. `setBrainStatus("ready")`
6. `onReady()`

This is the same terminal action as "Skip for now," except cloud is live immediately instead of leaving
the user brainless. A "Back" link returns to `"choice"`.

### Refactor for reuse: `CloudApiKeyForm.tsx`

`CloudApiSection.tsx`'s `GroqPanel` / `OpenAiCompatiblePanel` functions and the provider-toggle buttons
are currently private to that file. Extract them into a new shared component:

`src/components/settings/CloudApiKeyForm.tsx`
- Provider picker (Groq / Custom (OpenAI-compatible)) buttons
- "Get your free {provider} API key" link (Groq console / Google AI Studio, per the existing per-provider
  logic)
- Key input with show/hide toggle + validation hint
- Model dropdown (Groq presets + custom) / model text field (Custom)
- Advanced URL override section (Groq) / URL field (Custom)
- **No outer "Enable cloud API" toggle chrome** — that stays in `CloudApiSection.tsx` for Settings, since
  the onboarding card selection already implies "enabled."

`CloudApiSection.tsx` is updated to render `<CloudApiKeyForm />` instead of its inline `GroqPanel`/
`OpenAiCompatiblePanel` JSX, passing the same state/callbacks it already owns. Visually identical output
in Settings — this is a pure extraction, not a behavior change.

The new `"api"` mode in `ModelSetupScreen.tsx` renders the same `<CloudApiKeyForm />` with its own local
state (provider, key, model, url, showKey), defaulting exactly as `cloudApi.ts` already defaults (Groq
provider, Groq URL/model).

### State persistence

The API-key step writes through the exact same `cloudApi.ts` functions Settings uses
(`setCloudApiEnabled`, `setCloudApiProvider`, `setCloudApiKey`, `setCloudApiModel`, `setCloudApiUrl`) —
one source of truth. Opening Settings afterward shows exactly what was entered during first-run setup,
and the toggle already reads as "on."

### No changes to

- `ModelSetupGate.tsx` (mounting/timing logic)
- `brainSetup.ts` (`setBrainStatus`, `recordModelDownloadSkipped`)
- `modelDownload.ts` (download/verify pipeline)
- `cloudApi.ts` (storage layer — already correct, reused as-is)
- `cloudLlmAdapter.ts` / `localLlm.ts` routing (already correctly routes to cloud when active)

### Testing

- New: `ModelSetupScreen.test.tsx` covering the three modes (choice → device, choice → api → continue
  persists cloud settings + calls `onReady`, skip-for-now unchanged) — none existed before this change.
- New: `CloudApiKeyForm.test.tsx` for the extracted component (provider switch, key validation hint,
  model/url field behavior) — currently only indirectly covered via `CloudApiSection`'s tests, if any
  exist; check before writing to avoid duplicate coverage.
- Existing `cloudApi.test.ts` / `cloudLlmAdapter.test.ts` are unaffected (no change to that module).

## Out of scope

- Changing the cloud privacy-notice copy or the Groq-vs-custom-provider defaults.
- Any change to the on-device download/verify/error UX itself.
- Removing or altering "Skip for now."
- Adding new cloud providers beyond Groq/Custom.
