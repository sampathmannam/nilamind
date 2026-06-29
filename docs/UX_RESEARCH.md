# NilaMind UX Research — the basis for the redesign

This is the evidence behind the UI redesign. Per the project rule (research-grounded, never
generic), every redesign decision should trace back to something here. Synthesized from three
parallel studies: (A) calming + mood-tracking apps, (B) AI-coach + CBT apps, (C) the clinical /
calm-tech UX literature.

## The one-line verdict

Every well-loved app in this category lands its home at **3–6 elements with one obvious primary
action**, logs a mood in **~2 taps with no typing**, and uses a **soft, warm, low-saturation
palette**. NilaMind's redesign improves on this with a warm-dark theme + simplified home + near-black (`#0A0C0F`) + bright-blue scheme was close
to the documented *worst case* for an audience whose core symptoms include decision fatigue and
overwhelm.

## Per-app patterns (study A + B)

| App | Home density | Tabs | Primary action | Mood-log taps | Aesthetic |
|---|---|---|---|---|---|
| Headspace | Low (4–6 cards, time-of-day) | 3 | One-tap start | 1 | Warm orange, blob illustration |
| Calm | Medium feed | 4 | Daily Calm | 1–4 | Blue gradients, photo scenes |
| How We Feel | Low | ~3–4 | The check-in | ~3 (quadrant→word) | 4-colour gradient, polished |
| Finch | Low–med | ~5 (+drawer) | Complete a goal | 2–4 | Soft pastels, pet character |
| Daylio | Low timeline | 4 (center +) | The "+" | **2** | Flat, 5 mood icons+colours |
| Bearable | **High (10+)** | 5 | Inline check-in | 1–few | Data-viz, "bland" (most-criticised) |
| Wysa | Chat-first | 4 | Talk now | 1 | Near-black + icy blue, penguin |
| Woebot | Chat-only | — | Chat | 1 emoji | Cartoon robot, mood-gated humour |
| Youper | Check-in-first | 3 | Check-in | tap-tree | Blue, minimal, **no mascot** |
| Sanvello | **Dashboard (cluttered)** | 5 | Mood check-in | slider | Cool blues/purples, no mascot |
| **NilaMind (redesign)** | **~4 elements** | 4 | 2-tap mood / Nila | 2 | Warm charcoal + muted accent |

Key specifics worth copying:
- **Daylio** — "create an entry in two taps." The trick is **auto-advance** (mood tap → screen
  advances with no "Next") and **bounded taps instead of a blank text page**.
- **How We Feel** — progressive disclosure: coarse (energy × pleasantness) → optional specific word
  (up to 144) → optional context. Meaningful in a few taps, deep if wanted. Surfaces strategy buckets
  *after* the check-in (Change Your Thinking / Move Your Body / Be Mindful / Reach Out).
- **Headspace** — deliberately collapsed 4 tabs → "Today + Explore + Profile" after user research;
  "simplicity at the surface, depth underneath."
- **Finch** — additive-only feedback, "you can't fail," guilt-free streak pause → category-best
  retention. (We already adopted this for streaks.)
- **Wysa** — delivers the recommended skill **inline in the chat** ("feels like a coaching session,
  not a to-do list"); skills grouped into topic "Packs," never labelled "CBT" to the user.
- **Woebot** — **mood-gated tone**: lighter when the user's okay, slower/pure-validation when
  they're struggling. Steal this for Nila.
- **Youper / Pi / the AI-journaling wave (Rosebud, Clarity, Stoic)** — **no mascot**; warmth via tone
  and an abstract presence. Scripted decision-trees feel "formulaic/brittle" — a Claude-powered Nila
  is the antidote, so don't bury it under chips or a dashboard.

## Evidence-based principles (study C)

Priority order for a distressed, low-motivation user:

1. **Radical subtraction — one clear thing per screen.** Depression/anxiety shrink working memory;
   every extra choice taxes a depleted budget and pushes users to avoidance (closing the app).
2. **≤4 options at any decision point.**
3. **Help is the only success metric — never engagement.** Streaks/points/badges "mirror addiction
   models"; clinical vendors *remove* them.
4. **Get to relief in seconds, not setup.** ~96% churn by day 15 — deliver one small dose of relief
   before any account/feature tour.
5. **Soft, low-saturation, warm palette.** Muted blues/greens/lavender/neutrals engage the
   parasympathetic system; bright/neon and **cold dark blue specifically can worsen mood**.
6. **Validate before you instruct.** "It's okay to feel this way" before any ask.
7. **Forgiving progress, never punitive.** (Already done.)
8. **Predictable, interruption-free; user controls all motion.** Honour `prefers-reduced-motion`.
9. **Calm in the periphery — quiet by default.**
10. **Plain-language, scannable content.**
11. **Accessible by spec** — ≥4.5:1 text contrast, large tap targets, no timed forms.
12. **Privacy as care, in plain words.** (Our differentiator.)

## What this means for NilaMind (the redesign plan)

1. **Warm-dark theme**: replace `#0A0C0F` near-black + bright blue with a warm charcoal base + a
   single muted accent (sage/peach) + warm off-white text. Keep contrast ≥4.5. (Offer light/system
   later.)
2. **Home → ~4 elements**: greeting · one time-aware hero action · 2-tap mood · "Talk to Nila." Move
   the other ~11 cards into tabs.
3. **4-tab nav**: Today · Nila · Tools · You. *Tools* = skills (regrouped into ~5 buckets) +
   screenings + BA + values + phone patterns; *You* = dashboard/insights + data + settings + article.
4. **2-tap mood logging**, auto-advance, no typing; optional granularity.
5. **Nila** = calm orb (no mascot), validate→reflect→one skill, skill delivered inline, tone gated to
   distress.
6. **Persistent calm crisis access** in the header (not a red banner, never buried).

## Sources

Calming / mood apps: Calm ([usabilitygeek](https://usabilitygeek.com/ux-case-study-calm-mobile-app/),
[goodux/appcues onboarding](https://goodux.appcues.com/blog/calm-app-new-user-experience)),
Headspace ([Apple "Behind the Design"](https://developer.apple.com/news/?id=fkfnhq8u),
[Kimp brand](https://www.kimp.io/headspace-brand/)),
Finch ([aViewFromTheCave](https://www.aviewfromthecave.com/what-is-finch-app/),
[Pratt critique](https://ixd.prattsi.org/2024/09/design-critique-finch-ios-app/)),
Daylio ([daylio.net](https://daylio.net/), [Medium critique](https://medium.com/@xixi743/daylio-design-critique-23b0f17f5f5a)),
How We Feel ([Apple feature](https://apps.apple.com/story/id1638393948), [marcbrackett.com](https://marcbrackett.com/how-we-feel-app-3/)),
Bearable ([appsreviewnest](https://appsreviewnest.com/app-review/bearable-app-best-symptom-tracker/), [correlations caveat](https://bearable.app/support/troubleshooting/my-correlations-are-wrong-dont-make-sense/)).

AI-coach / CBT apps: Wysa ([screensdesign](https://screensdesign.com/showcase/wysa-mental-health-ai), [review](https://josephctylerwords.medium.com/review-wysa-54b127bb12a3)),
Woebot ([UX Writing Hub](https://uxwritinghub.com/woebot-case-study-in-conversation-design-for-mental-health-products/), [IEEE Spectrum](https://spectrum.ieee.org/woebot)),
Sanvello ([Designli](https://designli.co/blog/under-the-hood-how-sanvello-uses-behavioral-design-to-boost-mental-health/)),
Youper ([youper.ai](https://www.youper.ai/), [scripted critique](https://heynoah.ai/blog/noah-ai-vs-youper-choosing-the-right-ai-mental-health-companion)),
AI-journaling ([Clarity](https://screensdesign.com/showcase/clarity-cbt-self-help-journal), [Rosebud](https://screensdesign.com/showcase/rosebud-ai-journal-diary), [Stoic](https://www.getstoic.com/blog/stoic-foundation-model-ai-features)),
[Replika FTC complaint (anti-pattern)](https://time.com/7209824/replika-ftc-complaint/).

Clinical / calm-tech UX: [Calm Tech Institute — 8 principles](https://www.calmtech.institute/calm-tech-principles),
[Smashing — Empathy-Centred UX for Mental Health (2026)](https://www.smashingmagazine.com/2026/02/building-empathy-centred-ux-framework-mental-health-apps/),
[SilverCloud/Amwell — design ethics, avoiding dark patterns](https://silvercloud.amwell.com/blog/2022/01/design-ethics-for-mental-health-how-and-why-we-avoid-dark-patterns),
[PMC — digital wellness or dependency? (peer-reviewed)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12003299/),
[CogniFit — colours that calm the mind](https://blog.cognifit.com/colors-that-calm-the-mind-what-psychology-and-cognitive-science-reveal/),
[InclusionHub — WCAG for mental health](https://www.inclusionhub.com/articles/improving-wcag-for-mental-health),
[JITAI review (JMIR)](https://www.jmir.org/2021/9/e29412),
[CHI 2025 — AI companionship harm taxonomy](https://dl.acm.org/doi/10.1145/3706598.3713429).
