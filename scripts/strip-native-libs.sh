#!/usr/bin/env bash
# Strip the prebuilt llama.cpp native lib. llama-cpp-capacitor ships libllama-cpp-arm64.so UNstripped
# (~63 MB, "with debug_info"). Stripping -> ~6 MB. Because modern AGP stores .so UNCOMPRESSED and
# page-aligned in the APK (extractNativeLibs=false, for mmap), that ~57 MB is a DIRECT APK/download saving
# with zero functional impact (--strip-all keeps the dynamic symbol table; only debug info + the static
# symbol table are removed).
#
# Runs as a postinstall hook, because `npm install` restores the unstripped lib from the package tarball.
# Idempotent: re-stripping an already-stripped .so is a no-op. Never fails the install — if the NDK/llvm-strip
# isn't present it just warns and skips (the build still works, only larger). See DISTRIBUTION.md §D.
set -euo pipefail

LIB="node_modules/llama-cpp-capacitor/android/src/main/jniLibs/arm64-v8a/libllama-cpp-arm64.so"
if [ ! -f "$LIB" ]; then
  echo "strip-native: $LIB not found — skipping (plugin not installed yet?)."
  exit 0
fi

# Already stripped? (idempotent — avoids a needless plugin-rebuild on repeat installs)
if file "$LIB" 2>/dev/null | grep -q ", stripped"; then
  echo "strip-native: already stripped ($(du -h "$LIB" | cut -f1)) — nothing to do."
  exit 0
fi

# Locate llvm-strip from the Android NDK (system `strip` on macOS is Mach-O only, can't strip an ELF .so).
NDK_BASE="${ANDROID_NDK_HOME:-${ANDROID_HOME:-$HOME/Library/Android/sdk}/ndk}"
STRIP="$(find "$NDK_BASE" -name llvm-strip -type f 2>/dev/null | sort | tail -1)"
if [ -z "${STRIP:-}" ]; then
  echo "strip-native: llvm-strip not found under $NDK_BASE — install the Android NDK to shrink the APK. Skipping."
  exit 0
fi

before="$(du -h "$LIB" | cut -f1)"
"$STRIP" --strip-all "$LIB"
echo "strip-native: libllama-cpp-arm64.so  $before -> $(du -h "$LIB" | cut -f1)  (stripped)"

# Force the plugin to re-merge the stripped lib on the next gradle build.
rm -rf node_modules/llama-cpp-capacitor/android/build 2>/dev/null || true
