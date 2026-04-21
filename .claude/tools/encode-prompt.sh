#!/bin/bash
# encode-prompt.sh - Safely encode a prompt to avoid MSYS path conversion
# Usage:
#   source .claude/tools/encode-prompt.sh "/test-ascii --no-restart"
#   # Then call restart-with-skill.sh - it reads CLAUDE_PROMPT_ENCODED
#
# Or in a single line:
#   eval "$(.claude/tools/encode-prompt.sh "/test-ascii --no-restart")" && bash .claude/tools/restart-with-skill.sh
#
# This script outputs an export command that sets CLAUDE_PROMPT_ENCODED
# The restart-with-skill.sh script checks for this env var first.

# CRITICAL: Disable MSYS path conversion for this script
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

# =============================================================================
# FIX MSYS PATH CONVERSION (recovery if it already happened)
# =============================================================================
fix_msys_path() {
    local input="$1"

    # Pattern 1: Windows-style Git path (C:/Program Files/Git/skill-name)
    if [[ "$input" =~ ^[A-Za-z]:/Program\ Files(/\ \(x86\))?/Git/(.+)$ ]]; then
        echo "/${BASH_REMATCH[2]}"
        return
    fi

    # Pattern 2: Windows-style Git path without spaces (C:/Git/skill-name)
    if [[ "$input" =~ ^[A-Za-z]:/Git/(.+)$ ]]; then
        echo "/${BASH_REMATCH[1]}"
        return
    fi

    # Pattern 3: MSYS-style path (/c/Program Files/Git/skill-name)
    if [[ "$input" =~ ^/[a-z]/Program\ Files(/\ \(x86\))?/Git/(.+)$ ]]; then
        echo "/${BASH_REMATCH[2]}"
        return
    fi

    # Pattern 4: MSYS mingw64 path (/mingw64/skill-name becomes /skill-name)
    if [[ "$input" =~ ^/mingw64/(.+)$ ]]; then
        echo "/${BASH_REMATCH[1]}"
        return
    fi

    # Pattern 5: MSYS usr path (/usr/skill-name becomes /skill-name)
    if [[ "$input" =~ ^/usr/(.+)$ ]]; then
        echo "/${BASH_REMATCH[1]}"
        return
    fi

    # No conversion needed
    echo "$input"
}

# Get prompt from arguments
PROMPT="$*"

if [ -z "$PROMPT" ]; then
    echo "export CLAUDE_PROMPT_ENCODED=''"
    exit 0
fi

# Fix any path conversion that already happened
FIXED_PROMPT=$(fix_msys_path "$PROMPT")

if [ "$PROMPT" != "$FIXED_PROMPT" ]; then
    echo "# MSYS path conversion detected and fixed:" >&2
    echo "#   Original: $PROMPT" >&2
    echo "#   Fixed:    $FIXED_PROMPT" >&2
fi

# Base64 encode to completely prevent any further conversion
# Use -w0 to output on single line (GNU coreutils)
# Fall back to no -w flag for BSD/macOS
ENCODED=$(printf '%s' "$FIXED_PROMPT" | base64 -w0 2>/dev/null || printf '%s' "$FIXED_PROMPT" | base64 | tr -d '\n')

# Output export command - can be eval'd or sourced
echo "export CLAUDE_PROMPT_ENCODED='$ENCODED'"
