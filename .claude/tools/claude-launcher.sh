#!/bin/bash
# claude-launcher.sh - Launch Claude Code with MSYS path conversion disabled
#
# PROBLEM: Git Bash/MSYS converts paths starting with "/" to Windows paths.
#          "/skill-name" becomes "C:/Program Files/Git/skill-name"
#          This breaks Claude Code skill invocations.
#
# SOLUTION: Set MSYS_NO_PATHCONV=1 before launching Claude.
#           This disables the automatic path conversion.
#
# USAGE:
#   Option 1: Run this script directly
#     .claude/tools/claude-launcher.sh [claude-args]
#
#   Option 2: Add alias to ~/.bashrc (recommended)
#     alias claude='MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*" command claude'
#
#   Option 3: Source the setup script
#     source .claude/tools/claude-env-setup.sh
#

# =============================================================================
# DISABLE MSYS PATH CONVERSION
# =============================================================================
# MSYS_NO_PATHCONV=1  - Disables "/" to "C:/Program Files/Git/" conversion
# MSYS2_ARG_CONV_EXCL - Excludes specific patterns from conversion (* = all)
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

# =============================================================================
# FIND CLAUDE EXECUTABLE
# =============================================================================
CLAUDE_PATH=""
CLAUDE_CLI_JS=""

# Method 1: Check if claude is in PATH
if command -v claude &> /dev/null; then
    CLAUDE_PATH=$(command -v claude)
fi

# Method 2: Try to find CLI.js directly (most reliable on Windows)
if [ -f "/c/nvm4w/nodejs/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
    CLAUDE_CLI_JS="/c/nvm4w/nodejs/node_modules/@anthropic-ai/claude-code/cli.js"
elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
    CLAUDE_CLI_JS="$APPDATA/npm/node_modules/@anthropic-ai/claude-code/cli.js"
elif [ -f "$HOME/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
    CLAUDE_CLI_JS="$HOME/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js"
fi

# Method 3: Try common Windows locations for claude script
if [ -z "$CLAUDE_PATH" ]; then
    if [ -f "/c/nvm4w/nodejs/claude" ]; then
        CLAUDE_PATH="/c/nvm4w/nodejs/claude"
    elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/claude.cmd" ]; then
        CLAUDE_PATH="$APPDATA/npm/claude.cmd"
    elif [ -f "$HOME/.npm-global/bin/claude" ]; then
        CLAUDE_PATH="$HOME/.npm-global/bin/claude"
    elif where claude &> /dev/null 2>&1; then
        CLAUDE_PATH=$(where claude 2>/dev/null | head -1 | tr -d '\r')
    fi
fi

# =============================================================================
# LAUNCH CLAUDE
# =============================================================================
# Prefer running via node + CLI.js for reliability
# Use winpty if available for proper terminal handling

if [ -n "$CLAUDE_CLI_JS" ] && command -v node &> /dev/null; then
    if command -v winpty &> /dev/null; then
        exec winpty node "$CLAUDE_CLI_JS" "$@"
    else
        exec node "$CLAUDE_CLI_JS" "$@"
    fi
elif [ -n "$CLAUDE_PATH" ]; then
    if command -v winpty &> /dev/null; then
        exec winpty "$CLAUDE_PATH" "$@"
    else
        exec "$CLAUDE_PATH" "$@"
    fi
else
    echo -e "\033[31m❌ ERROR: Claude Code not found\033[0m"
    echo ""
    echo "Searched locations:"
    echo "  - PATH (command -v claude)"
    echo "  - /c/nvm4w/nodejs/claude"
    [ -n "$APPDATA" ] && echo "  - \$APPDATA/npm/claude.cmd"
    echo "  - ~/.npm-global/bin/claude"
    echo ""
    echo "Please install Claude Code:"
    echo "  npm install -g @anthropic-ai/claude-code"
    exit 1
fi
