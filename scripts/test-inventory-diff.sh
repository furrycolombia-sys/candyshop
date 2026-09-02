#!/usr/bin/env bash
# Compares the current test inventory against an earlier commit's.
#
# The question a rework has to answer is "did we drop a case", and neither a
# file count nor a test count answers it -- both can hold while an assertion
# disappears. This prints the cases that existed before and do not now.
#
# Usage: bash scripts/test-inventory-diff.sh [ref]   (default: the merge base with develop)
set -euo pipefail

ref="${1:-$(git merge-base HEAD develop)}"
before=$(mktemp)
after=$(mktemp)
trap 'rm -f "$before" "$after"' EXIT

git show "$ref:tests/INVENTORY.md" 2>/dev/null | grep '^- ' | sort > "$before" || {
  echo "No inventory at $ref -- nothing to compare against."
  exit 0
}

node scripts/test-inventory.mjs > /dev/null
grep '^- ' tests/INVENTORY.md | sort > "$after"

lost=$(comm -23 "$before" "$after" | wc -l | tr -d ' ')
added=$(comm -13 "$before" "$after" | wc -l | tr -d ' ')

echo "against $ref: $(wc -l < "$before" | tr -d ' ') cases -> $(wc -l < "$after" | tr -d ' ') cases"
echo

if [ "$lost" -gt 0 ]; then
  echo "LOST ($lost):"
  comm -23 "$before" "$after" | sed 's/^/  /'
  echo
fi

if [ "$added" -gt 0 ]; then
  echo "ADDED ($added):"
  comm -13 "$before" "$after" | sed 's/^/  /'
  echo
fi

if [ "$lost" -gt 0 ]; then
  echo "FAIL: $lost case(s) present before and missing now."
  exit 1
fi

echo "OK: no cases lost."
