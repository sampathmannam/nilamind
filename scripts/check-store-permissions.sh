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

# Strip XML comments (including ones that span multiple lines), then collapse newlines so a
# `<uses-permission ... />` tag split across multiple lines still matches as one unit under grep.
#
# NOTE: this used to be `sed '/<!--/,/-->/d'`. On BSD sed (macOS default /usr/bin/sed) a range
# address does not close on a line that both opens and closes the range — a line containing both
# `<!--` and `-->` stays "in range" and the delete keeps running forward until a LATER `-->`,
# silently deleting unrelated legitimate content between comments (verified: it ate 5 real
# `<uses-permission>` tags from this repo's manifest, and separately swallowed an actively
# declared forbidden permission sandwiched between two single-line comments). Perl's slurp mode
# strips each `<!--...-->` pair independently via non-greedy matching, with no such range-closing
# ambiguity.
flattened=$(perl -0777 -pe 's/<!--.*?-->//gs' "$MANIFEST" | tr '\n' ' ')

fail=0
for perm in "${FORBIDDEN[@]}"; do
  # Escape literal dots in the permission string so they match literally, not as regex wildcards.
  escaped_perm=$(printf '%s' "$perm" | sed 's/\./\\./g')
  # Accept either double- or single-quoted android:name attribute values.
  if printf '%s' "$flattened" | grep -Eq "uses-permission[^>]*(\"$escaped_perm\"|'$escaped_perm')"; then
    echo "check-store-permissions: FORBIDDEN permission declared for store build: $perm" >&2
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "check-store-permissions: OK — no forbidden Play Store permissions in $MANIFEST"
fi
exit "$fail"
