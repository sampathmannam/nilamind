# Safety

**Read this before using, modifying, or redistributing NilaMind.**

NilaMind is an **experimental, self-help companion**. It is **not a medical
device**, **not a substitute for professional care**, and **not a crisis
service**. It does not diagnose, treat, cure, or prevent any condition. Nothing
it says is medical, psychological, or clinical advice. Use it at your own risk.

It was built as a personal, single-user research project with a specific design
focus (mood-episode awareness). It has **not** been clinically
validated, has not been through any regulatory process, and has not been tested
across the range of people, languages, or conditions a real product would need.

## If you are in crisis

If you or someone else may be in immediate danger, **contact local emergency
services now** and, if you can, reach a person you trust.

- **Emergency:** your local emergency number — e.g. **112** (India, EU, and much
  of the world), **911** (US/Canada), **999** (UK), **000** (Australia).
- **Find a helpline anywhere:** https://findahelpline.com — and the IASP crisis
  centre directory: https://www.iasp.info/resources/Crisis_Centres/
- **United States:** call or text **988** (Suicide & Crisis Lifeline).
- **India:** **Tele-MANAS 14416** (national, 24×7) · **KIRAN 1800-599-0019** ·
  **Vandrevala Foundation +91 9999 666 555**.

Helpline numbers change — please verify the current number for your country.
A piece of software, including this one, is **not** a reliable way to reach help
in an emergency.

## The crisis-safety layer ("§9") — do not remove it

NilaMind contains a deliberate, model-independent safety layer that runs
*around* the language model rather than relying on it:

- `src/services/safety.ts` — a deterministic keyword crisis scanner that is the
  universal floor (`scanForCrisis`), pole-agnostic and always-on.
- `src/services/crisisClassifier.ts` (+ `crisisClassifier.weights.json`,
  `crisisEmbedder.*`) — a small on-device semantic classifier that catches
  euphemistic disclosures the keyword scan misses. It is **additive, soft, and
  fail-closed**: it can only *add* a supportive crisis surface, never suppress
  one, and any error fails toward showing support.
- The surfaces that, on a detected crisis, route the person toward a **human**
  and toward **emergency resources** instead of trying to "handle" it in chat.

This layer exists because the underlying language model **will** miss things and
must never be the only thing standing between a person and harm. **If you fork
or redistribute NilaMind, keep this layer intact.** Shipping a mental-health
companion with the safety layer removed, disabled, or weakened can cause real
harm, and is contrary to the spirit in which this project is shared.

## Known limitations

- **The model is yours, not ours.** NilaMind ships **without** a language model.
  Whatever on-device GGUF you supply determines reply quality and failure modes.
  A small or poorly-aligned model can produce unsafe, wrong, or distressing
  output. The safety layer reduces but does not eliminate this risk.
- **Detection is high-recall, not perfect.** The crisis layer is tuned to catch
  more than a keyword list would, accepting some false alarms. It will still
  miss cases. Do not rely on it.
- **No professional escalation.** NilaMind cannot and does not contact
  clinicians, emergency services, or your contacts on your behalf. Any
  reach-out is initiated and confirmed by the user.
- **Sycophancy / amplification risk.** Warm, agreeable AI can inadvertently
  validate escalating or grandiose states. There are deterministic guards for
  this, but they are imperfect.

## Privacy

NilaMind is designed so that **personal content never leaves the device**: no
account, no backend, no analytics. Chats, check-ins, mood, memories, and the
"letter to my unwell self" are stored locally (encrypted at rest via the app's
`secureLocal`). If you modify the app, **do not add data collection** — the
project's core commitment is that it helps without harvesting.

## For developers and forkers

If you build on NilaMind:

1. **Keep §9** (above). Do not ship without it.
2. **Do not present it as medical advice** or as a replacement for care.
3. **Keep crisis resources accurate** for your audience's region.
4. **Do not add telemetry or data exfiltration.**
5. **Re-test the safety layer** against your chosen model before any real use.

This is provided under the Apache License 2.0, **"AS IS", without warranties of
any kind** (see `LICENSE`). The authors are not liable for any outcome of using
or modifying it.
