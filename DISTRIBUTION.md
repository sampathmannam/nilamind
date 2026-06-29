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

## Notes
- `versionCode`/`versionName`: `android/app/build.gradle`.
- Never commit: `*.keystore`, `*.jks`, `key.properties`, `.env*` (all gitignored).
- Nila (the AI companion) runs entirely on-device from a local GGUF model — there is no backend, no
  API key, and no network call to generate replies.
