#!/bin/bash
# claude-env-setup.sh - Setup environment for Claude Code on Git Bash/MSYS
#
# This script sets up the environment to prevent MSYS path conversion
# which breaks Claude Code skill invocations (e.g., /skill-name).
#
# USAGE:
#   Option 1: Source in current session
#     source .claude/tools/claude-env-setup.sh
#
#   Option 2: Add to ~/.bashrc for permanent setup
#     echo 'source /path/to/project/.claude/tools/claude-env-setup.sh' >> ~/.bashrc
#
#   Option 3: Copy the alias directly to ~/.bashrc
#     alias claude='MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*" command claude'
#

# =============================================================================
# DETECT ENVIRONMENT
# =============================================================================
# Only apply fixes on MSYS/Git Bash (Windows)
if [[ "$OSTYPE" != "msys" ]] && [[ "$OSTYPE" != "mingw"* ]] && [[ "$OSTYPE" != "cygwin" ]]; then
    # Not on Windows/MSYS - no fixes needed
    return 0 2>/dev/null || exit 0
fi

# =============================================================================
# CREATE CLAUDE ALIAS
# =============================================================================
# This alias wraps the claude command with MSYS path conversion disabled.
#
# MSYS_NO_PATHCONV=1     - Disables "/" to "C:/Program Files/Git/" conversion
# MSYS2_ARG_CONV_EXCL=*  - Excludes all arguments from path conversion
# command claude         - Uses 'command' to bypass any existing aliases
#
alias claude='MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*" command claude'

# =============================================================================
# OPTIONAL: GLOBAL SETTINGS
# =============================================================================
# Uncomment these lines to disable path conversion for ALL commands in this shell.
# Warning: This may affect other programs that rely on path conversion.
#
# export MSYS_NO_PATHCONV=1
# export MSYS2_ARG_CONV_EXCL='*'

# =============================================================================
# FEEDBACK
# =============================================================================
echo -e "\033[32m✓ Claude Code MSYS fix loaded\033[0m"
echo -e "\033[90m  Path conversion disabled for 'claude' command\033[0m"
echo -e "\033[90m  Skills like /test-ascii will now work correctly\033[0m"
