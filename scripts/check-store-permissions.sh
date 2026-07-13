#!/usr/bin/env bash
# check-store-permissions.sh — fails if AndroidManifest.xml actively declares a permission that
# must never ship in the Play Store build (see DISTRIBUTION.md "Build the store variant with deep
# features OFF"). A commented-out `<!-- ... -->` declaration does not count as active.
#
# Usage: bash scripts/check-store-permissions.sh [path/to/AndroidManifest.xml]
# Exit 0 = clean. Exit 1 = at least one forbidden permission is active (named on stderr).
set -uo pipefail
cd "$(dirname "$0")/.."

MANIFEST="${1:-android/app/src/main/AndroidManifest.xml}"
FORBIDDEN=(
  "android.permission.PACKAGE_USAGE_STATS"
  "android.permission.ACCESS_FINE_LOCATION"
  "android.permission.ACCESS_COARSE_LOCATION"
)

if [ ! -f "$MANIFEST" ]; then
  echo "check-store-permissions: manifest not found at $MANIFEST" >&2
  exit 1
fi

fail=0
for perm in "${FORBIDDEN[@]}"; do
  # Drop single-line-commented lines (this manifest's convention — see AndroidManifest.xml's
  # commented-out PACKAGE_USAGE_STATS line) before checking for an active uses-permission tag.
  if grep -v '^\s*<!--' "$MANIFEST" | grep -q "uses-permission[^>]*\"$perm\""; then
    echo "check-store-permissions: FORBIDDEN permission declared for store build: $perm" >&2
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "check-store-permissions: OK — no forbidden Play Store permissions in $MANIFEST"
fi
exit "$fail"
