#!/usr/bin/env bash
# run-android.sh — build the web app, sync Capacitor, then install + launch on a connected Android device.
# Fixes the "Unable to locate a Java Runtime" error: macOS has no system Java, but Android Studio ships a JDK
# (the JBR). This auto-points JAVA_HOME at it so ./gradlew works. Usage:  npm run android
set -uo pipefail
cd "$(dirname "$0")/.."

# 1) Find a JDK — honor an existing JAVA_HOME, else Android Studio's bundled JBR.
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME:-x}/bin/java" ]; then
  for p in "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
           "/Applications/Android Studio Preview.app/Contents/jbr/Contents/Home" \
           "$HOME/Library/Java/JavaVirtualMachines"/*/Contents/Home; do
    if [ -x "$p/bin/java" ]; then export JAVA_HOME="$p"; break; fi
  done
fi
if [ ! -x "${JAVA_HOME:-x}/bin/java" ]; then
  echo "✖ No JDK found. Install Android Studio (it bundles one) or set JAVA_HOME."; exit 1
fi
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$JAVA_HOME/bin:$PATH"
echo "▸ JAVA_HOME=$JAVA_HOME"

# 2) Require a connected device.
if ! adb devices | awk 'NR>1 && $2=="device"{f=1} END{exit !f}'; then
  echo "✖ No device connected. Plug in your phone + enable USB debugging, then re-run."; exit 1
fi

# 3) Build web → sync → install → launch.
echo "▸ Building web app…";      npm run build || exit 1
echo "▸ Syncing Capacitor…";     npx cap sync android || exit 1
echo "▸ Installing on device…";  ( cd android && ./gradlew installDebug ) || exit 1
echo "▸ Launching NilaMind…";    adb shell am start -n com.nilamind.app/.MainActivity >/dev/null
echo "✅ NilaMind installed + launched on your device."
