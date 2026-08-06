# Senior Designer & Architect Review — NilaMind

> "The app is calm now. But calm isn't the same as clear."

## What's Working (Keep These)

1. Warm color palette — earthy tones feel safe, not clinical
2. Calm transitions — 500ms feels deliberate and soothing
3. Tab structure — 4 tabs is correct, don't add more
4. Single recommended action on Home — Headspace does this well
5. Crisis access always visible — safety-first, non-negotiable
6. Tool organization by category — Calm/Track/Skills is intuitive

---

## 12 Redesign Recommendations

### 1. The Orb is Eating the Chat

The Nila orb + "What happened today?" + Breathe/Ground buttons consume ~50% of the screen before a single message appears. In a chat app, the conversation IS the product.

**Fix:** Shrink the orb to a small avatar in the header row (like iMessage). Chat opens directly to conversation. Breathe/Ground become a compact toolbar above input, not full-width blocks.

**Impact:** Users see 3x more conversation content on first open.

### 2. Rating Prompt is Intrusive

"Enjoying NilaMind? Rate on Play Store" appears IN the conversation flow, blocking messages. This is the worst moment to ask for a rating.

**Fix:** Move to Home tab as dismissible card. Or trigger after 5+ sessions only. Never interrupt a conversation for meta-asks.

### 3. Home Tab Has Wasted Space

Bottom 50% of Home is empty white space. On a 6-inch phone, that is 3+ inches of nothing.

**Fix:** Add a "Recently used" section showing last 2-3 tools. Personalization is the #1 retention feature (Notion, Figma, Linear all do this). Reduces decision fatigue.

### 4. "Talk to Nila" is Redundant

Home has "Talk to Nila" but the Nila tab is right there in the nav bar. Two paths to the same place equals confusion.

**Fix:** Remove "Talk to Nila" from Home. The nav bar handles it.

### 5. Tools Tab Needs Visual Hierarchy

All 15 tools look identical. No distinction between "I use this daily" and "I used this once."

**Fix:** Add a "Pinned" or "Quick access" row at top showing the user's 3 most-used tools with slightly larger cards. Keep the categorized list below.

### 6. Streak Card Pressures New Users

"0-day streak" with empty dots feels like failure for new users. Research shows streaks create shame in depression.

**Fix:** For 0-streak users, show "Welcome — your first check-in starts here" without the streak number. For active users, show streak subtly. Never reset streaks on miss (forgiveness model).

### 7. Tab Names Could Be Clearer

"Today" is confusing — it is the Home screen, not a diary. "You" is vague.

**Fix:** Rename "Today" to "Home". Rename "You" to "Profile" or keep "You" but add a subtitle. This is low-effort, high-clarity.

### 8. Settings is Buried

Settings requires 2 taps minimum (You tab, then Settings row). Dark mode toggle, voice settings, and notification preferences are the most-accessed settings in any app.

**Fix:** Add a gear icon in the Home tab header (next to greeting). One tap to settings.

### 9. No Skeleton Loading States

When switching tabs or opening tools, there is a flash of empty space before content loads. This feels broken.

**Fix:** Add skeleton placeholders (the Skeleton components already exist in the codebase). Use them in Tools, You, and overlay screens.

### 10. Suggestion Chips Have Hidden Content

"+1 more" on the chat suggestion chips is a hidden pattern. Users should not have to tap to see what is available.

**Fix:** Show all 3 chips. If there are more, scroll horizontally. Never hide behind "+N more".

### 11. Crisis Button Inconsistent

The crisis button looks different on each tab — a pill on Home, "Help" in Chat header, absent on Tools, absent on You.

**Fix:** Standardize to a single persistent crisis indicator. Options: (a) always-visible pill at the bottom of every tab, or (b) a floating action button that stays in the same position. Consistency equals reliability.

### 12. No Onboarding Personalization

The app jumps straight into the interface. No questions about what the user wants help with. No choice of tools to pin.

**Fix:** After the existing onboarding, add a 10-second "What matters most?" screen with 4 options: Sleep, Anxiety, Mood, Relationships. Use this to personalize the Home tab recommended action and Tools pinned section.

---

## Priority Order

| Priority | Recommendation | Effort | Impact |
|----------|---------------|--------|--------|
| P0 | Rating prompt out of chat | Small | High |
| P0 | Remove "Talk to Nila" from Home | Tiny | Medium |
| P1 | Shrink orb, open to conversation | Medium | High |
| P1 | Add "Recently used" to Home | Medium | High |
| P1 | Add pinned tools to Tools tab | Medium | High |
| P2 | Fix streak empty state | Small | Medium |
| P2 | Rename Today to Home | Tiny | Low |
| P2 | Add gear icon to Home header | Tiny | Medium |
| P2 | Show all suggestion chips | Tiny | Low |
| P3 | Skeleton loading states | Medium | Medium |
| P3 | Standardize crisis button | Small | Medium |
| P3 | Onboarding personalization | Large | High |

---

## The Designer's Litmus Test

> "Would this interaction still feel safe to someone experiencing acute stress?"

Every recommendation above passes this test. The current app passes it too — which is why these are refinements, not rewrites.
