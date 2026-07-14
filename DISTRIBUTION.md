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

**Verify before building the AAB** — this is enforced, not just documented:
```bash
npm run check:store-permissions
```
Exits non-zero and names the offending permission if any of the three above are still active in the
manifest. Run this right before step 2 (building the signed AAB); it's the guard against shipping a
store build with sensitive permissions still declared.

### 2. Build a signed AAB
With `android/key.properties` configured (see A):
```bash
cd android && ./gradlew bundleRelease --no-daemon
# → android/app/build/outputs/bundle/release/app-release.aab
```
Play App Signing will re-sign on upload; your `upload-keystore.jks` is the *upload* key — keep it.

### 3. Play Console
- Create the app → **Internal testing** track first → upload the AAB → add testers → roll out.
- Paste the reviewer notes from `REVIEWER_NOTES.md` into the review-notes field, then submit for
  review; iterate on any policy feedback.
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

## C. F-Droid ecosystem — Obtainium (recommended) + IzzyOnDroid (ready to submit)

> **Two FOSS channels, both fed by your existing GitHub Releases and the same signing key**, so a user
> can move between them without reinstalling. **[Obtainium](https://obtainium.imranr.dev)** is the
> recommended route — it's live **today**, needs nothing to host or maintain, and auto-updates users
> straight from your Releases. **IzzyOnDroid** is a second, F-Droid-ecosystem channel that is
> **ready to submit** (see [`docs/IZZYONDROID_SUBMISSION.md`](docs/IZZYONDROID_SUBMISSION.md) for the
> audited checklist and the copy-paste request). An earlier note here claimed a **~30 MB IzzyOnDroid
> size cap** blocked NilaMind (~75 MB) — that was unfounded: IzzyOnDroid routinely hosts apps far larger
> than that and does not enforce a 30 MB limit. The one repo that genuinely can't take NilaMind is
> **mainline f-droid.org**, which builds from source and rejects the prebuilt `llama.cpp` `.so` (§D).

### Obtainium (do this)
NilaMind is Obtainium-ready **today** — you already publish signed APKs to GitHub Releases.
1. Users install **Obtainium** (from its [GitHub releases](https://github.com/ImranR98/Obtainium) or F-Droid).
2. They tap the **Add to Obtainium** button on the [landing page](https://sampathmannam.github.io/nilamind/)
   or README — deep link `https://apps.obtainium.imranr.dev/redirect?r=obtainium://add/https://github.com/sampathmannam/nilamind` —
   or, in Obtainium, *Add App* → paste `https://github.com/sampathmannam/nilamind`.
3. Obtainium tracks your Releases and installs/updates NilaMind automatically. On your side there's
   nothing to submit or maintain beyond cutting each release (§A "signed release" + `gh release`).

FOSS credentials (relevant if you ever pursue a store that verifies them): Apache-2.0, no Google
Services, no analytics, and — after removing `@capgo/capacitor-llm` — **zero proprietary
dependencies** (the MediaPipe `tasks-genai` + `executorch` native libs are gone). The on-device model
is now Qwen2.5-1.5B-Instruct, fetched at runtime under the **Apache-2.0 license** — no `NonFreeNet`
anti-feature applies (the earlier Gemma-based default did require that disclosure; it no longer ships).

---

### IzzyOnDroid (F-Droid ecosystem — ready to submit)

An F-Droid-format repository, installable from inside the F-Droid client, that accepts your **own
signed APK** (no rebuild-from-source) and merely *flags* prebuilt/native bits as disclosed
anti-features. It's a fine home for NilaMind — the readiness audit is green (see
[`docs/IZZYONDROID_SUBMISSION.md`](docs/IZZYONDROID_SUBMISSION.md)); you just open the inclusion
request. Mainline f-droid.org is a separate, stricter matter — it builds from source and rejects the
prebuilt `libllama-cpp-arm64.so` (the native llama.cpp inference engine).

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

4. **No `NonFreeNet` flag needed** for the model itself — the ~1.1 GB Qwen2.5-1.5B-Instruct model
   downloaded on first run is Apache-2.0 licensed, same as the app. (No `NonFreeDep` either: the app
   has no proprietary dependencies — the Google MLKit/Nano path was removed.)

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
- ✅ **The model** is now a free (Apache-2.0) runtime download (Qwen2.5-1.5B-Instruct) — no longer a
  mainline-F-Droid blocker. (Done 2026-07-11, the Qwen speed swap.)

None of these block IzzyOnDroid — they're only relevant if you later pursue the main F-Droid repo.

> ABI note: the build packages **arm64-v8a only** (`abiFilters` in `build.gradle`) — fine for almost
> all modern phones; IzzyOnDroid handles per-ABI APKs.

---

## D. APK size trim (reproducible) — 174 MB → 77 MB

The release APK was cut from **174 MB to 77 MB** by removing pure waste (no features changed). These
are all in the repo now; a normal `npm ci && npm run build && npx cap sync android && ./gradlew
assembleRelease` reproduces the 77 MB APK, **as long as the native strip runs** (below).

1. **Native lib strip (biggest win, ~57 MB).** `llama-cpp-capacitor` ships `libllama-cpp-arm64.so`
   *unstripped* (63 MB, "with debug_info"). `scripts/strip-native-libs.sh` runs `llvm-strip
   --strip-all` → **6.3 MB** (keeps the dynamic symbol table; AGP stores `.so` uncompressed, so it's
   a direct APK saving). It is wired as a **`postinstall`** hook (idempotent; skips gracefully if the
   Android NDK isn't found) because `npm install` restores the unstripped lib from the package tarball.
   If you ever build without `npm install` having run the hook, run `npm run strip-native` first.
2. **ONNX Runtime wasm (~73 MB).** The crisis classifier only loads
   `public/ort/ort-wasm-simd-threaded.asyncify.wasm`; the other three variants (jsep/jspi/plain) were
   removed, and a vite `generateBundle` plugin (`dropRedundantOrtWasm` in `vite.config.ts`) drops the
   duplicate copy `@huggingface/transformers` emits into `dist/assets`.
3. **Dead `@capgo/capacitor-llm` (MediaPipe `.task` path).** Removed — it pulled
   `com.google.mediapipe:tasks-genai` + `org.pytorch:executorch-android` native libs for a code path
   the 4B-only catalog never uses.

**Not trimmed (deliberate):** the `vosk` wake-word model (~41 MB, powers "Hey Nila") and the crisis
classifier's MiniLM `.onnx` + asyncify `.wasm` (~44 MB, the §9 safety runtime). Dropping vosk (make
the wake word an optional on-demand download) is the next ~41 MB if wanted — it's a feature call, not
waste. **Always re-run the §9 device check after touching the ORT wasm** (it's the classifier's runtime).

---

## Notes
- `versionCode`/`versionName`: `android/app/build.gradle`.
- Never commit: `*.keystore`, `*.jks`, `key.properties`, `.env*` (all gitignored).
- Nila (the AI companion) runs entirely on-device from a local GGUF model — there is no backend, no
  API key, and no network call to generate replies.
