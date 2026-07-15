# Getting NilaMind onto IzzyOnDroid (F-Droid ecosystem)

> Status: **submitted** — [Issue #374](https://codeberg.org/IzzyOnDroid/repodata/issues/374),
> opened 2026-07-14. IzzyOnDroid ships your *existing* signed GitHub-release APK (keeps YOUR
> key, so it stays consistent with Obtainium — a user can move between the two without
> reinstalling). It does **not** build from source, so the prebuilt `llama.cpp` `.so` that
> blocks official f-droid.org is a non-issue here.

> ⚠️ **The old GitLab issue tracker is gone.** `gitlab.com/IzzyOnDroid/repo` is now
> **archived/read-only** — its issue tracker moved to Codeberg. Use the process below, not
> the old GitLab URL.

## Readiness checklist — all green

| Requirement | Status |
|---|---|
| FOSS license | ✅ Apache-2.0 (`LICENSE`) |
| Signed APK on a public release page | ✅ [GitHub Releases](https://github.com/sampathmannam/nilamind/releases), `nilamind-v1.9.10.apk`, key cert `003f02bc…c37d` |
| Tagged releases for update tracking | ✅ `v*` tags (`UpdateCheckMode: Tags`) |
| Fastlane metadata in repo | ✅ `fastlane/metadata/android/en-US/` — title, short + full description, icon, feature graphic, 2 screenshots, changelog `17.txt` (this release) |
| No trackers / proprietary SDKs | ✅ APK scanned — no GMS/Firebase/analytics classes present |
| Anti-features | 🟢 None hard-blocking. First-run model download is libre (Qwen2.5-1.5B, Apache-2.0); note it if asked. |

## How to submit (current process — Codeberg, not GitLab)

1. Sign in at <https://codeberg.org> (separate account from GitLab — Codeberg is a
   different, Gitea-based service).
2. Go to the **repodata** issue tracker:
   <https://codeberg.org/IzzyOnDroid/repodata/issues/new/choose>
3. Pick the **"App Inclusion Request"** template and fill it in. It's a structured form,
   not a paste-block — key fields:
   - **Title**: `[AppRequest] NilaMind`
   - **Guidelines checkboxes**: developer of the app, complies with the
     [App Inclusion Policy](https://izzyondroid.org/docs/general/AppInclusionPolicy/), not
     already listed, Fastlane folder present — all true, check all four.
   - **Link to source code**: `https://github.com/sampathmannam/nilamind`
   - **License used**: `Apache-2.0`
   - **Categories**: `Sports & Health`
   - **Summary / Description**: pulled from `fastlane/metadata/android/en-US/`
     (`short_description.txt` / `full_description.txt`)
   - **Build instructions**: see *Build & run* in the main [`README.md`](../README.md)
     (`npm install && npm run build && npx cap sync android && npx cap open android`)
   - **AI Tools Usage**: disclose honestly — this project was built with substantial
     Claude Code assistance, human-directed and human-reviewed throughout. Fill
     Assistance Level / Tool(s) / what they helped with / accountability checkboxes
     accordingly rather than leaving this section blank.
4. Submit. IzzyOnDroid scans the APK and, once accepted, adds it; thereafter it
   **auto-picks up new releases** you cut on GitHub (same flow you already use for
   Obtainium — no extra step per release).

### Already-submitted request

Filed as [Issue #374](https://codeberg.org/IzzyOnDroid/repodata/issues/374) on 2026-07-14.
No need to resubmit unless it's closed/rejected — check that issue for reviewer feedback
(labels like `needs/apk-scan`, `needs/on-device-test` track their review pipeline).

## After it's live

Users add the IzzyOnDroid repo in their F-Droid client (many already have it) and NilaMind shows
up there, auto-updating from your GitHub releases. Obtainium remains the other supported channel;
both use the same signed APK, so they don't conflict.
