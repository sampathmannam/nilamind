#!/usr/bin/env bash
# guard.sh — reward-hacking + quality gate for NilaMind (see AGENTS.md → Guardrails).
# Runs the hard gates (tsc + vitest) and scans the diff for test-gaming signals + safety-file edits.
# Run before every commit:   npm run guard        (or: bash scripts/guard.sh [--staged])
# Exit 0 = safe to commit. Non-zero = stop and look. WARN (⚠) items don't fail the gate but need your eyes.
set -uo pipefail
cd "$(dirname "$0")/.."

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; NC='\033[0m'
fail=0
range="HEAD"; [ "${1:-}" = "--staged" ] && range="--staged"

echo "── 1/4  Typecheck (tsc --noEmit) ─────────────────────────"
if npx tsc --noEmit; then echo -e "${GRN}✓ types clean${NC}"; else echo -e "${RED}✗ type errors — hard gate${NC}"; fail=1; fi

echo "── 2/4  Tests (vitest run) ───────────────────────────────"
if npx vitest run >/tmp/nila_guard_vitest.log 2>&1; then
  grep -E "Test Files|Tests " /tmp/nila_guard_vitest.log | tail -2
  echo -e "${GRN}✓ suite green${NC}"
else
  tail -8 /tmp/nila_guard_vitest.log; echo -e "${RED}✗ tests failing — hard gate${NC}"; fail=1
fi

echo "── 3/4  Reward-hacking scan (ADDED .skip/.only/xit) ──────"
# audit #32: also catch it.todo / .skipIf / .runIf / .fails / fit / fdescribe (common disable vectors the
# old `\.(skip|only)\(` regex missed — `.skipIf(` etc. don't match `skip(` with `(` immediately after).
hack=$(git diff "$range" -- '*.test.ts' 2>/dev/null | grep -E '^\+' | grep -Ei '\.(skip|skipIf|runIf|only|todo|fails)\(|\b(xit|xdescribe|xtest|fit|fdescribe)\(' || true)
if [ -n "$hack" ]; then
  echo -e "${RED}✗ test-gaming markers ADDED — a suite must never be greened by disabling tests:${NC}"
  echo "$hack"; fail=1
else
  echo -e "${GRN}✓ no skip/only/xit added to tests${NC}"
fi

echo "── 4/4  Review flags (removed asserts + safety/crypto edits) ─"
delassert=$(git diff "$range" -- '*.test.ts' 2>/dev/null | grep -E '^-' | grep -Ec 'expect\(|\b(it|test|describe)\(' || true)
[ "${delassert:-0}" -gt 0 ] && echo -e "${YLW}⚠ ${delassert} test assertion/def line(s) REMOVED — confirm intentional, not deletion-to-pass.${NC}"
safety=$(git diff "$range" --name-only 2>/dev/null | grep -E 'src/(safety\.ts|services/(crisisClassifier|elevationGuard|nilaSafetyGate|secureLocal|secureStore|nilaContext|crisisEmbedder))' || true)
[ -n "$safety" ] && { echo -e "${YLW}⚠ safety/crypto files changed — REVIEW the diff yourself before commit (AGENTS.md rule):${NC}"; echo "$safety"; }
[ "${delassert:-0}" -eq 0 ] && [ -z "$safety" ] && echo -e "${GRN}✓ no review flags${NC}"

echo "──────────────────────────────────────────────────────────"
if [ "$fail" -ne 0 ]; then echo -e "${RED}GUARD FAILED — do not commit until fixed.${NC}"; exit 1; fi
echo -e "${GRN}GUARD PASSED.${NC} (Still eyeball any ⚠ review flags above.)"
