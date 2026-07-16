# Dedupe in-moment skill suggestion, buttonize it

## Problem

`deriveInMomentInsight` (src/services/inMomentInsight.ts) produces one skill
suggestion per assistant turn. It is currently rendered twice on screen:

1. As a muted, underlined "Try it" text link inside the "A skill that may
   help" section of `InMomentInsightCard` (attached inline to the message).
2. As a full card with "Try this skill" / "Not now" buttons
   (`SkillOfferCard`), pinned above the composer, driven by the same
   `insight.skill.skill` via `ModeScreen`'s `skillOffer` state.

Same suggestion, two surfaces, one of them plain text. User wants a single,
button-driven, proactive suggestion.

## Decision

Keep the suggestion inline in `InMomentInsightCard` (attached to the message
it responds to, so it recedes naturally as the chat scrolls, rather than
nagging pinned above the composer). Remove `SkillOfferCard` and its
supporting state entirely.

## Changes

**`InMomentInsightCard.tsx`**
- Replace the underlined "Try it" text link with a solid button pair,
  mirroring `SkillOfferCard`'s CTA weight but in the card's existing violet
  tone: a filled "Try this skill" button (Sparkles icon) + a muted "Not now"
  dismiss button.
- New prop `onDismissSkill?: () => void`. New prop `skillDismissed?: boolean`
  — when true, the whole skill block is omitted (the explainer block, if
  present, still renders).

**`ModeScreen.tsx`**
- Add `dismissedSkillMessages: Set<number>` state, mirroring the existing
  `ratedMessages` pattern (message-index-keyed, session-local, not
  persisted).
- Pass `skillDismissed={dismissedSkillMessages.has(i)}` and
  `onDismissSkill={() => setDismissedSkillMessages(prev => new Set(prev).add(i))}`
  to `InMomentInsightCard` at its call site.
- Delete the `SkillOfferCard` render block, the `skillOffer` state and every
  setter (`setSkillOffer(null)` in `openCrisis`, in `handleTrySkill`, and in
  `startNewConversation`), and the now-unused `SkillOfferCard` / `suggestSkill`
  imports.

**`SkillOfferCard.tsx`**
- Delete the file — nothing else imports it after the above.

## Out of scope

- The "Continue Worry Postponement" protocol card (`protocolCard`) is a
  distinct concept (multi-step exercise progress) already rendered as a
  button; untouched.
- `filterSkills` import in `ModeScreen.tsx` is already unused/orphaned,
  predating this change; left alone.
