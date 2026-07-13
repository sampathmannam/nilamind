# Play Console Reviewer Notes

Paste this into the Play Console review-notes field before submitting — see `DISTRIBUTION.md` →
"Play Store release" → "Play Console". Keep it in sync if the first-run download size or flow changes
(check `src/services/modelCatalog.ts` for the current model's `sizeBytes`).

## App Overview
NilaMind is a fully on-device mental-health companion. There is no login, no account, and no
backend — the app works standalone after a one-time model download.

## First-Run Note (IMPORTANT)
On first launch, the app downloads a ~1.1 GB on-device language model over Wi-Fi before any chat
functionality is available. This is a one-time download; please allow it to complete on a Wi-Fi
connection before evaluating core features. No login or test account is required — the app has no
accounts of any kind.

## How to Test Key Features
1. Companion chat: open the app, allow the model download, then start a conversation.
2. Crisis safety layer: runs independently on-device; see `SAFETY.md` in the source repo.
3. Skills library / journaling / check-ins: accessible from the main navigation, no setup required.

## Notes
- No data ever leaves the device (no analytics, no crash reporting, no backend).
- Source is public and Apache-2.0 licensed: https://github.com/sampathmannam/nilamind
