# App Store Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the concrete, code-fixable findings from the 2026-07-13 app-store-audit-skill pre-submission audit of NilaMind: a stale store-listing claim about the shipped on-device model, and a manual (unenforced) permission-stripping step in the Play Store release process.

**Architecture:** No runtime code changes. This is a documentation-accuracy fix (store listing + distribution docs) plus one new shell-script guard wired into the existing store-build process documented in `DISTRIBUTION.md`.

**Tech Stack:** Plain text/Markdown edits; one new Bash script following the existing `scripts/*.sh` convention (see `scripts/guard.sh` for style).

## Global Constraints

- Every factual claim about the shipped model (size, filename, license) must be traceable to `src/services/modelCatalog.ts` or the model's Hugging Face license field — never invented. Verified for this plan: primary model is `Qwen/Qwen2.5-1.5B-Instruct-GGUF`, `sizeBytes: 1117320736` (≈1.1 GB), license `apache-2.0` (confirmed via the model's HF page).
- Out of scope for this plan: hosting the Privacy Policy on a dedicated page (audit Warning 1). That requires publishing to the public `gh-pages` branch, which needs separate explicit user confirmation before deploying — do not touch the `gh-pages` branch as part of this plan.
- Out of scope: the `docs/wiki/Building-from-Source.md` and `docs/wiki/Distribution.md` wiki pages were not identified as containing the stale claim during the audit (they describe the `VITE_STORE_BUILD` mechanism generically, not the specific model/size/license) — leave them untouched unless a task below says otherwise.
- Don't touch `src/services/allianceSignal.ts` / `allianceSignal.test.ts` or anything else outside the files named in this plan — those are unrelated in-progress work on a different branch and are not present in this worktree (it branched fresh from `origin/main`).

---

### Task 1: Fix the stale model claim in the Play Store description

**Files:**
- Modify: `fastlane/metadata/android/en-US/full_description.txt:17`

**Interfaces:** None (plain text file, no code).

- [ ] **Step 1: Confirm the current wrong text**

Run: `grep -n "2.5 GB\|Gemma" fastlane/metadata/android/en-US/full_description.txt`

Expected output (the bug):
```
17:On first launch the app downloads its on-device language model (about 2.5 GB) over Wi-Fi. That model is provided under Google's Gemma license (which is not a free/open-source license) and is fetched from Hugging Face. After the one-time download, the app works fully offline.
```

- [ ] **Step 2: Fix the line**

In `fastlane/metadata/android/en-US/full_description.txt`, replace line 17:

Old:
```
On first launch the app downloads its on-device language model (about 2.5 GB) over Wi-Fi. That model is provided under Google's Gemma license (which is not a free/open-source license) and is fetched from Hugging Face. After the one-time download, the app works fully offline.
```

New:
```
On first launch the app downloads its on-device language model (about 1.1 GB) over Wi-Fi. That model (Qwen2.5-1.5B-Instruct) is fetched from Hugging Face under the Apache-2.0 license. After the one-time download, the app works fully offline.
```

- [ ] **Step 3: Verify the fix**

Run: `grep -c "2.5 GB\|Gemma" fastlane/metadata/android/en-US/full_description.txt`
Expected: `0`

Run: `grep -c "Qwen2.5-1.5B-Instruct" fastlane/metadata/android/en-US/full_description.txt`
Expected: `1`

- [ ] **Step 4: Commit**

```bash
git add fastlane/metadata/android/en-US/full_description.txt
git commit -m "fix(store): correct stale Gemma/2.5GB model claim in Play Store description"
```

---

### Task 2: Fix the same stale claim in DISTRIBUTION.md and README.md

**Files:**
- Modify: `DISTRIBUTION.md:121-125`, `DISTRIBUTION.md:163-165`, `DISTRIBUTION.md:183`
- Modify: `README.md:156-161`

**Interfaces:** None (plain text files, no code).

- [ ] **Step 1: Confirm the current wrong text in DISTRIBUTION.md**

Run: `grep -n "Gemma\|NonFreeNet\|2\.5 GB" DISTRIBUTION.md`

Expected output includes three blocks with stale claims around lines 124, 164, and 183 (exact line numbers may drift slightly; match by content, not line number).

- [ ] **Step 2: Fix the FOSS credentials paragraph**

In `DISTRIBUTION.md`, find this paragraph (currently around line 121):

Old:
```
FOSS credentials (relevant if you ever pursue a store that verifies them): Apache-2.0, no Google
Services, no analytics, and — after removing `@capgo/capacitor-llm` — **zero proprietary
dependencies** (the MediaPipe `tasks-genai` + `executorch` native libs are gone). The on-device model
is still fetched at runtime under the **non-free Gemma license** (a "NonFreeNet" anti-feature to
disclose anywhere that asks).
```

New:
```
FOSS credentials (relevant if you ever pursue a store that verifies them): Apache-2.0, no Google
Services, no analytics, and — after removing `@capgo/capacitor-llm` — **zero proprietary
dependencies** (the MediaPipe `tasks-genai` + `executorch` native libs are gone). The on-device model
is now Qwen2.5-1.5B-Instruct, fetched at runtime under the **Apache-2.0 license** — no `NonFreeNet`
anti-feature applies (the earlier Gemma-based default did require that disclosure; it no longer ships).
```

- [ ] **Step 3: Fix the "expect this anti-feature flag" step**

In `DISTRIBUTION.md`, find this block (currently around line 163, inside the IzzyOnDroid steps):

Old:
```
4. **Expect this anti-feature flag** on the listing (honest, disclosed in the description):
   `NonFreeNet`/`NonFreeAssets` — the ~2.5 GB Gemma-licensed model downloaded on first run. (No
   `NonFreeDep`: the app has no proprietary dependencies — the Google MLKit/Nano path was removed.)
```

New:
```
4. **No `NonFreeNet` flag needed** for the model itself — the ~1.1 GB Qwen2.5-1.5B-Instruct model
   downloaded on first run is Apache-2.0 licensed, same as the app. (No `NonFreeDep` either: the app
   has no proprietary dependencies — the Google MLKit/Nano path was removed.)
```

- [ ] **Step 4: Fix the mainline F-Droid status line**

In `DISTRIBUTION.md`, find this line (currently around line 183, in "Toward mainline f-droid.org (status)"):

Old:
```
- ◻️ **The model** stays a non-free (`NonFreeNet`) runtime download under the Gemma license.
```

New:
```
- ✅ **The model** is now a free (Apache-2.0) runtime download (Qwen2.5-1.5B-Instruct) — no longer a
  mainline-F-Droid blocker. (Done 2026-07-11, the Qwen speed swap.)
```

- [ ] **Step 5: Verify DISTRIBUTION.md**

Run: `grep -n "Gemma license\|non-free Gemma\|2\.5 GB Gemma" DISTRIBUTION.md`
Expected: no output (all three stale phrasings gone).

Run: `grep -c "Qwen2.5-1.5B-Instruct" DISTRIBUTION.md`
Expected: `2` or more.

- [ ] **Step 6: Fix the README.md "Reference model" paragraph**

In `README.md`, find this paragraph (currently around line 156):

Old:
```
**Reference model (⚠️ research preview):** the project's own therapy-tuned Gemma-3-4B is a research
preview — **not** what the app installs by default. As of a 2026-07-07 speed A/B, the default in-app
download is the **stock, un-fine-tuned Gemma-3-1B-it** (~806 MB, from
[`unsloth/gemma-3-1b-it-GGUF`](https://huggingface.co/unsloth/gemma-3-1b-it-GGUF)); the 4B is restorable
only via a one-line catalog revert or a developer side-load. The 4B is published at
[`sampathmannam/nilamind-gemma-3-4b-GGUF`](https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF).
```

New:
```
**Reference model (⚠️ research preview):** the project's own therapy-tuned Gemma-3-4B is a research
preview — **not** what the app installs by default. As of a 2026-07-11 speed swap, the default in-app
download is **Qwen2.5-1.5B-Instruct** (~1.1 GB, Apache-2.0 license, from
[`Qwen/Qwen2.5-1.5B-Instruct-GGUF`](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF)); the earlier
default, **Gemma-3-1B-it** (~806 MB), and the 4B research model are both restorable only via a one-line
catalog revert or a developer side-load. The 4B is published at
[`sampathmannam/nilamind-gemma-3-4b-GGUF`](https://huggingface.co/sampathmannam/nilamind-gemma-3-4b-GGUF).
```

Leave the rest of that paragraph (starting "Its main practical limitation is...") unchanged — it describes the 4B research model's qualitative behavior, which this plan did not re-verify.

- [ ] **Step 7: Verify README.md**

Run: `grep -n "2026-07-07 speed A/B\|stock, un-fine-tuned Gemma-3-1B-it.*default" README.md`
Expected: no output.

Run: `grep -c "Qwen2.5-1.5B-Instruct" README.md`
Expected: `1` or more.

- [ ] **Step 8: Commit**

```bash
git add DISTRIBUTION.md README.md
git commit -m "docs: correct stale Gemma/NonFreeNet claims after the Qwen2.5-1.5B model swap"
```

---

### Task 3: Add a build-time guard against sensitive permissions shipping in the store build

**Files:**
- Create: `scripts/check-store-permissions.sh`
- Create: `scripts/check-store-permissions.test.sh`
- Modify: `package.json` (add `check:store-permissions` script)
- Modify: `DISTRIBUTION.md` (wire the check into the Play Store release steps)

**Interfaces:**
- Produces: `scripts/check-store-permissions.sh [path/to/AndroidManifest.xml]` — exits `0` if none of `android.permission.PACKAGE_USAGE_STATS`, `android.permission.ACCESS_FINE_LOCATION`, `android.permission.ACCESS_COARSE_LOCATION` appear as an active (non-commented) `<uses-permission>` in the given manifest (default: `android/app/src/main/AndroidManifest.xml`); exits `1` and names the offending permission(s) otherwise.

- [ ] **Step 1: Write the failing test**

Create `scripts/check-store-permissions.test.sh`:

```bash
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

exit "$fail"
```

- [ ] **Step 2: Run the test to verify it fails (script doesn't exist yet)**

Run: `chmod +x scripts/check-store-permissions.test.sh && bash scripts/check-store-permissions.test.sh`
Expected: FAIL — `bash: scripts/check-store-permissions.sh: No such file or directory` (or similar), non-zero exit.

- [ ] **Step 3: Write the implementation**

Create `scripts/check-store-permissions.sh`:

```bash
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `chmod +x scripts/check-store-permissions.sh && bash scripts/check-store-permissions.test.sh`
Expected: all four `PASS:` lines, exit code `0`. Verify with `echo $?` immediately after.

- [ ] **Step 5: Run it against the real manifest as a sanity check**

Run: `bash scripts/check-store-permissions.sh`
Expected: `check-store-permissions: OK — no forbidden Play Store permissions in android/app/src/main/AndroidManifest.xml`, exit `0` (the manifest is already clean per the audit).

- [ ] **Step 6: Wire the npm script**

In `package.json`, add to the `"scripts"` block (alongside the existing `"strip-native"` entry):

```json
    "check:store-permissions": "bash scripts/check-store-permissions.sh",
```

- [ ] **Step 7: Verify the npm script**

Run: `npm run check:store-permissions`
Expected: same OK output as Step 5, exit `0`.

- [ ] **Step 8: Wire the check into DISTRIBUTION.md's store-build steps**

In `DISTRIBUTION.md`, find the end of section "### 1. Build the store variant with deep features OFF" (the paragraph ending "...runs on-device, so the AI needs no network."). Append immediately after it:

```markdown

**Verify before building the AAB** — this is enforced, not just documented:
```bash
npm run check:store-permissions
```
Exits non-zero and names the offending permission if any of the three above are still active in the
manifest. Run this right before step 2 (building the signed AAB); it's the guard against shipping a
store build with sensitive permissions still declared.
```

- [ ] **Step 9: Verify DISTRIBUTION.md wiring**

Run: `grep -n "check:store-permissions" DISTRIBUTION.md package.json`
Expected: one match in each file.

- [ ] **Step 10: Commit**

```bash
git add scripts/check-store-permissions.sh scripts/check-store-permissions.test.sh package.json DISTRIBUTION.md
git commit -m "feat(release): enforce store-build permission strip with a script + fixture test"
```

---

### Task 4: Add prepared Play Console reviewer notes

**Files:**
- Create: `REVIEWER_NOTES.md`
- Modify: `DISTRIBUTION.md:87-90` (Play Console section)

**Interfaces:** None (plain text files, no code).

- [ ] **Step 1: Create the reviewer notes file**

Create `REVIEWER_NOTES.md`:

```markdown
# Play Console Reviewer Notes

Paste this into the Play Console review-notes field before submitting — see `DISTRIBUTION.md` →
"Play Store release" → "Play Console". Keep it in sync if the first-run download size or flow changes
(check `src/services/modelCatalog.ts` for the current model's `sizeBytes`).

## App Overview
NilaMind is a fully on-device mental-health companion. There is no login, no account, and no
backend — the app works standalone after a one-time model download.

## First-Run Note (IMPORTANT)
On first launch, the app downloads a ~1.1 GB on-device language model over Wi-Fi before any chat
functionality is available. This is a one-time download; please allow it to complete on a Wi-Fi
connection before evaluating core features. No login or test account is required — the app has no
accounts of any kind.

## How to Test Key Features
1. Companion chat: open the app, allow the model download, then start a conversation.
2. Crisis safety layer: runs independently on-device; see `SAFETY.md` in the source repo.
3. Skills library / journaling / check-ins: accessible from the main navigation, no setup required.

## Notes
- No data ever leaves the device (no analytics, no crash reporting, no backend).
- Source is public and Apache-2.0 licensed: https://github.com/sampathmannam/nilamind
```

- [ ] **Step 2: Verify the file**

Run: `test -s REVIEWER_NOTES.md && echo "exists and non-empty"`
Expected: `exists and non-empty`

- [ ] **Step 3: Cross-reference it from DISTRIBUTION.md**

In `DISTRIBUTION.md`, find section "### 3. Play Console" (currently around line 87):

Old:
```
### 3. Play Console
- Create the app → **Internal testing** track first → upload the AAB → add testers → roll out.
- Submit for review; iterate on any policy feedback.
- Bump `versionCode` (and `versionName`) in `android/app/build.gradle` for every upload.
```

New:
```
### 3. Play Console
- Create the app → **Internal testing** track first → upload the AAB → add testers → roll out.
- Paste the reviewer notes from `REVIEWER_NOTES.md` into the review-notes field, then submit for
  review; iterate on any policy feedback.
- Bump `versionCode` (and `versionName`) in `android/app/build.gradle` for every upload.
```

- [ ] **Step 4: Verify the cross-reference**

Run: `grep -n "REVIEWER_NOTES.md" DISTRIBUTION.md`
Expected: one match.

- [ ] **Step 5: Commit**

```bash
git add REVIEWER_NOTES.md DISTRIBUTION.md
git commit -m "docs: add prepared Play Console reviewer notes for the first-run model download"
```

---

### Task 5: Full verification pass

**Files:** None created/modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all test files pass (baseline before this plan: 190 files / 2172 tests, 0 failures). No new failures.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (no `.ts`/`.tsx` files were touched by this plan, so this should be unaffected).

- [ ] **Step 3: Run the new permission guard once more**

Run: `npm run check:store-permissions`
Expected: OK, exit `0`.

- [ ] **Step 4: Run the new guard's own test suite once more**

Run: `bash scripts/check-store-permissions.test.sh`
Expected: 4/4 PASS, exit `0`.

- [ ] **Step 5: Re-grep for every stale claim from the audit**

Run:
```bash
grep -rn "2\.5 GB\|non-free Gemma\|Google's Gemma license" \
  fastlane/metadata/android/en-US/full_description.txt DISTRIBUTION.md README.md || echo "CLEAN"
```
Expected: `CLEAN`

- [ ] **Step 6: Run the project's own guard script**

Run: `npm run guard`
Expected: all four gates pass (typecheck, tests, no test-gaming markers added, no unreviewed safety-file edits — this plan touches no `src/` files, so the safety-file flag should not trigger).
