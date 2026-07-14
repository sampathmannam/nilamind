# Getting NilaMind onto IzzyOnDroid (F-Droid ecosystem)

> Status: **ready to submit** — audited 2026-07-14. IzzyOnDroid ships your *existing* signed
> GitHub-release APK (keeps YOUR key, so it stays consistent with Obtainium — a user can move
> between the two without reinstalling). It does **not** build from source, so the prebuilt
> `llama.cpp` `.so` that blocks official f-droid.org is a non-issue here.

## Readiness checklist — all green

| Requirement | Status |
|---|---|
| FOSS license | ✅ Apache-2.0 (`LICENSE`) |
| Signed APK on a public release page | ✅ [GitHub Releases](https://github.com/sampathmannam/nilamind/releases), `nilamind-v1.9.10.apk`, key cert `003f02bc…c37d` |
| Tagged releases for update tracking | ✅ `v*` tags (`UpdateCheckMode: Tags`) |
| Fastlane metadata in repo | ✅ `fastlane/metadata/android/en-US/` — title, short + full description, icon, feature graphic, 2 screenshots, changelog `17.txt` (this release) |
| No trackers / proprietary SDKs | ✅ APK scanned — no GMS/Firebase/analytics classes present |
| Anti-features | 🟢 None hard-blocking. First-run model download is libre (Qwen2.5-1.5B, Apache-2.0); note it if asked. |

## How to submit (you must do this — needs a GitLab account)

1. Read IzzyOnDroid's inclusion criteria & process:
   <https://gitlab.com/IzzyOnDroid/repo> → "How do I get my app included?"
2. Open a request on their issue tracker:
   <https://gitlab.com/IzzyOnDroid/repo/-/issues/new> — pick the app-inclusion / RFP template.
3. Paste the block below.
4. IzzyOnDroid scans the APK and adds it; thereafter it **auto-picks up new releases** you cut
   on GitHub (same flow you already use for Obtainium — no extra step per release).

### Copy-paste for the request

```
App name:      NilaMind
Package ID:    com.nilamind.app
Summary:       A private, fully on-device mental-health companion. Nothing leaves your phone.
License:       Apache-2.0
Source code:   https://github.com/sampathmannam/nilamind
Issue tracker: https://github.com/sampathmannam/nilamind/issues
Releases:      https://github.com/sampathmannam/nilamind/releases
              (signed APK asset per release, e.g. nilamind-v1.9.10.apk)
Update mode:   GitHub release tags (v1.9.10, versionCode 17, and onward)
Fastlane meta: present at fastlane/metadata/android/en-US/ (descriptions, icon, screenshots, changelogs)
Notes:         100% on-device inference via llama.cpp (Qwen2.5-1.5B, Apache-2.0). No trackers,
              no analytics, no Firebase/GMS. The ~1.1 GB model is downloaded from Hugging Face
              on first run (libre Apache-2.0 data). Also distributed via Obtainium from the same
              GitHub releases; APK signing key is stable across versions.
```

## After it's live

Users add the IzzyOnDroid repo in their F-Droid client (many already have it) and NilaMind shows
up there, auto-updating from your GitHub releases. Obtainium remains the other supported channel;
both use the same signed APK, so they don't conflict.
