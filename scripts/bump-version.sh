#!/usr/bin/env bash
# bump-version.sh — the single source of truth for NilaMind version bumps.
# Keeps package.json, Android versionName/versionCode, and iOS MARKETING_VERSION/CURRENT_PROJECT_VERSION
# in lockstep so the git tag, store version, and CHANGELOG always agree (see CHANGELOG.md reconciliation).
#
# Usage:
#   bash scripts/bump-version.sh <version> <versionCode> [<tag-msg>]
#     e.g. bash scripts/bump-version.sh 1.25.1 88 "Today widgets + design system"
# After running, the script prints a CHANGELOG.md checklist. Then tag with v<version>, push, release.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:?usage: bump-version.sh <version> <versionCode> [tag-msg]}"
CODE="${2:?usage: bump-version.sh <version> <versionCode> [tag-msg]}"
TAG_MSG="${3:-}"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "✗ version must be X.Y.Z, got: $VERSION" >&2; exit 1
fi
if ! [[ "$CODE" =~ ^[0-9]+$ ]]; then
  echo "✗ versionCode must be an integer, got: $CODE" >&2; exit 1
fi

# package.json
sed -i '' -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"$VERSION\"/" package.json

# Android
sed -i '' -E "s/versionCode [0-9]+/versionCode $CODE/" android/app/build.gradle
sed -i '' -E "s/versionName \"[0-9]+\.[0-9]+\.[0-9]+\"/versionName \"$VERSION\"/" android/app/build.gradle

# iOS (Debug + Release)
sed -i '' -E "s/MARKETING_VERSION = [0-9]+\.[0-9]+\.[0-9]+;/MARKETING_VERSION = $VERSION;/" ios/App/App.xcodeproj/project.pbxproj
sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = $CODE;/" ios/App/App.xcodeproj/project.pbxproj

echo "✓ bumped to $VERSION (versionCode $CODE) across package.json / Android / iOS"
echo ""
echo "Next steps (discipline):"
echo "  1. Add a [${VERSION}] entry to CHANGELOG.md (Keep a Changelog) + move [Unreleased] under it."
echo "  2. npm run guard  → must be green."
echo "  3. git add -A && git commit -m \"chore: bump to v${VERSION} (versionCode ${CODE})\""
echo "  4. git tag v${VERSION}${TAG_MSG:+ -m \"$TAG_MSG\"} && git push origin v${VERSION}"
echo "  5. gh release create v${VERSION} --target <branch> --title \"v${VERSION} — ${TAG_MSG:-<summary>}\" --notes-file <notes>"
