# Privacy & Data

NilaMind's core commitment is simple: **it helps without harvesting.** Personal content never leaves the device. There is no account, no backend, and no analytics, and the AI needs no network to generate replies.

## What's stored, and where

Everything personal lives **only on your phone**, in the app's encrypted local store (`src/services/secureLocal.ts` / `secureStore.ts`, backed by Dexie/IndexedDB, **encrypted at rest**):

- Your conversations with Nila
- Check-ins and mood history
- Durable "memories" (a few stable facts Nila holds, only with your consent)
- The "letter to my unwell self" pact
- Skill outputs (thought records, diary cards, etc.)
- Settings and your local identity

There is **no cloud copy**. If you uninstall the app or clear its data, it's gone.

## Identity without accounts

NilaMind creates an on-device identity from a **BIP39 recovery phrase** (`src/services/identity.ts`) — no email, no sign-up, no server-side user record. Sensitive actions (revealing your phrase, exporting, wiping) can be gated behind a **fingerprint/biometric** check (`biometricGate.ts`).

## The one thing that *can* leave the phone — only if you choose

To let the model improve over time *without* harvesting transcripts, NilaMind has a strictly opt-in **donation** path (`src/services/nilaContributions.ts`):

- It only ever queues a single, explicitly-confirmed example: *{ Nila's reply, your suggested better reply }*.
- It is **PII-scrubbed** before you even see the preview, and you see the **exact** payload that would be shared ("nothing else leaves your phone") before confirming.
- **Crisis moments are excluded** by the §9 scan; nothing from an unsafe moment is ever donated.
- It's fully **revocable** — you can view and delete everything queued, in "What Nila remembers" / Your Data.

If you never tap "share," nothing ever leaves the device. This is the deliberate reconciliation of "improve the model" with "never gather data at any cost."

## Your controls

- **"What Nila remembers"** — view, edit, and delete every durable memory.
- **Your Data** — review and clear stored content; manage donations.
- **Reflection sends nothing raw** — on-device reflection that updates insights uses a *derived* digest, computed locally; it is not a transcript upload.

## The line the project won't cross

If you modify NilaMind, **please do not add data collection.** That is the one rule the project holds above all features. See [Contributing](Contributing.md) and [`SAFETY.md`](https://github.com/sampathmannam/nilamind/blob/main/SAFETY.md), and the repo's [`PRIVACY_POLICY.md`](https://github.com/sampathmannam/nilamind/blob/main/PRIVACY_POLICY.md).

> Note on the model download: the only network activity in normal use is the **one-time download of the language model** on first run (from Hugging Face). That transfers the model *to* your phone; it sends nothing *about* you. After it, the app is fully offline. See [Model Provisioning](Model-Provisioning.md).
