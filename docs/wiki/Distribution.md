# Distribution

NilaMind is **Apache-2.0** with **zero proprietary dependencies** and no Google Services or analytics — so it's genuinely FOSS. There are three ways it reaches phones.

## 1. GitHub Releases (available now)

Signed APKs are published on the [Releases page](https://github.com/sampathmannam/nilamind/releases). Anyone can download and sideload. This is also the source feed for IzzyOnDroid.

## 2. IzzyOnDroid (the F-Droid-ecosystem route)

**IzzyOnDroid** is an F-Droid-format repository, installable inside the F-Droid client, that accepts a developer's **own signed APK** (it doesn't rebuild from source), tolerates prebuilt native libraries, and discloses anything non-free as an "anti-feature." It's the standard home for FOSS apps that can't meet mainline F-Droid's build-from-source rule, and it's fed from GitHub Releases.

Expected anti-feature flag: **`NonFreeNet`** — on first run the app downloads the ~2.5 GB language model (Gemma license) from Hugging Face, then runs fully offline.

To install once listed: add `https://apt.izzysoft.de/fdroid/repo` in the F-Droid client and search for NilaMind.

## 3. Why *not* the main f-droid.org repo

The main F-Droid repo builds every app from source on its own servers and bans prebuilt binaries. NilaMind trips that rule:

- `llama-cpp-capacitor` ships a **prebuilt `libllama-cpp-arm64.so`** — the inference engine itself.
- A second runtime (`@capgo/capacitor-llm`) ships prebuilt MediaPipe/ExecuTorch `.so` files.

These are FOSS-licensed but **prebuilt**, which mainline F-Droid won't accept. Getting onto f-droid.org would require building llama.cpp from source inside their pipeline — tracked as future work in the repo's [`DISTRIBUTION.md`](https://github.com/sampathmannam/nilamind/blob/main/DISTRIBUTION.md). (The app already has **no proprietary dependencies**, so that's the only remaining blocker.)

## Release process (for maintainers)

In short (full details in `DISTRIBUTION.md`):

1. Build a **signed** release APK with your own keystore (`./gradlew assembleRelease`). Use the **same keystore for every release** — IzzyOnDroid requires a stable signing key, and so does Android for updates.
2. Create a **GitHub Release** with a version tag and attach the APK.
3. For the first listing, open an inclusion request with IzzyOnDroid; afterwards new releases are detected automatically.

> Never commit `*.apk`, `*.aab`, `*.keystore`, `*.jks`, or `key.properties` — all are gitignored.

## A note on the Play Store

`DISTRIBUTION.md` also documents a locked-down Play Store build profile (`VITE_STORE_BUILD`) that compiles out policy-sensitive features and the matching permissions. NilaMind's privacy posture maps cleanly to a "no data collected" Data Safety declaration.
