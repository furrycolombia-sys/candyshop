#!/bin/bash
# detect-claude-flags.sh
# Detects how Claude Code was started and outputs the flags
# Usage: .claude/tools/detect-claude-flags.sh

# Use the existing PowerShell script which handles escaping correctly
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Convert Unix-style path to Windows-style for PowerShell
# /z/Github/... -> Z:/Github/...
# /c/Users/... -> C:/Users/...
WIN_SCRIPT_DIR="$SCRIPT_DIR"
if [[ "$SCRIPT_DIR" =~ ^/([a-z])/ ]]; then
    drive_letter="${BASH_REMATCH[1]}"
    WIN_SCRIPT_DIR="${drive_letter^^}:${SCRIPT_DIR:2}"
fi

# Run PowerShell with Windows-style path
# Filter out any copyright banner that might appear
raw_output=$(powershell -NoProfile -NoLogo -ExecutionPolicy Bypass -File "$WIN_SCRIPT_DIR/detect-claude-flags.ps1" 2>/dev/null)

# Process the output: remove carriage returns, filter to only valid flag lines
flags=""
while IFS= read -r line; do
    line=$(echo "$line" | tr -d '\r' | xargs)
    # Skip empty lines and known banner lines
    if [ -z "$line" ]; then
        continue
    fi
    if [[ "$line" == Windows* ]] || [[ "$line" == PowerShell* ]] || [[ "$line" == Copyright* ]] || [[ "$line" == Install* ]] || [[ "$line" == https* ]]; then
        continue
    fi
    # Valid output - either a flag or NONE
    flags="$line"
    break
done <<< "$raw_output"

if [ -n "$flags" ] && [ "$flags" != "NONE" ]; then
    echo "$flags"
else
    echo "NONE"
fi
