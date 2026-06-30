# Getting Started

## What you need

- An **Android phone** running **Android 7.0 (API 24) or newer**, **arm64-v8a** (virtually all phones from the last several years).
- **~3 GB of free storage** and enough RAM to hold the model (the reference 4B model is ~2.5 GB and memory-fragile on low-RAM devices — a recent mid-range or flagship is recommended).
- **Wi-Fi** for the one-time model download on first run.

> NilaMind is an experimental self-help tool. It is **not** a medical device, therapy, or a crisis service. Please read [Crisis Safety (§9)](Crisis-Safety.md) before relying on it for anything.

## Installing

### Option 1 — Download the APK (available now)
1. Go to the [Releases page](https://github.com/sampathmannam/nilamind/releases) and download the latest `NilaMind-x.y.apk`.
2. On your phone, allow installing from your browser/file manager (Settings → Apps → Special access → *Install unknown apps*).
3. Open the APK and install. Android/Play Protect may warn about a sideloaded app — that's expected for a self-signed build.

### Option 2 — IzzyOnDroid (F-Droid ecosystem)
NilaMind targets **IzzyOnDroid**, an F-Droid-format repository you can add inside the F-Droid client. Once it's listed:
1. Install the F-Droid client.
2. Add the repo `https://apt.izzysoft.de/fdroid/repo`.
3. Search for **NilaMind** and install — and get updates automatically.

(The main `f-droid.org` repo can't build NilaMind from source because of a prebuilt inference binary — see [Distribution](Distribution.md) for why.)

### Option 3 — Build it yourself
See [Building from Source](Building-from-Source.md).

## First run

1. **Identity.** NilaMind creates a local, on-device identity (a BIP39 recovery phrase) — there's no sign-up and no email. Keep your phrase if you want to be able to restore.
2. **Download Nila's brain.** On first launch the app offers to download its on-device language model (~2.5 GB). It confirms before starting (use Wi-Fi), streams it to disk, **verifies its integrity**, and only then activates it. After that, the app works fully offline. See [Model Provisioning](Model-Provisioning.md).
3. **Say hello.** Open the chat and talk to Nila by voice or text.

> If you're a developer, you can skip the in-app download and side-load a GGUF directly — see [Model Provisioning](Model-Provisioning.md) → *Side-loading*.

## If something's wrong

- **"Set up Nila" keeps appearing / the brain won't load** — the model file is missing or incomplete. The app deletes a corrupt/partial file automatically and re-offers a clean download; re-download over Wi-Fi.
- **First reply is very slow** — that's expected. The first message pays a one-time "prefill" cost for the large system prompt; later replies in the same session are much faster. See [The On-Device Brain](The-On-Device-Brain.md) → *Performance*.
- **You're in crisis** — NilaMind is not a reliable way to reach help. Contact your local emergency number and a person you trust. Helpline pointers are in [Crisis Safety (§9)](Crisis-Safety.md).
