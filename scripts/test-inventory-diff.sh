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

# Compare on the case NAME, not "suite > name". Suite attribution can shift
# without a case being lost -- moving a file, or improving how this scanner
# tracks nesting, both do it -- and those shifts read as losses when they are
# nothing of the sort. The name is what identifies the assertion.
strip_suite() {
  sed 's/^- //; s/^\*\*\[skipped\]\*\* //; s/^\*(parameterised)\* //; s/^.* > //'
}

git show "$ref:tests/INVENTORY.md" 2>/dev/null | grep '^- ' | strip_suite | sort > "$before" || {
  echo "No inventory at $ref -- nothing to compare against."
  exit 0
}

node scripts/test-inventory.mjs > /dev/null
grep '^- ' tests/INVENTORY.md | strip_suite | sort > "$after"

# Cases whose removal was deliberate and explained. Without this, any rename
# fails the gate with no way through, and a gate that blocks ordinary work is
# a gate somebody deletes. Naming the case and the reason is the cost.
retired=$(mktemp)
trap 'rm -f "$before" "$after" "$retired"' EXIT
if [ -f tests/retired-cases.txt ]; then
  sed 's/#.*//' tests/retired-cases.txt | sed 's/[[:space:]]*$//'     | grep -v '^$' | sort > "$retired"
else
  : > "$retired"
fi

# Subtract retired names from the losses, not from the baseline: a case that
# comes back should stop being reported as retired rather than stay hidden.
lost=$(comm -23 "$before" "$after" | comm -23 - "$retired" | wc -l | tr -d ' ')
added=$(comm -13 "$before" "$after" | wc -l | tr -d ' ')

echo "against $ref: $(wc -l < "$before" | tr -d ' ') cases -> $(wc -l < "$after" | tr -d ' ') cases"
echo

if [ "$lost" -gt 0 ]; then
  echo "LOST ($lost):"
  comm -23 "$before" "$after" | comm -23 - "$retired" | sed 's/^/  /'
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
