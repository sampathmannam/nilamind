# NilaMind — Launch Kit

Everything you need to publish NilaMind on every platform. Copy, paste, hit publish.

---

## 1. Product Hunt

**Launch day:** Tuesday (PH's highest-traffic day). Schedule for 12:01 AM PT.

**Tagline:**
A private, fully on-device mental health companion — nothing leaves your phone

**Description:**
NilaMind is an Android app built around Nila — someone you can talk to by voice or text for everyday emotional support. The language model, the crisis-safety checks, voice transcription, and all your data run on your phone. There is no account, no backend, and no analytics.

I built this after my own experience with bipolar disorder. I wanted a companion I could talk to at 3 AM without worrying about where my words were going. So I made one that never connects to anything.

What makes it different:
- 100% on-device LLM via llama.cpp — a 1.5B model runs on your phone, no cloud
- Voice stays on-device too — speech-to-text runs locally (Vosk) by default
- Deterministic crisis safety — a keyword scanner + MiniLM classifier that catches crisis signals independent of the AI; the model can't influence it
- Mania-first safeguards — detects grandiosity, impulsive spending, racing thoughts, hypersexuality, and blocks validation of manic delusions
- Evidence-based tools — DBT, CBT, ACT, self-compassion, grounding, breathing exercises, sleep wind-down
- 4 Indian languages — Hindi, Tamil, Telugu, English; India crisis lines (Tele-MANAS, Kiran)
- Open source (Apache 2.0) — 2500+ tests, 230+ test files, fully auditable

The default model (Qwen2.5-1.5B) is downloaded once on first run (~1.1 GB over Wi-Fi) and then the app works fully offline.

Not therapy. Not a medical device. A wellness companion — for the hard days.

**Website:** https://github.com/sampathmannam/nilamind
**Install:** https://github.com/sampathmannam/nilamind/releases

**First comment (post immediately after launching):**
> Hey everyone — maker here.
>
> I have bipolar disorder. For years, the hardest moments were the ones where I needed to talk to someone but couldn't — at 3 AM, during a mixed episode, when the shame was too heavy to tell a real person.
>
> I built NilaMind so there's always someone to talk to. But the deal is: you should never have to trade your privacy for support. So the entire AI runs on your phone. Your conversations, your mood, your voice — none of it ever leaves the device. There's no account. There's no server. Even the crisis detection runs on-device, independent of the AI, so the model can't be tricked into missing a cry for help.
>
> This is open source (Apache 2.0), ~2500 tests, fully auditable. It's been my late-night project for months. I'm sharing it because someone else might need it too.
>
> Happy to answer any questions about the on-device AI architecture, the safety design, or why I chose to keep it local instead of using a cloud API. AMA.

**Images to upload:**
- The chat screen with Nila responding (with the warm purple gradient)
- The Tools tab showing evidence-based skills
- The crisis safety overlay example
- (Optional) A screenshot in Hindi/Tamil showing localization

**Topics:** Android, Open Source, Mental Health, Privacy, Artificial Intelligence

---

## 2. Hacker News — Show HN

**Title:** Show HN: NilaMind — a fully on-device mental health companion (no cloud, no account)

**Post:**
I built a mental health companion app that runs entirely on your Android phone — the language model, voice transcription, crisis detection, and all your data stay on-device. No account, no backend, no analytics. Nothing leaves the phone.

**Why on-device?**
Mental health conversations are the most private conversations you can have. If you're telling something to an AI about your darkest thoughts, you need to know — really know — that those words don't go anywhere. With cloud APIs, you don't. So I ran a 1.5B parameter model (Qwen2.5, Apache 2.0) entirely on-device via llama.cpp.

**Technical choices:**
- Capacitor + React for the Android shell
- llama.cpp compiled via CMake externalNativeBuild, runs a Q4_K_M quantized Qwen2.5-1.5B GGUF
- Vosk WASM for on-device speech-to-text (voice never leaves the phone)
- MiniLM via ONNX Runtime Web for crisis classification (additive, independent of the LLM)
- Deterministic keyword scanner as the safety floor — the LLM can never influence whether a crisis alert fires
- AES-256-GCM encrypted on-device storage (IndexedDB)
- BIP39-based zero-knowledge identity (no account, just a 12-word phrase for recovery)

**Why not just use GPT-4/Gemini API?**
Because the whole point is privacy. If my words go to a server, I've already lost. The 1.5B model is small, sure — but the app is designed around its limits. The model listens and reflects. The app handles the "what to do" (CBT/DBT tools, grounding exercises) deterministically. The model doesn't pretend to be a therapist — it's a warm presence, and the app carries the evidence-based work.

Source: https://github.com/sampathmannam/nilamind
License: Apache 2.0

---

## 3. Reddit Posts

### r/opensource

**Title:** NilaMind — an open-source, 100% on-device mental health companion (Apache 2.0, Android)

**Post:**
I'm sharing an open-source project I've been working on for months: NilaMind.

It's a mental health companion for Android that runs an LLM entirely on your phone. Your conversations, mood tracking, voice input — nothing leaves the device. No account needed. No cloud.

**Stack:** React 19, Capacitor 8, llama.cpp (on-device inference), Vosk (on-device STT), ONNX Runtime Web (crisis classifier), Tailwind 4.

**What's inside:**
- On-device LLM via llama.cpp (Qwen2.5-1.5B GGUF, Apache 2.0)
- Voice chat with on-device transcription (Vosk)
- Deterministic crisis safety layer independent of the AI
- Evidence-based tools (CBT, DBT, ACT, self-compassion, grounding)
- Mood tracking, sleep tracking, episode phase tracking
- Hindi, Tamil, Telugu, English localization
- ~2500 tests, fully TDD, air-gapped from any server

**Why this exists:** I have bipolar disorder and wanted a companion I could talk to at any hour without worrying about where my data goes. Most mental health apps collect everything. This one collects nothing.

Repo: https://github.com/sampathmannam/nilamind

Would love feedback from the open-source community — especially on the on-device inference architecture and the safety design.

---

### r/androidapps

**Title:** I built an Android app that runs an AI therapist entirely on your phone — no internet needed after setup

**Post:**
Hey r/androidapps — I built NilaMind, a free and open-source mental health companion for Android.

The key thing: the AI runs on your phone. There's no cloud server processing your conversations. Everything — the language model, voice transcription, mood data, crisis detection — stays on-device.

**How it works:**
1. Install the APK from GitHub
2. First run downloads a 1.1 GB language model over Wi-Fi (Apache 2.0 licensed)
3. After that, the app works fully offline — even voice input processes locally

**Features:**
- Talk to Nila by voice or text — she listens and responds warmly
- Evidence-based coping tools (CBT, DBT, grounding, breathing, sleep wind-down)
- Crisis safety layer that detects distress and surfaces help (runs on-device, independent of the AI)
- Mood tracking, sleep tracking, check-ins
- Supports Hindi, Tamil, Telugu, and English
- Fully open source (Apache 2.0)

**Why on-device?**
Mental health conversations are the most private thing you can share with an app. I didn't want those words stored on someone else's server.

Free, no ads, no account, no tracking. Get it from GitHub Releases or via Obtainium: https://github.com/sampathmannam/nilamind

---

### r/privacy

**Title:** NilaMind — a mental health AI that never sends your data anywhere (100% on-device, open source)

**Post:**
The privacy community might appreciate this: I built an open-source mental health companion app that runs everything on-device.

**What runs locally:**
- LLM inference (llama.cpp + Qwen2.5-1.5B GGUF)
- Voice transcription (Vosk)
- Crisis detection (keyword scanner + MiniLM classifier)
- All data storage (encrypted AES-256-GCM, IndexedDB)

**What connects to the network:**
- One download on first run: the 1.1 GB language model from HuggingFace (Apache 2.0)
- That's it. After that, the app is fully offline.

No account. No analytics. No third-party SDKs. No Firebase. No Google Services (the classpath was removed from the build). No telemetry. No crash reporting. Not even external fonts — everything is self-hosted via @fontsource.

The code is auditable: https://github.com/sampathmannam/nilamind (Apache 2.0, ~2500 tests, 230+ test files)

I built this because I have bipolar disorder and wanted to talk to an AI at 3 AM without sending my most vulnerable thoughts to a server. If you care about privacy in mental health, I'd love your feedback — especially your scrutiny of the data flow.

---

### r/selfhosted

**Title:** NilaMind — self-hosted mental health AI on your phone (fully offline after model download)

**Post:**
Sharing an open-source project that the selfhosted crowd might like: NilaMind.

It's an Android app that runs an LLM locally on your phone for mental health support. No cloud, no server, no account. You can even side-load your own GGUF model if you want a different brain.

Stack: llama.cpp, React, Capacitor, Vosk (on-device STT).

After the one-time model download (~1.1 GB, over Wi-Fi), the app is fully offline. Air-gapped. Voice processing stays on-device. Encrypted local storage.

Repo: https://github.com/sampathmannam/nilamind | Apache 2.0

---

## 4. AlternativeTo.net Submission

**App name:** NilaMind
**Category:** Health & Fitness / Mental Health
**Description:** A free, open-source mental wellness companion for Android. Runs a local AI model entirely on your device — no account, no cloud, no data collection. Talk by voice or text anytime, even offline.

**Alternatives to:** Wysa, Woebot, Headspace, Youper, Replika (for mental health use)
**License:** Open Source (Apache 2.0)
**Platform:** Android

---

## 5. Social Media — Short Posts

### Twitter/X

**Post 1 (launch day):**
I built an AI mental health companion that runs entirely on your phone.

No cloud. No account. No data collection. Not even your voice leaves the device.

Open source. Apache 2.0. ~2500 tests.

It's called NilaMind. https://github.com/sampathmannam/nilamind

**Post 2 (tech angle):**
Running a 1.5B-parameter LLM entirely on-device for mental health support.

Stack: llama.cpp + React + Capacitor + Vosk (on-device STT) + ONNX Runtime Web.

The crisis safety layer is deterministic — the AI can never influence whether help is surfaced. This was the most important design decision.

https://github.com/sampathmannam/nilamind

**Post 3 (personal angle):**
I have bipolar. The hardest moments were at 3 AM, alone, needing to talk but too ashamed to tell anyone.

So I built NilaMind — an AI companion that runs on your phone and never sends your words anywhere.

Free. Open source. For the hard days. https://github.com/sampathmannam/nilamind

### LinkedIn

**Post:**
I'm sharing a personal project I've been building for months: NilaMind — an open-source, on-device mental wellness companion for Android.

The core problem it solves: mental health conversations are the most private conversations you can have, but most AI mental health tools send your words to a cloud server. NilaMind doesn't. The language model, voice transcription, crisis detection, and all your data run entirely on your phone.

Technical highlights:
→ llama.cpp running a 1.5B GGUF model on-device
→ Deterministic, model-independent crisis safety layer
→ On-device voice processing (Vosk)
→ AES-256-GCM encrypted local storage
→ ~2,500 tests, fully TDD, Apache 2.0 license
→ Hindi, Tamil, Telugu, English localization

This is not a startup. It's not a product. It's free, open-source software shared in the hope it helps someone.

https://github.com/sampathmannam/nilamind

---

## 6. YouTube Demo Script

**Title:** NilaMind — On-Device AI Mental Health Companion (Demo)

**Duration:** 2-3 minutes

**Script outline:**
0:00 — Intro: "This is NilaMind. It's a mental health companion that runs entirely on your phone..."
0:15 — Show the chat: type a message, Nila replies
0:45 — Show voice input: "Hey Nila, I'm feeling really anxious today..."
1:15 — Show the Tools tab: grounding, breathing, DBT skills
1:45 — Show crisis safety: demonstrate the overlay
2:15 — Show privacy: Settings → "All data stored on-device"
2:45 — Show GitHub: open source, stars, installation

**Key visual:** At 0:30, toggle airplane mode and continue chatting — prove it's offline.

---

## 7. Publish These Posts To

| Platform | Draft Above | URL |
|----------|-------------|-----|
| Product Hunt | Section 1 | https://www.producthunt.com/posts/create |
| Hacker News | Section 2 | https://news.ycombinator.com/submit |
| r/opensource | Section 3a | https://reddit.com/r/opensource/submit |
| r/androidapps | Section 3b | https://reddit.com/r/androidapps/submit |
| r/privacy | Section 3c | https://reddit.com/r/privacy/submit |
| r/selfhosted | Section 3d | https://reddit.com/r/selfhosted/submit |
| AlternativeTo | Section 4 | https://alternativeto.net/software/nilamind/add/ |
| Twitter/X | Section 5 | Schedule across 3 days |
| LinkedIn | Section 5 | Post once |
| YouTube | Section 6 | Record on phone screen |

## 8. Launch Sequence (Recommended Order)

Day 1 (Tuesday):
- 12:01 AM PT → Product Hunt launch
- 8:00 AM ET → Hacker News Show HN (peak HN traffic)
- 10:00 AM ET → r/androidapps + r/opensource
- 12:00 PM ET → Twitter thread (post 2, tech angle)
- 2:00 PM ET → LinkedIn
- 6:00 PM ET → r/privacy + r/selfhosted

Day 2:
- Morning → Twitter (post 3, personal angle)
- Afternoon → Cross-post the tech blog (Section 9 in launch kit)

Day 3:
- Submit to AlternativeTo
- Submit to awesome lists on GitHub (awesome-privacy, awesome-mental-health)
- Post the YouTube demo

---

## 9. Technical Blog Post

See `docs/blog-on-device-llm.md` for the full technical blog post draft.
