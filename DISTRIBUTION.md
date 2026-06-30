# Distribution — NilaMind

Two ways to ship: **sideload** (test on your own phone now) and **Play Store** (later, locked-down
build).

> **You** provide the keystore and the Play account. Nothing in this repo is signed with a real
> release key, and keystores / `key.properties` are gitignored and must **never** be committed.

---

## A. Sideload onto your phone (testing)

The debug APK is already enough for testing (it is debug-signed; Play Protect will warn — that's
expected for a self-signed build).

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
npx vite build && npx cap sync android
cd android && ./gradlew assembleDebug --no-daemon
# → android/app/build/outputs/apk/debug/app-debug.apk
```

On the phone:
1. Settings → Apps → special access → **Install unknown apps** → allow your file manager/browser.
2. Open the APK → **Install**.
3. If Play Protect warns, choose **Install anyway** (expected for a self-signed dev build).
4. Optional: share the APK via a direct link / QR for other testers.

> The on-device language model (a GGUF file) is **not** bundled. Side-load your own model onto the
> device so Nila can run locally — see the README's "Bring your own model".

### A signed *release* APK for testers (optional, recommended)
1. Create an upload/release keystore (once — keep it safe and backed up):
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias upload
   ```
2. Create `android/key.properties` (gitignored):
   ```properties
   storeFile=/absolute/path/to/upload-keystore.jks
   storePassword=********
   keyAlias=upload
   keyPassword=********
   ```
3. Build:
   ```bash
   npx vite build && npx cap sync android
   cd android && ./gradlew assembleRelease --no-daemon
   # → android/app/build/outputs/apk/release/app-release.apk  (signed when key.properties is present)
   ```
   Without `key.properties`, the release task still builds but is **unsigned** (sideload-test only).

---

## B. Play Store release (locked-down build)

### 1. Build the store variant with deep features OFF
The `VITE_STORE_BUILD` flag disables Play-policy-sensitive features: **Phone Patterns / usage-access**
and **location-derived "left home"**. (No phone automation ships; the deeper automation was always
sideload-only.)

```bash
npx vite build --mode store && npx cap sync android
```
(`--mode store` loads the committed `.env.store`, which sets `VITE_STORE_BUILD=1`. The gated code is
compiled OUT of the bundle entirely, not just hidden — verified by its absence from `dist/`.)

**Also remove the matching permissions** from `android/app/src/main/AndroidManifest.xml` for the
store AAB (the flag hides the features; the store listing should not *declare* unused sensitive
permissions):
- `android.permission.PACKAGE_USAGE_STATS`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`

Keep only what the app uses: `POST_NOTIFICATIONS` (reminders), `RECORD_AUDIO` (voice input). Nila
runs on-device, so the AI needs no network.

### 2. Build a signed AAB
With `android/key.properties` configured (see A):
```bash
cd android && ./gradlew bundleRelease --no-daemon
# → android/app/build/outputs/bundle/release/app-release.aab
```
Play App Signing will re-sign on upload; your `upload-keystore.jks` is the *upload* key — keep it.

### 3. Play Console
- Create the app → **Internal testing** track first → upload the AAB → add testers → roll out.
- Submit for review; iterate on any policy feedback.
- Bump `versionCode` (and `versionName`) in `android/app/build.gradle` for every upload.

### 4. Required policies & forms
- **Privacy policy URL** — host `PRIVACY_POLICY.md` (e.g., on a landing site) and link it.
- **Data Safety form** — see `PRIVACY_POLICY.md`: the app stores everything on-device (encrypted) and
  collects nothing. Nila runs on-device too, so no conversation data leaves the phone — declare "no
  data collected."
- **Health content** — complete the health-apps declaration; state clearly it is a self-help support
  tool, **not** a medical device and not a diagnostic tool.
- **Content rating** — complete the questionnaire (mental-health self-help; includes crisis
  resources).

---

## C. F-Droid ecosystem — via IzzyOnDroid (recommended FOSS route)

NilaMind is genuinely FOSS (Apache-2.0, no Google Services, no analytics), but the **main F-Droid
repo (f-droid.org) will not accept it as-built**. F-Droid builds every app from source on its own
servers and bans proprietary deps and prebuilt binaries. NilaMind has **zero proprietary
dependencies** (see "Toward mainline" below — the Google Nano/MLKit path was removed), but it still
trips F-Droid's prebuilt-binary rule:

1. **Prebuilt llama.cpp engine** — `llama-cpp-capacitor` ships `libllama-cpp-arm64.so` (the 4B's
   inference engine). F-Droid's scanner rejects prebuilt native binaries.
2. **More prebuilt blobs** — `libexecutorch.so`, `libllm_inference_engine_jni.so` (`@capgo`, FOSS
   but prebuilt; now dead code since the catalog is 4B-only).

(Plus the on-device model is downloaded at runtime under the **non-free Gemma license** → a
"NonFreeNet" anti-feature.)

**IzzyOnDroid (IoD)** is an F-Droid-format repository, installable from inside the F-Droid client,
that accepts your **own signed APK** (it does not rebuild from source), tolerates prebuilt native
libs, and simply *flags* the proprietary bits as disclosed anti-features. It is the standard home
for FOSS apps that can't meet mainline F-Droid's build-from-source rule. It is fed from your GitHub
Releases.

### Prereqs (already done in this repo)
- ✅ FOSS license (`LICENSE`, Apache-2.0) and public source on GitHub.
- ✅ Store metadata at `fastlane/metadata/android/en-US/` (title, short/full description, changelog,
  icon, screenshot) — IzzyOnDroid reads this automatically.

### Steps you run
1. **Build a *signed* release APK** (same keystore + `key.properties` as section A — and use the
   **same keystore for every future release**; IzzyOnDroid requires a stable signing key):
   ```bash
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   npx vite build && npx cap sync android
   cd android && ./gradlew assembleRelease --no-daemon
   # → android/app/build/outputs/apk/release/app-release.apk  (signed)
   ```
   Verify it's signed: `apksigner verify --print-certs app-release.apk`.

2. **Create a GitHub Release** on `github.com/sampathmannam/nilamind`:
   - Tag it `v1.0` (match `versionName` in `android/app/build.gradle`).
   - Attach `app-release.apk` as a release asset.
   - The `fastlane/.../changelogs/1.txt` file corresponds to `versionCode 1`.

3. **Request inclusion in IzzyOnDroid.** Open an inclusion request on their tracker
   (currently `codeberg.org/IzzyOnDroid/repo-data` → Issues; confirm the current link and checklist
   at <https://apt.izzysoft.de/fdroid/>). Give the repo URL `https://github.com/sampathmannam/nilamind`.
   Their bot then auto-detects each new GitHub Release going forward.

4. **Expect this anti-feature flag** on the listing (honest, disclosed in the description):
   `NonFreeNet`/`NonFreeAssets` — the ~2.5 GB Gemma-licensed model downloaded on first run. (No
   `NonFreeDep`: the app has no proprietary dependencies — the Google MLKit/Nano path was removed.)

Once accepted, users install NilaMind by adding the IzzyOnDroid repo
(`https://apt.izzysoft.de/fdroid/repo`) in the F-Droid client, then searching for NilaMind.

### Per-release maintenance
Bump `versionCode` **and** `versionName` in `android/app/build.gradle`, add
`fastlane/.../changelogs/<versionCode>.txt`, rebuild → tag → GitHub Release with the new APK.
IzzyOnDroid picks it up automatically. Always sign with the **same** keystore.

### Toward mainline f-droid.org (status)
- ✅ **Proprietary deps removed** — `@capacitor/local-llm` (Google MLKit / Gemini Nano) is gone, so
  the app now has **zero proprietary dependencies**; `minSdk` reverted 28 → 24. (Done 2026-06-30.)
- ⬜ **Build llama.cpp from source** — `llama-cpp-capacitor` still ships a prebuilt
  `libllama-cpp-arm64.so`; mainline F-Droid would require compiling it from source in the build
  (a fork / NDK build of the plugin). This is the main remaining blocker.
- ⬜ **Drop the dead MediaPipe path** — `@capgo/capacitor-llm` is now unused (catalog is 4B-only);
  removing it deletes two more prebuilt `.so` files and shrinks the APK.
- ◻️ **The model** stays a non-free (`NonFreeNet`) runtime download under the Gemma license.

None of these block IzzyOnDroid — they're only relevant if you later pursue the main F-Droid repo.

> ABI note: the build packages **arm64-v8a only** (`abiFilters` in `build.gradle`) — fine for almost
> all modern phones; IzzyOnDroid handles per-ABI APKs.

---

## Notes
- `versionCode`/`versionName`: `android/app/build.gradle`.
- Never commit: `*.keystore`, `*.jks`, `key.properties`, `.env*` (all gitignored).
- Nila (the AI companion) runs entirely on-device from a local GGUF model — there is no backend, no
  API key, and no network call to generate replies.
