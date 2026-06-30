# Building from Source

## Prerequisites

- **Node.js 18+**
- For the Android app: **Android Studio** (which bundles a JDK 21) + the Android SDK and NDK.
- A device or emulator (**arm64-v8a**, **API 24+**).

```bash
git clone https://github.com/sampathmannam/nilamind.git
cd nilamind
npm install
```

## Web preview (UI + logic)

```bash
npm run dev
```

On-device LLM features are limited in the browser; for full Nila replies on desktop, wire Ollama (see [Model Provisioning](Model-Provisioning.md) → *Desktop development*).

## Android build

NilaMind builds with **Android Studio's bundled JDK 21** (no system Java required). Set `JAVA_HOME` to it:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # macOS
export ANDROID_HOME="$HOME/Library/Android/sdk"

npm run build           # vite production build
npx cap sync android    # copy web assets + plugins into the Android project

cd android
./gradlew assembleDebug --no-daemon
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Then [side-load a model](Model-Provisioning.md) (or use the in-app download) so the brain can load.

**Build facts:**
- `minSdkVersion = 24`, `compileSdk = targetSdk = 36`.
- ABI is **arm64-v8a only** (`abiFilters` in `android/app/build.gradle`) — fine for virtually all modern phones.
- The native inference engine ships as a prebuilt library inside `llama-cpp-capacitor` (this is why the app can't go on the *main* f-droid.org repo — see [Distribution](Distribution.md)).

## Tests & checks

```bash
npm run lint     # tsc --noEmit (type-check)
npm test         # Vitest — the full unit suite
```

The suite includes regression tests for the safety layer and the model-download integrity logic. **Keep it green**, and never weaken a §9 test.

## Build profiles

- `VITE_STORE_BUILD=1` (or `npx vite build --mode store`) compiles out Play-policy-sensitive features (usage-access patterns, location-derived signals) for a locked-down store build. The default build includes the full feature set.

## Release builds

For signed release APKs (and the F-Droid-ecosystem flow), see [Distribution](Distribution.md) and the repo's [`DISTRIBUTION.md`](https://github.com/sampathmannam/nilamind/blob/main/DISTRIBUTION.md). Keystores and `key.properties` are gitignored and must **never** be committed.
