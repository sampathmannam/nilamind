# Getting NilaMind onto the official F-Droid catalog (f-droid.org)

> Status: **prep dossier** — audited 2026-07-14 against F-Droid's Inclusion Policy.
> Official F-Droid is a submission to external maintainers who build from source and
> sign with F-Droid's key. It cannot be self-published; this document is what you file
> and the work required first.

## TL;DR verdict

| Dimension | Verdict |
|---|---|
| **Licensing / FOSS purity** | ✅ **PASS** — app Apache-2.0, `llama.cpp` binding MIT, Qwen2.5-1.5B model Apache-2.0, Vosk STT model Apache-2.0. |
| **Anti-features** | 🟡 Minor — dangling `com.google.gms:google-services` classpath (never applied, no `google-services.json`); remove it. Runtime model download must be documented. |
| **Build-from-source** | 🔴 **BLOCKER** — the Android build currently consumes a **prebuilt** `libllama-cpp-arm64.so` from the `llama-cpp-capacitor` npm package. F-Droid forbids prebuilt native binaries; llama.cpp must compile from source (NDK/CMake) in F-Droid's build. |

**Bottom line:** the *legal* side is clean. The *build* side needs real work — compiling
llama.cpp from source inside F-Droid's build server for a Capacitor app is the hard part
and the most common reason Capacitor/RN apps stall in F-Droid review. Expect **weeks**, and
a real chance of iteration with F-Droid maintainers on the native build.

> If that native-build rework is more than you want to take on, **IzzyOnDroid** is the
> pragmatic alternative F-Droid-ecosystem route: it ships your *existing* GitHub-release
> APK (your key, consistent with Obtainium) without building from source. That was route
> #1 in the original choice — worth reconsidering if the blocker below proves too costly.

## What F-Droid signs (important consequence)

F-Droid rebuilds and signs with **its own key**, not your release key
(cert `003f02bc…c37d`). A user therefore **cannot** switch between the Obtainium/GitHub
APK and the F-Droid build without uninstalling first (signature mismatch). Plan for two
distinct install channels, or pick one as canonical.

## Pre-submission fix list

1. **Compile llama.cpp from source (the blocker).**
   - The plugin bundles the full C++ sources (`node_modules/llama-cpp-capacitor/cpp/*.cpp`)
     and an iOS `CMakeLists.txt`, but the Android artifact is a prebuilt
     `android/src/main/jniLibs/arm64-v8a/libllama-cpp-arm64.so`.
   - For F-Droid, the plugin's `android/build.gradle` needs an `externalNativeBuild`
     (CMake) that builds the `.so` from `cpp/` at app-build time, and the prebuilt
     `jniLibs/*.so` must be deleted so F-Droid's scanner sees no binary.
   - This likely means maintaining a **patched fork** of `llama-cpp-capacitor` referenced
     via the F-Droid recipe's `srclibs`/prebuild, since the upstream package ships the
     prebuilt lib.
2. **Remove the `google-services` plugin classpath** from `android/build.gradle`
   (`classpath 'com.google.gms:google-services:4.4.4'`) and the conditional apply in
   `android/app/build.gradle`. It is never applied (no `google-services.json`) and only
   trips F-Droid's scanner. Push notifications are not wired to FCM, so nothing breaks.
3. **Vosk STT model** (`vosk-model-small-en-us-0.15`, Apache-2.0) is a data blob shipped
   in web assets. Libre data is acceptable, but call it out in the recipe and confirm no
   prebuilt Vosk **native** `.so` sneaks in via the speech plugin.
4. **Runtime model download.** The Qwen2.5-1.5B GGUF is fetched from HuggingFace at first
   run (`src/services/modelCatalog.ts`). Qwen2.5 is Apache-2.0 → libre data, acceptable,
   but document it so reviewers don't read it as pulling unreviewed/non-free code.
5. Keep the **Gemma-3-1B** entry commented out (it is). Gemma's license is **not** OSI/FSF
   free — do **not** make it the default for the F-Droid build.

## Submission process (once fixes land)

1. **Request For Packaging (lightest first):** open an RFP issue at
   <https://gitlab.com/fdroid/rfp/-/issues> describing the app, license, and source URL.
2. **fdroiddata merge request:** fork <https://gitlab.com/fdroid/fdroiddata>, add
   `metadata/com.nilamind.app.yml` (draft in this repo at
   [`metadata/com.nilamind.app.yml`](../metadata/com.nilamind.app.yml)), and open an MR.
3. **Local build check** before the MR (needs the F-Droid buildserver or `fdroid build`):
   ```
   fdroid readmeta && fdroid rewritemeta com.nilamind.app
   fdroid lint com.nilamind.app
   fdroid build -v -l com.nilamind.app     # must succeed WITHOUT any prebuilt .so
   ```
4. F-Droid maintainers review, build reproducibly, and publish. Iterate on their feedback
   (native build is where it usually goes back and forth).

## Draft recipe

See [`metadata/com.nilamind.app.yml`](../metadata/com.nilamind.app.yml). It is a **best-effort
starting point** with the native-build step marked `TODO` — it will not pass `fdroid build`
until fix #1 is done. `fdroidserver` is installed locally (`~/.local/bin/fdroid`) for lint/build
iteration.

## Meanwhile

Obtainium distribution is **live** at v1.9.10 (same signing key, updates in place) and is the
recommended install path today. Official F-Droid, if pursued, is additive discovery on top —
not a replacement.
