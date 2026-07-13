#!/usr/bin/env bash
# check-store-permissions.test.sh — fixture tests for check-store-permissions.sh.
# Run: bash scripts/check-store-permissions.test.sh
set -uo pipefail
cd "$(dirname "$0")/.."

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
fail=0

# Fixture 1: clean manifest (no active forbidden permissions) — must exit 0.
cat > "$tmpdir/clean.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <!-- <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" /> -->
</manifest>
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/clean.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "PASS: clean manifest exits 0"
else
  echo "FAIL: clean manifest should exit 0"; cat /tmp/check-store-permissions-test-out.txt; fail=1
fi

# Fixture 2: dirty manifest (active PACKAGE_USAGE_STATS) — must exit non-zero.
cat > "$tmpdir/dirty-usage.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
</manifest>
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/dirty-usage.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: dirty manifest (PACKAGE_USAGE_STATS active) should exit non-zero"; fail=1
else
  echo "PASS: PACKAGE_USAGE_STATS manifest correctly rejected"
fi

# Fixture 3: dirty manifest (active ACCESS_FINE_LOCATION) — must exit non-zero.
cat > "$tmpdir/dirty-location.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
</manifest>
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/dirty-location.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: dirty manifest (ACCESS_FINE_LOCATION active) should exit non-zero"; fail=1
else
  echo "PASS: ACCESS_FINE_LOCATION manifest correctly rejected"
fi

# Fixture 4: missing file — must exit non-zero, not crash.
if bash scripts/check-store-permissions.sh "$tmpdir/does-not-exist.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: missing manifest should exit non-zero"; fail=1
else
  echo "PASS: missing manifest correctly rejected"
fi

# Fixture 5: dirty manifest (active ACCESS_COARSE_LOCATION, single-quoted attribute) — must exit non-zero.
cat > "$tmpdir/dirty-coarse-single-quote.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name='android.permission.ACCESS_COARSE_LOCATION' />
</manifest>
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/dirty-coarse-single-quote.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: dirty manifest (ACCESS_COARSE_LOCATION, single-quoted) should exit non-zero"; fail=1
else
  echo "PASS: ACCESS_COARSE_LOCATION (single-quoted) manifest correctly rejected"
fi

# Fixture 6: dirty manifest (active PACKAGE_USAGE_STATS, tag split across multiple lines) — must exit non-zero.
cat > "$tmpdir/dirty-usage-multiline.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission
        android:name="android.permission.PACKAGE_USAGE_STATS"
        tools:ignore="ProtectedPermissions" />
</manifest>
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/dirty-usage-multiline.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: dirty manifest (PACKAGE_USAGE_STATS, multi-line tag) should exit non-zero"; fail=1
else
  echo "PASS: PACKAGE_USAGE_STATS (multi-line tag) manifest correctly rejected"
fi

# Fixture 7: active ACCESS_COARSE_LOCATION sandwiched between two single-line comments — must exit
# non-zero. Regression for the BSD-sed range-delete bug: `sed '/<!--/,/-->/d'` does not close a
# range on a line that both opens and closes a comment, so it stays "in range" past that line and
# keeps deleting forward until a LATER `-->` — silently swallowing an active forbidden permission
# sitting between two complete single-line comments.
cat > "$tmpdir/dirty-between-comments.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- <uses-permission android:name="android.permission.SOME_BENIGN" /> -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <!-- <uses-permission android:name="android.permission.SOME_OTHER_BENIGN" /> -->
</manifest>
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/dirty-between-comments.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: dirty manifest (ACCESS_COARSE_LOCATION between two single-line comments) should exit non-zero"; fail=1
else
  echo "PASS: ACCESS_COARSE_LOCATION (between two single-line comments) manifest correctly rejected"
fi

# Fixture 8: unclosed HTML comment followed by active forbidden permission — must exit non-zero.
# Regression: an unclosed `<!--` (no matching `-->` anywhere in the file) should NOT be stripped,
# so the forbidden permission text after it is still correctly detected and the script exits non-zero.
cat > "$tmpdir/unclosed-comment.xml" <<'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!--
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
EOF
if bash scripts/check-store-permissions.sh "$tmpdir/unclosed-comment.xml" >/tmp/check-store-permissions-test-out.txt 2>&1; then
  echo "FAIL: unclosed comment with forbidden permission should exit non-zero"; fail=1
else
  echo "PASS: unclosed comment with forbidden permission correctly rejected"
fi

exit "$fail"
