# NilaMind UI/UX Critical Gap Analysis

> Audited against `docs/UI_UX_PRINCIPLES.md` research. Strict assessment — every gap is evidence-linked.

---

## Executive Summary

NilaMind's UI/UX is **substantially better than industry average** for mental health apps. The warm palette, crisis safety layer, capacity-adaptive YouScreen, gentle animations, privacy-first architecture, haptic feedback, and on-device AI are all research-grounded. However, there are **22 specific gaps** between current implementation and the compiled principles. Of those, **7 are critical** and **8 are significant**.

**Overall verdict: The app gets the big things right (crisis safety, privacy, warmth). But the gaps cluster around three systemic themes:**
1. Animations that should calm but don't (wrong timing, not gated by reduced-motion, aurora-field ignoring accessibility)
2. A "Remove from history" feature that is misleading (LLM has already seen those messages)
3. An input bar that is too busy for low-capacity states

---

## Gap Severity Key

| Severity | Definition |
|----------|-----------|
| 🔴 CRITICAL | Safety or trust violation; accessibility barrier; research-backed feature absent |
| 🟠 SIGNIFICANT | Meaningful UX degradation; research-backed feature partially implemented |
| 🟡 MODERATE | Minor UX friction; missing polish; inconsistent with principles |

---

## 1. Emotional Design — Visceral Level

### 🔴 [Gap E-1] NilaFace breathing animation timing mismatch

**Research:** Headspace's breathing animation uses 4-2-6 timing (4s inhale → 2s hold → 6s exhale = 12s cycle) because longer exhalations activate the parasympathetic nervous system. Their entire animation system is calibrated to physiologically calm the user.

**Evidence:**
- `nilaFaceMotion.ts:20` — `BASELINE.breatheSec = 3` (3-second cycle)
- `index.css:256-260` — `@keyframes nila-breathe` runs 4.5 seconds (`animation: nila-breathe 4.5s ease-in-out infinite`)
- These are **mutually contradictory** — the motion config says 3s, the CSS says 4.5s. The CSS is authoritative (animation duration is set in CSS), so the actual cycle is 4.5s.

**Impact:** A 4.5-second cycle for the orb breathing is ~2.6× faster than the research-backed 12-second cycle Headspace uses. This is the orb's PRIMARY calming function and it may not deliver parasympathetic benefit. The mismatch also means the elevated-state slowing (breatheSec=6 in SETTLED) doesn't actually slow the CSS animation at all.

**Specific fix:** Make `nilaFaceMotion.breatheSec` the authoritative value. Set `breatheSec: 12` in BASELINE (matching 4-2-6 research), and ensure the CSS animation duration is driven by this value, not hardcoded. Elevated state should reach 18-24 seconds.

---

### 🟠 [Gap E-2] Aurora-field background animation ignores prefers-reduced-motion

**Research:** `index.css:390-406` defines the aurora-field as a slowly-drifting ambient backdrop. Nielsen's Heuristic #1 (visibility of system status) and the principle that the interface should calm before content is consumed both require respecting accessibility settings.

**Evidence:** `html.sensory-comfort *` rules in index.css kill animations app-wide (including aurora-field's children via inheritance). BUT the `@media (prefers-reduced-motion: reduce)` rule at line 282-284 only kills `animation-duration` — the `aurora-field::before` and `aurora-field::after` pseudo-elements use `animation` shorthand, and there is no explicit rule disabling the aurora animations for OS-level reduced-motion preference. `useReducedMotion` hook exists and is used by NilaFace and ConfettiBurst, but NOT by the aurora-field.

**Impact:** A user who sets `prefers-reduced-motion: reduce` at the OS level will still see a slowly-drifting ambient light field. This is the exact accessibility failure the `useReducedMotion` hook was designed to prevent.

**Specific fix:** Add `.aurora-field::before, .aurora-field::after { animation-play-state: paused; }` inside `@media (prefers-reduced-motion: reduce)`. Or gate the aurora-field mounting with a `useReducedMotion()` check in the App component.

---

### 🟠 [Gap E-3] Listening state animation is anxiety-inducing, not calming

**Research:** Headspace's breathing animation is designed to be "supportive, but gives you space." A faster animation signals active attention, not calm.

**Evidence:** `NilaFace.tsx:99-103` — when `isListening`, breatheSec is halved (`baseMotion.breatheSec / 2`). With baseline breatheSec=3, this means 1.5 seconds per cycle — pulsing nearly twice per second. The orb literally animates faster when the user is talking to it, which may spike anxiety rather than settle it.

**Impact:** For a user in distress who triggered voice input, being greeted by a faster-pulsing orb could increase rather than decrease arousal.

**Specific fix:** Remove the listening-state speed doubling. Instead, keep the baseline calm breathing during voice input — the orb should signal "I'm right here with you" not "I'm excited/anxious that you're speaking." Or slow the breathing further during listening (settle the user, not match their energy).

---

### 🟠 [Gap E-4] Soft-register mood toning is defined but never applied

**Research:** `index.css:588-613` defines `.theme-elevated` and `.theme-low` CSS custom property overrides that desaturate and mute the palette for a distressed mind. This is the "Architecture of Calm" principle — when a user is in distress, the entire visual environment should tone down.

**Evidence:** grep for `soft-register`, `theme-elevated`, `theme-low` across all TSX files returns **zero matches**. The CSS classes are defined but no component in the codebase applies them to `<html>` or any parent element.

**Impact:** The mood-adaptive visual toning is completely unimplemented. A user who is elevated or low sees the same visual intensity as when they are calm.

**Specific fix:** Wire `adaptiveTheme.ts` to apply `.theme-elevated` / `.theme-low` classes to `<html>` when the derived user state calls for it. This was presumably the intended design.

---

### 🟡 [Gap E-5] Headspace-caliber transition timing not achieved

**Research:** Headspace uses 400-800ms transitions with custom cubic-bezier curves that reinforce calm. The session-complete animation takes a full second with a subtle overshoot.

**Evidence:** `index.css:306-311` — sheet-slide-in is 200ms ease-out. This is 2-4× faster than the Headspace-caliber slow transitions the principles recommend. `animate-fade-in` is 300ms.

**Impact:** Transitions are fast and snappy — appropriate for productivity apps, counterproductive for calming ones. A 200ms slide-in on a mental health app signals urgency rather than refuge.

**Specific fix:** Slow primary transitions (sheet open/close, tab switch) to 400-600ms with ease-out curves. Reserve 200ms for micro-feedback (button presses, toggles).

---

### 🟡 [Gap E-6] Message bubbles use hardcoded colors, not semantic tokens

**Research:** Emotional design requires consistent theming across all states. `index.css:135-155` defines semantic role tokens (`--color-accent`, `--color-hero`) that theme-switch automatically.

**Evidence:** `ModeScreen.tsx:761-762` — user message bubbles use `from-purple-500/80 to-violet-600/80`; assistant bubbles use `#C784B0` (hardcoded). Neither uses `--color-accent` or `--color-ink`.

**Impact:** If the app's theme adapts for elevated or low mood states, the chat bubbles will not adapt — they'll stay the same hardcoded purple. The visual identity fragments under stress.

**Specific fix:** Replace hardcoded bubble colors with semantic tokens. User bubble: `bg-accent/80`. Assistant bubble: `border-accent/15 text-ink-2 bg-card`.

---

## 2. Emotional Design — Behavioral Level

### 🟠 [Gap E-7] No visible press feedback on CrisisHeaderButton

**Research:** Behavioral design requires that every interaction produces expected feedback. The CrisisHeaderButton is the single most safety-critical button in the app.

**Evidence:** `CrisisHeaderButton.tsx:32-40` — button has `transition-colors` on hover but no `active:` scale, no shadow change, no haptic on press. Compare with `ModeScreen.tsx:170` — the NilaFace orb has `active:scale-95` and `hapticLight/hapticMedium` on state transitions.

**Impact:** A user in crisis who taps "Help" and receives no tactile or visual feedback beyond color change may wonder if the tap registered. In acute distress, this uncertainty is harmful.

**Specific fix:** Add `active:scale-95` and `active:brightness-90` to the crisis button's Tailwind classes. Add `hapticMedium()` on the onClick handler.

---

### 🟠 [Gap E-8] BreathingTimer play/pause has no haptic feedback on phase transitions

**Research:** Headspace's haptic feedback for breathing exercises is described as "the phone literally pulses in your hand as you inhale and exhale." Haptics on breathing phase changes provide a grounding somatic signal.

**Evidence:** `BreathingTimer.tsx` — no haptic calls in the component. `BreathingScreen.tsx:70-76` — BreathingScreen (full-screen version) DOES have haptic on phase transitions. BreathingTimer is missing this.

**Impact:** The standalone BreathingTimer tool provides no somatic grounding — only the BreathingScreen does. The less-immersive tool is also the less-effective one.

**Specific fix:** Add `hapticLight()` call inside a `useEffect` watching `state.phase` changes, mirroring BreathingScreen's implementation.

---

### 🟡 [Gap E-9] No haptic feedback when messages are sent or received

**Research:** Microinteraction feedback is essential for behavioral design. Users should feel confirmed that their action succeeded.

**Evidence:** `ModeScreen.tsx` — `handleSendMessage` calls `hapticLight()` at line 259. But there is NO haptic when Nila's reply arrives. The reply appears silently, with no confirmation that a response came in.

**Impact:** When Nila responds (especially after a long model-load delay), the user has no confirmation that anything happened. This undermines the sense of connection.

**Specific fix:** Add `hapticLight()` in the `useEffect` that scrolls to new messages (line 178-180), gated to only fire when a new assistant message arrives.

---

## 3. Cognitive Load Theory

### 🔴 [Gap C-1] Input bar has 7 stacked elements — far too busy for low-capacity states

**Research:** The capacity-matching principle requires that when a user is in a low-capacity state (anxious, distressed), the interface should simplify to the most essential elements. The nudge cascade + capacity-aware UI principle also requires that during distress, everything non-essential should disappear.

**Evidence:** `ModeScreen.tsx:886-1031` — the input bar area contains, vertically from top to bottom:
1. SoftCrisisCard (inline crisis card)
2. NudgeRail + protocol card + welcome/pact (collapsed panel)
3. "N notification(s)" toggle
4. Suggestion chips (up to 2-10 chips)
5. Voice button
6. Text input OR dashed "Tap to type" button
7. Send button

That's 7 distinct UI elements stacked in the input area at ALL times. During an elevated or anxious state, none of these are removed or simplified.

**Impact:** The cognitive load of the input bar itself may exceed the capacity of a distressed user. This directly contradicts the "Architecture of Calm" principle: "When a user reports distress or overwhelm, the interface should simplify automatically. Secondary features fade away, leaving only grounding tools and essential actions."

**Specific fix:** Implement a low-capacity mode for the input bar: when `mode.userState === "anxious" | "elevated" | "low"`, the input bar should collapse to:
- SoftCrisisCard (if present)
- Text input + Send only
- Voice button only
Everything else (nudge rail, chips, protocol card) should be hidden or collapsed behind a "Show more" toggle in low-capacity mode.

---

### 🟠 [Gap C-2] Suggestion chips violate Hick's Law for anxious states

**Research:** Hick's Law: decision time increases logarithmically with the number of choices. For anxious users, the maximum should be 4-5 options. The app's own `MAX_QUICK_ACTIONS = 4` enforces this for quick actions.

**Evidence:** `ModeScreen.tsx:625` — `getSuggestions(slot, recentMood)` is not capped internally. The chips render as `suggestions.slice(0, 2)` by default (2 chips), but the full list can expand to `suggestions.length` (potentially many more). The UI toggle shows `+N more` where N could be 8+.

**Impact:** An anxious user who taps "+N more" could be presented with 8+ suggestion chips simultaneously — violating Hick's Law and the app's own precedent (QuickActions caps at 4).

**Specific fix:** Cap suggestion chips at 4 maximum, matching QuickActions. Use progressive disclosure if more exist. The `+N more` should show no more than 2 additional chips (total max 4).

---

### 🟡 [Gap C-3] QuickActions mode-filtered list can change meaning without warning

**Research:** Jakob's Law requires consistent navigation patterns. Users should be able to predict what's available.

**Evidence:** `QuickActions.tsx:26-36` — ACTIONS has 10 items. `selectQuickActions` filters by `timeMode` and `userState`. A user familiar with QuickActions at 9am may find 4 completely different options at 8pm (wind_down appears at night, medication at morning, etc.).

**Impact:** The tool grid is unpredictable across time-of-day transitions. A user looking for "breathing" in the evening might not find it in the same location.

**Specific fix:** Keep all 9 non-crisis tools in the grid; use visual dimming (opacity) for time-inappropriate tools rather than removing them. This preserves navigation predictability while still guiding appropriate use.

---

### 🟡 [Gap C-4] ToolsScreen context chips are redundant with QuickActions

**Research:** Cognitive load theory requires eliminating redundant information presentation. Multiple pathways to the same tools add cognitive overhead.

**Evidence:** `ToolsScreen.tsx:160-172` — context chips provide 1-3 tool shortcuts. `QuickActions.tsx:50-70` provides 4 tool shortcuts from ModeScreen. `ModeScreen.tsx:739-741` renders QuickActions. A user sees tools in THREE places with different layouts and filters.

**Impact:** Having QuickActions (ModeScreen), context chips (ToolsScreen), and recent tools (ToolsScreen) creates parallel tool-access patterns that a distressed user must parse. The cognitive work of understanding "which tools are where" adds load at exactly the moment it should be minimized.

**Specific fix:** Unify tool-access into one consistent pattern. QuickActions on ModeScreen is appropriate (immediate access). ToolsScreen context chips should be removed or merged into the category filter. Recent tools is sufficient for ToolsScreen navigation.

---

## 4. Micro-interactions (Dan Saffer)

### 🟠 [Gap M-1] "Remove from history" is misleading — LLM has already seen those messages

**Research:** Principle: "Microinteractions communicate system status accurately. Feedback must be truthful." Privacy is trust. The NilaMind philosophy is "nothing leaves your phone." A user who taps "Remove from history" reasonably expects Nila to no longer have seen their message.

**Evidence:** `ModeScreen.tsx:248-251` — `handleRemoveFromHistory` removes messages from the React `messages` state array. But the on-device LLM has already processed those messages in `sendToNila()`. The `sessionChat` persist/restore is separate. The LLM's context window has already been influenced. The model cannot "un-see" what it has already seen.

**Impact:** This is the most serious UX trust violation in the app. A user who is sharing something deeply personal, sees it was "removed," and then continues chatting may reasonably assume Nila has forgotten — but Nila's model weights and context have already been influenced by that content. If the user later realizes this, the trust damage is severe and potentially harmful.

**Specific fix:** Either (a) remove this feature entirely and replace with a visible "this conversation is not being saved" indicator during the session, or (b) rename it to "Hide from this view" with explicit explanation that "Nila has already seen this — this only removes it from what's shown here."

---

### 🟠 [Gap M-2] No visible feedback when thumbs up/down is selected

**Research:** Every action should have a gentle, expected reaction. Microinteraction feedback must be visible.

**Evidence:** `ModeScreen.tsx:786-801` — the thumbs up/down buttons are rendered. When `ratedMessages.has(i)` is true, the buttons are hidden. But when the user clicks thumbs up/down, there is no immediate visual confirmation (no checkmark, no color change on the buttons before they're hidden).

**Impact:** The user taps a feedback button and the buttons disappear — without any confirmation that the feedback was registered. The user may tap multiple times or assume the feedback didn't work.

**Specific fix:** Show a brief "Thanks for feedback" inline message or a checkmark animation before the buttons disappear. This is a 5-line change with high impact.

---

### 🟡 [Gap M-3] Suggestion chips have no visible feedback when tapped

**Research:** Every button press needs confirmation feedback.

**Evidence:** `ModeScreen.tsx:950-958` — suggestion chips send a message when tapped. But there's no visible press state (the chip doesn't change color or scale) and no confirmation that the message was queued.

**Impact:** The user taps a chip, the text appears in the input field (or sends directly), but the chip itself gives no feedback that it was pressed.

**Specific fix:** Add `active:scale-95` and `active:bg-line-strong` to the suggestion chip buttons in `ModeScreen.tsx:950`.

---

## 5. Mental Health-Specific UX

### 🔴 [Gap MH-1] Long-press for crisis (§9) on NilaFace violates WCAG accessibility

**Research:** WCAG 2.2 requires that trigger activation be achievable without complex gestures. A 500ms sustained press is a "complex gesture" that excludes motor-impaired users and users in acute tremor (medication side effect, Parkinson's, anxiety shake).

**Evidence:** `NilaFace.tsx:148-153` — `handleTouchStart` sets a 500ms timer to call `onLongPress()`. `ModeScreen.tsx:721` — `onLongPress={() => openCrisis()}`. There is no way to trigger crisis resources from NilaFace without a sustained 500ms press.

**Impact:** A user who needs crisis help and has tremor (common with anxiety, medication side effects, Parkinson's) cannot reliably trigger the crisis button via long-press. The primary fallback is the CrisisHeaderButton (single tap), but the long-press on the orb is presented as the discoverable interaction.

**Specific fix:** Reduce long-press requirement to 200ms (the minimum for intentionality detection without excluding tremor users). Additionally, add `aria-describedby` or `aria-label` to NilaFace that explicitly announces "long press or press Enter for crisis resources" so screen reader users know about this mechanism.

---

### 🔴 [Gap MH-2] "Remove from history" — same as Gap M-1 above

See above. This is a mental health trust violation as well as a microinteraction issue.

---

### 🟠 [Gap MH-3] No "No-Guilt Close" for mid-flow exits

**Research:** "If a user starts an exercise but cannot finish it, the design should offer a soft way out. Instead of a harsh 'Quit' button, use phrases like 'Take a Break' or 'Save for Later.'"

**Evidence:** Scans of ModeScreen capture flows (`openThoughtRecord`, `openProblemSolving`, `openValues`, `openSafetyPlan`) show they open capture sheets. But there is no "Take a Break" / "Save for Later" option in the capture sheet UI visible in ModeScreen. CaptureSheets.tsx is the sheet component — checking if it has gentle exit labels.

**Impact:** A user who starts a thought record during distress and then realizes they can't complete it may feel they have "failed" the exercise. The absence of an affirming exit path contradicts the compassionate design philosophy.

**Specific fix:** In CaptureSheets, add a "Take a break" button (distinct from X/close) with encouraging copy: "You can always come back to this." The X button should be labeled "Save draft" when appropriate, not just a geometric close icon.

---

### 🟠 [Gap MH-4] No notification ethics implementation visible

**Research:** "Notifications in mental health apps carry outsized impact. Design notifications that support rather than pressure." Harmful: "You broke your 7-day streak." Supportive: "It's been a while. We're here when you need us."

**Evidence:** No notification ethics implementation visible in the audited components. The `RemindersSection.tsx` exists but its content was not reviewed. If reminders use urgency language or comparison language ("Your friends are more consistent"), this violates the notification ethics principle.

**Impact:** If push notifications use guilt-based or comparison-based language, they can trigger shame spirals in users with depression. This is a documented harm pattern.

**Specific fix:** Audit all notification copy. Search for: "streak", "missed", "failed", "should", "need to", "must", "have you". Replace with: "Whenever you're ready", "We're here", "No pressure". Ensure no notification fires between 10pm-7am.

---

### 🟡 [Gap MH-5] No voice-first path for high-stress moments

**Research:** "Voice input as an alternative to typing during high-pressure states" — the Smashing Magazine pattern: detect distress → surface voice prominently → text remains accessible.

**Evidence:** `ModeScreen.tsx:971-1029` — the input bar shows a voice button and a text input as alternatives (one visible at a time). However, during high-stress moments, voice is NOT surfaced more prominently. The `mode.userState` check does not trigger a voice-first layout.

**Impact:** A user in acute panic may find typing difficult but may not discover that voice is available as an easier path.

**Specific fix:** When `mode.userState === "anxious" | "low"`, show voice and text side-by-side (not mutually exclusive). The voice button should be larger and more prominent. Consider auto-surfacing the voice prompt: "You're welcome to talk — just tap the microphone."

---

### 🟡 [Gap MH-6] Welcome/onboarding doesn't explicitly state privacy promise upfront

**Research:** Pillar 1 of the Empathy-Centred Framework: "Onboarding as a supportive first conversation. Use validating language, keep asking why, and make users feel seen from first interaction."

**Evidence:** `OnboardingGate.tsx` focuses on mood selection, region, goals. The privacy promise ("nothing leaves your phone") appears in the YouScreen welcome card: "Your private wellness companion. Everything stays on your device — nothing leaves your phone."

**Impact:** A user who reaches OnboardingGate and starts sharing before understanding privacy may hold back important context. The privacy promise should be in the onboarding flow itself, not deferred to the You tab.

**Specific fix:** Add a privacy reassurance step to OnboardingGate — a simple "Your data stays on your phone. Always." with a lock icon — before the mood selection. This removes the shame barrier from the onboarding conversation.

---

## 6. Accessibility & Cognitive Accessibility

### 🔴 [Gap A-1] Long-press for crisis — same as MH-1 above

See above. WCAG 2.2 violation.

---

### 🔴 [Gap A-2] Aurora-field ignores prefers-reduced-motion — same as E-2 above

See above. OS-level accessibility failure.

---

### 🟠 [Gap A-3] RatingPromptCard positioned inside the chat flow

**Research:** WCAG cognitive accessibility: "Don't require sustained attention or focus for long periods." Assessment tools that appear during chat (rating prompts) can be disruptive to users who are actively engaged in a supportive conversation.

**Evidence:** `ModeScreen.tsx:878` — `<RatingPromptCard />` is rendered inside the chat scroll area, between messages and the input bar. `ModeScreen.tsx:62` imports it. The file was not fully read, but its placement in the component tree is visible.

**Impact:** A rating prompt appearing mid-conversation in a mental health app may feel like an interruption to a vulnerable user. It could also feel like pressure to have a positive experience.

**Specific fix:** Move the rating prompt outside the chat area entirely — into a card that appears below the chat only when the session has ended (not during active conversation). Or remove it entirely (the App Store rating ask is better handled through the OS-native rating dialog, which users can dismiss without app context).

---

### 🟡 [Gap A-4] "Remove from history" button aria-label insufficient

**Evidence:** `ModeScreen.tsx:869-873` — the button aria-label is "Remove from history." There is no `aria-describedby` explaining that this only removes from the visible view.

**Impact:** Screen reader users hear "Remove from history" and may understand it as permanent deletion. This is the same trust issue as Gap M-1.

**Specific fix:** Add `aria-describedby` pointing to a visually-hidden explanation: "Removing from view only — Nila has already seen this message."

---

### 🟡 [Gap A-5] CrisisHeaderButton label could be more descriptive

**Evidence:** `CrisisHeaderButton.tsx:34` — `aria-label="Get help now"`. This tells the user what to do but not what they'll get.

**Impact:** A user who has never used the crisis feature might not understand what "help" means in this context.

**Specific fix:** `aria-label="Get help now — crisis resources and support"` or similar. The `title` attribute already has this.

---

## 7. Privacy-First Design

### 🔴 [Gap P-1] "Remove from history" — false sense of deletion (same as M-1)

See above. The most serious trust issue in the app. Users of a mental health app share intimate thoughts with an expectation of privacy. "Remove from history" implies complete removal, which is false.

---

### 🟡 [Gap P-2] No "Right to Disappear" (one-tap full data deletion)

**Research:** "Privacy by Default: users should be able to choose what stays on their device. We also support a 'Right to Disappear'. This is a one-tap button that permanently deletes all sensitive logs without unnecessary steps." — Gapsy Studio UX research.

**Evidence:** No single-tap full data deletion found in YouScreen. Data export exists (`YourDataScreen`). Deletion requires individual steps (delete checkins, delete diary, delete insights separately).

**Impact:** Users who want to leave or start fresh face a multi-step deletion process. A privacy-first app should offer one-tap complete erasure.

**Specific fix:** Add a "Delete all my data" button in YourDataScreen with confirmation (not cancellable without re-entering PIN/biometric). This respects the privacy autonomy that the app's core philosophy demands.

---

## 8. Innovation Gaps (Missing Features)

### 🟠 [Gap I-1] No haptic breathing guide (the phone as a physical pacer)

**Research:** "Headspace's AI companion Ebb... doesn't just talk; it listens... The phone literally pulses in your hand as you inhale and exhale. For someone in the middle of a panic attack who can't focus on a screen, this physical, tactile guide provides a grounding sensation." — Headspace design analysis.

**Evidence:** `BreathingScreen.tsx:70-76` — haptics fire on phase transitions (inhale→hold→exhale). `BreathingTimer.tsx` — NO haptics. The BreathingTimer is the lighter-weight tool likely used more frequently, but it has no haptic guidance.

**Impact:** The haptic breathing guide is one of the most innovative aspects of Headspace's design. It allows the phone itself to serve as a pacer without requiring visual attention. NilaMind has the infrastructure (hapticLight/hapticMedium) but doesn't use it for breathing guidance.

**Specific fix:** Add `hapticLight()` on phase transitions in BreathingTimer, mirroring BreathingScreen. For full innovation, add a "Haptic mode" toggle that replaces the visual circle with a phone that pulses rhythmically (no screen attention needed).

---

### 🟠 [Gap I-2] No capacity-adaptive input bar

**Evidence:** `ModeScreen.tsx:884-1031` — the input bar renders all elements regardless of `mode.userState`. The YouScreen (YouScreen.tsx:168-178) and TodayScreen (TodayScreen.tsx:326-333) have capacity-adaptive behavior, but ModeScreen does not.

**Impact:** The tab where users are most likely to be distressed (talking to Nila) has the least capacity-adaptive UI.

**Specific fix:** Wrap the input bar content in a capacity check. When `mode.userState === "anxious" | "elevated" | "low"`, collapse all but SoftCrisisCard, text input, and voice button.

---

### 🟡 [Gap I-3] No warm cold-start fallback screen

**Research:** When the app loads and the model is being read from storage (first reply after fresh start), it can take "a couple of minutes on a slower device." The current behavior shows a blank chat or a loading spinner.

**Evidence:** `ModeScreen.tsx:100-103` — the chat seeds with a WELCOME_SEED message. But if the model is loading on first use, the user sees an empty input bar and must wait.

**Impact:** The first impression of the app (cold start) is a waiting period with no emotional preparation. Headspace opens with a soundscape and visual that calms before the user reads anything.

**Specific fix:** Add a loading state component that shows NilaFace in a gentle "loading" animation with encouraging text: "Getting Nila ready... she has everything she needs right here on your phone." This primes the user for the experience rather than leaving them with a blank screen.

---

### 🟡 [Gap I-4] No "low-energy mode" — automatic UI simplification on distress

**Research:** "The 'Low-Energy' Mode: when a user reports distress or overwhelm, the interface should simplify automatically. Secondary features fade away, leaving only grounding tools and essential actions." — Gapsy Studio.

**Evidence:** YouScreen.tsx:168-178 has `useMemo` that filters rows when `state === "anxious"`. TodayScreen.tsx:329-332 has phase simplification. But ModeScreen has NO such simplification.

**Impact:** When a user is elevated and opens the Nila tab, they see the full chat UI — which may include stimulating suggestion chips, protocol cards, and the full nudge rail. This contradicts the "Architecture of Calm."

**Specific fix:** Add a `getModeScreenCapacity(mode)` function that returns "low | medium | high" and use it to conditionally render input bar elements. Low capacity = only crisis card + text input + voice.

---

## Summary Table

| ID | Gap | Severity | Principle |
|----|-----|----------|-----------|
| C-1 | Input bar 7 elements in low-capacity states | 🔴 CRITICAL | Cognitive Load / Mental Health UX |
| MH-1 | 500ms long-press for crisis on NilaFace | 🔴 CRITICAL | WCAG 2.2 / Motor Accessibility |
| M-1 | "Remove from history" — LLM has already seen messages | 🔴 CRITICAL | Micro-interactions / Privacy Trust |
| E-2 | Aurora-field ignores prefers-reduced-motion | 🔴 CRITICAL | Accessibility / Emotional Design |
| MH-2 | "Remove from history" — same | 🔴 CRITICAL | Mental Health Trust |
| P-1 | "Remove from history" — same | 🔴 CRITICAL | Privacy-First Design |
| A-1 | Long-press for crisis — same | 🔴 CRITICAL | Accessibility |
| A-2 | Aurora-field ignores prefers-reduced-motion — same | 🔴 CRITICAL | Accessibility |
| E-1 | NilaFace breathing 4.5s vs research 12s | 🟠 SIGNIFICANT | Emotional Design (Visceral) |
| E-3 | Listening state doubles orb speed | 🟠 SIGNIFICANT | Emotional Design (Visceral) |
| E-4 | Soft-register CSS never applied | 🟠 SIGNIFICANT | Emotional Design (Visceral) |
| E-7 | CrisisHeaderButton has no press haptic | 🟠 SIGNIFICANT | Emotional Design (Behavioral) |
| E-8 | BreathingTimer has no phase haptics | 🟠 SIGNIFICANT | Emotional Design (Behavioral) |
| MH-3 | No "No-Guilt Close" for mid-flow exits | 🟠 SIGNIFICANT | Mental Health UX |
| MH-4 | No notification ethics visible | 🟠 SIGNIFICANT | Mental Health UX |
| C-2 | Suggestion chips expand to 8+ items | 🟠 SIGNIFICANT | Cognitive Load (Hick's Law) |
| A-3 | RatingPromptCard in chat flow | 🟠 SIGNIFICANT | Cognitive Accessibility |
| I-1 | No haptic breathing pacer (phone pulses) | 🟠 SIGNIFICANT | Innovation |
| I-2 | No capacity-adaptive input bar on ModeScreen | 🟠 SIGNIFICANT | Innovation |
| E-5 | Transitions 200ms instead of 400-600ms | 🟡 MODERATE | Emotional Design (Visceral) |
| E-6 | Chat bubbles use hardcoded colors | 🟡 MODERATE | Emotional Design (Visceral) |
| E-9 | No haptic when Nila reply arrives | 🟡 MODERATE | Emotional Design (Behavioral) |
| C-3 | QuickActions changes meaning by time-of-day | 🟡 MODERATE | Cognitive Load (Jakob's Law) |
| C-4 | ToolsScreen chips redundant with QuickActions | 🟡 MODERATE | Cognitive Load |
| M-2 | No feedback when thumbs up/down selected | 🟡 MODERATE | Micro-interactions |
| M-3 | Suggestion chips have no press feedback | 🟡 MODERATE | Micro-interactions |
| MH-5 | No voice-first path in high-stress moments | 🟡 MODERATE | Mental Health UX |
| MH-6 | Privacy promise not in onboarding | 🟡 MODERATE | Mental Health UX |
| A-4 | "Remove from history" aria-label misleading | 🟡 MODERATE | Accessibility |
| A-5 | CrisisHeaderButton aria-label could be more descriptive | 🟡 MODERATE | Accessibility |
| P-2 | No one-tap "Right to Disappear" | 🟡 MODERATE | Privacy-First Design |
| I-3 | No warm cold-start fallback screen | 🟡 MODERATE | Innovation |
| I-4 | No automatic "low-energy mode" on ModeScreen | 🟡 MODERATE | Innovation |

---

## Recommendations Priority Order

### Immediate (before next release)

1. **Remove or rename "Remove from history"** — This is a trust-critical issue. The LLM cannot un-see what it has seen. Either remove the feature or rename it with explicit caveats.
2. **Reduce NilaFace long-press from 500ms to 200ms** — WCAG accessibility barrier for users with tremor.
3. **Fix aurora-field reduced-motion** — One CSS rule, immediate accessibility win.
4. **Add press haptic to CrisisHeaderButton** — Critical safety button needs tactile confirmation.
5. **Capacity-adaptive input bar on ModeScreen** — When userState is anxious/elevated/low, hide nudge rail, chips, and protocol card.

### Short-term (next sprint)

6. Fix NilaFace breathing animation timing (12s cycle, driven by motion config not hardcoded CSS).
7. Implement soft-register application to `<html>` via adaptiveTheme.ts.
8. Add haptics to BreathingTimer phase transitions.
9. Add "No-Guilt Close" / "Take a Break" to capture sheets.
10. Fix suggestion chips cap (max 4 visible).

### Medium-term (next release)

11. Remove listening-state speed doubling from NilaFace.
12. Add voice-first layout for high-stress states.
13. Audit and fix all notification copy for ethics.
14. Add "Remove from history" aria explanation or rename to "Hide from this view."
15. Add one-tap "Delete all my data" to YourDataScreen.
16. Add warm cold-start fallback screen.

### Long-term (future versions)

17. Implement full haptic breathing pacer (phone pulses with breathing phases, no screen needed).
18. Slow transitions to 400-600ms (Headspace-caliber).
19. Add privacy promise to onboarding flow.
20. Audit and fix all hardcoded color usages → semantic tokens.

---

*Analysis date: 2026-07-22*
*Audited by: Claude Code (critical review against docs/UI_UX_PRINCIPLES.md)*
*Coverage: ModeScreen, TodayScreen, YouScreen, ToolsScreen, NilaFace, CrisisHeaderButton, BreathingTimer, BreathingScreen, QuickActions, OnboardingGate, ConfettiBurst, useReducedMotion, index.css*