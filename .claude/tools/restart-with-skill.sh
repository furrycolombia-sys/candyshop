#!/bin/bash
# restart-with-skill.sh - Spawn fresh Claude session in new Git Bash window
# Usage: .claude/tools/restart-with-skill.sh [claude-flags] "/skill-command args --no-restart"
#
# Example:
#   .claude/tools/restart-with-skill.sh --dangerously-skip-permissions "/submit-pr everything --no-restart"
#
# This script:
# 1. Parses Claude CLI flags and skill command (with all arguments)
# 2. Detects current elevation level (admin/non-admin)
# 3. Spawns a NEW mintty window with fresh Claude session (preserving elevation)
# 4. Exits the current terminal (which closes the old Claude session)

# CRITICAL: Disable Git Bash POSIX path conversion
# Without this, "/submit-pr" gets converted to "C:/Program Files/Git/submit-pr"
export MSYS_NO_PATHCONV=1

# Dynamically determine project path from script location
# This makes the script portable across different development environments
PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# =============================================================================
# ELEVATION DETECTION
# =============================================================================
# Detect if running as Administrator - new session should match
IS_ADMIN=$(powershell -NoProfile -Command '
([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
' 2>/dev/null | tr -d '\r')

if [ "$IS_ADMIN" = "True" ]; then
    echo -e "\033[33m🔒 Running as Administrator - new session will also be elevated\033[0m"
else
    echo -e "\033[33m🔓 Running as standard user\033[0m"
fi

# =============================================================================
# MINTTY PATH DETECTION
# =============================================================================
# Find mintty reliably - check multiple locations
MINTTY_PATH=""
if command -v mintty &> /dev/null; then
    MINTTY_PATH=$(command -v mintty)
elif [ -f "/usr/bin/mintty" ]; then
    MINTTY_PATH="/usr/bin/mintty"
elif [ -f "/mingw64/bin/mintty" ]; then
    MINTTY_PATH="/mingw64/bin/mintty"
fi

if [ -z "$MINTTY_PATH" ]; then
    echo -e "\033[31m❌ ERROR: mintty not found. Cannot spawn new Git Bash window.\033[0m"
    echo -e "\033[31m   Please ensure Git Bash is properly installed.\033[0m"
    exit 1
fi

echo -e "\033[90mUsing mintty: $MINTTY_PATH\033[0m"

# =============================================================================
# FIX MSYS PATH CONVERSION
# =============================================================================
# Git Bash converts "/skill-name" to "C:/Program Files/Git/skill-name" BEFORE
# this script even runs. We detect and recover from this conversion.
#
# This function is defined EARLY because it's needed by both:
# 1. Pre-encoded prompt path (in case encoding happened after conversion)
# 2. Command-line argument path (fallback)
#
# Known MSYS/Git installation paths to strip:
# - C:/Program Files/Git/
# - C:/Program Files (x86)/Git/
# - D:/Git/, E:/Git/, etc.
# - /c/Program Files/Git/ (MSYS style)
# - /mingw64/, /usr/, etc.
#
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

# =============================================================================
# CHECK FOR PRE-ENCODED PROMPT (PREFERRED METHOD)
# =============================================================================
# If CLAUDE_PROMPT_ENCODED is set, use it instead of command-line args.
# This completely avoids MSYS path conversion issues.
# Set via: eval "$(.claude/tools/encode-prompt.sh "/skill-name --no-restart")"
#
if [ -n "${CLAUDE_PROMPT_ENCODED:-}" ]; then
    # Decode the prompt - try GNU base64 (-d) first
    SKILL_COMMAND=$(printf '%s' "$CLAUDE_PROMPT_ENCODED" | base64 -d 2>/dev/null | tr -d '\r')

    # Fallback for BSD/macOS base64 (--decode) - only runs if first decode produced empty output
    # This is efficient: second decode only executes when needed for cross-platform compatibility
    if [ -z "$SKILL_COMMAND" ] && [ -n "$CLAUDE_PROMPT_ENCODED" ]; then
        SKILL_COMMAND=$(printf '%s' "$CLAUDE_PROMPT_ENCODED" | base64 --decode 2>/dev/null | tr -d '\r')
    fi

    # IMPORTANT: Apply MSYS path fix even to pre-encoded values!
    # If Claude's bash command that set the env var already had the mangled path
    # (e.g., PROMPT="/test-ascii" instead of using heredoc), the base64 contains
    # the mangled path. We fix it here as a safety net.
    ORIGINAL_DECODED="$SKILL_COMMAND"
    SKILL_COMMAND=$(fix_msys_path "$SKILL_COMMAND")

    if [ "$ORIGINAL_DECODED" != "$SKILL_COMMAND" ]; then
        echo -e "\033[33m⚠️  Pre-encoded value had MSYS path conversion - fixed:\033[0m"
        echo -e "\033[31m   Before: $ORIGINAL_DECODED\033[0m"
        echo -e "\033[32m   After:  $SKILL_COMMAND\033[0m"
        echo -e "\033[32m✅ Using pre-encoded prompt (with path fix applied)\033[0m"
    else
        echo -e "\033[32m✅ Using pre-encoded prompt (path conversion avoided)\033[0m"
    fi
    echo -e "\033[90m   Decoded: $SKILL_COMMAND\033[0m"

    # Parse flags from CLAUDE_FLAGS_ENCODED if present
    # Uses same GNU/BSD fallback pattern: try -d first, --decode only if empty result
    CLAUDE_FLAGS=""
    if [ -n "${CLAUDE_FLAGS_ENCODED:-}" ]; then
        CLAUDE_FLAGS=$(printf '%s' "$CLAUDE_FLAGS_ENCODED" | base64 -d 2>/dev/null | tr -d '\r')
        if [ -z "$CLAUDE_FLAGS" ]; then
            CLAUDE_FLAGS=$(printf '%s' "$CLAUDE_FLAGS_ENCODED" | base64 --decode 2>/dev/null | tr -d '\r')
        fi
    fi

    # Skip argument parsing - jump to the execution section
    SKIP_ARG_PARSING=true
else
    SKIP_ARG_PARSING=false
fi

# =============================================================================
# PARSE COMMAND-LINE ARGS (FALLBACK)
# =============================================================================

# Parse arguments - separate Claude flags from skill command
# CRITICAL: Once we see a skill command (starts with / or is a Windows path),
# ALL subsequent arguments belong to the skill command, even if they start with --
#
# NOTE: This section is SKIPPED if CLAUDE_PROMPT_ENCODED was provided
if [ "$SKIP_ARG_PARSING" = false ]; then

CLAUDE_FLAGS=""
SKILL_COMMAND=""
SKILL_COMMAND_STARTED=false

for arg in "$@"; do
    if [ "$SKILL_COMMAND_STARTED" = true ]; then
        # Already in skill command - append everything (including --flags like --no-restart)
        SKILL_COMMAND="$SKILL_COMMAND $arg"
    elif [[ "$arg" == /* ]] || [[ "$arg" =~ ^[A-Za-z]:/ ]]; then
        # Skill command starts - either starts with / OR is a Windows path (mangled by MSYS)
        SKILL_COMMAND="$arg"
        SKILL_COMMAND_STARTED=true
    elif [[ "$arg" == --* ]]; then
        # Claude CLI flag (e.g., --dangerously-skip-permissions) - only before skill command
        CLAUDE_FLAGS="$CLAUDE_FLAGS $arg"
    else
        # Non-flag, non-skill argument before skill command - could be a skill name without /
        # Treat as start of skill command
        SKILL_COMMAND="$arg"
        SKILL_COMMAND_STARTED=true
    fi
done

# Trim leading space from flags
CLAUDE_FLAGS="${CLAUDE_FLAGS# }"

# Fix MSYS path conversion if detected
if [ -n "$SKILL_COMMAND" ]; then
    ORIGINAL_COMMAND="$SKILL_COMMAND"
    SKILL_COMMAND=$(fix_msys_path "$SKILL_COMMAND")

    if [ "$ORIGINAL_COMMAND" != "$SKILL_COMMAND" ]; then
        echo -e "\033[33m⚠️  MSYS path conversion detected and fixed:\033[0m"
        echo -e "\033[31m   Mangled:  $ORIGINAL_COMMAND\033[0m"
        echo -e "\033[32m   Fixed:    $SKILL_COMMAND\033[0m"
    fi
fi

fi  # End of SKIP_ARG_PARSING check

# =============================================================================
# AUTO-DETECT FLAGS FALLBACK
# =============================================================================
# If no flags were provided via CLAUDE_FLAGS_ENCODED or command-line args,
# auto-detect them from the running Claude process. This prevents the new
# session from losing flags like --dangerously-skip-permissions when the
# caller (Claude AI) forgets to pass them.
if [ -z "$CLAUDE_FLAGS" ]; then
    echo -e "\033[33m⚠️  No flags provided - auto-detecting from running process...\033[0m"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    AUTO_FLAGS=$(bash "$SCRIPT_DIR/detect-claude-flags.sh" 2>/dev/null | tr -d '\r')

    if [ -n "$AUTO_FLAGS" ] && [ "$AUTO_FLAGS" != "NONE" ]; then
        CLAUDE_FLAGS="$AUTO_FLAGS"
        echo -e "\033[32m✅ Auto-detected flags: $CLAUDE_FLAGS\033[0m"
    else
        echo -e "\033[90m   No flags detected (running without special flags)\033[0m"
    fi
fi

echo -e "\033[36mSpawning new terminal with: claude $CLAUDE_FLAGS \"$SKILL_COMMAND\"\033[0m"

# =============================================================================
# CLAUDE PATH DETECTION
# =============================================================================
# Find claude now and pass the path to the new terminal
# This ensures the new terminal can find claude even if PATH differs
DETECTED_CLAUDE_PATH=""
DETECTED_CLI_JS=""

# First, try to find the CLI.js directly (most reliable method)
if [ -f "/c/nvm4w/nodejs/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
    DETECTED_CLI_JS="/c/nvm4w/nodejs/node_modules/@anthropic-ai/claude-code/cli.js"
elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
    DETECTED_CLI_JS="$APPDATA/npm/node_modules/@anthropic-ai/claude-code/cli.js"
elif [ -f "$HOME/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
    DETECTED_CLI_JS="$HOME/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js"
fi

# Also detect the claude script as backup
if command -v claude &> /dev/null; then
    DETECTED_CLAUDE_PATH=$(command -v claude)
elif [ -f "$HOME/.local/bin/claude.exe" ]; then
    # Native installer location (e.g., C:\Users\<user>\.local\bin\claude.exe)
    DETECTED_CLAUDE_PATH="$HOME/.local/bin/claude.exe"
elif [ -f "$HOME/.local/bin/claude" ]; then
    DETECTED_CLAUDE_PATH="$HOME/.local/bin/claude"
elif [ -f "/c/nvm4w/nodejs/claude" ]; then
    DETECTED_CLAUDE_PATH="/c/nvm4w/nodejs/claude"
elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/claude.cmd" ]; then
    DETECTED_CLAUDE_PATH="$APPDATA/npm/claude.cmd"
elif [ -f "$HOME/.npm-global/bin/claude" ]; then
    DETECTED_CLAUDE_PATH="$HOME/.npm-global/bin/claude"
elif where claude &> /dev/null 2>&1; then
    DETECTED_CLAUDE_PATH=$(where claude 2>/dev/null | head -1 | tr -d '\r')
fi

if [ -n "$DETECTED_CLI_JS" ]; then
    echo -e "\033[90mClaude CLI.js found at: $DETECTED_CLI_JS\033[0m"
elif [ -n "$DETECTED_CLAUDE_PATH" ]; then
    echo -e "\033[90mClaude found at: $DETECTED_CLAUDE_PATH\033[0m"
else
    echo -e "\033[33m⚠️  Could not detect claude path - new terminal will search for it\033[0m"
fi

# Get list of current mintty PIDs BEFORE spawning
OLD_MINTTY_PIDS=$(powershell -NoProfile -Command '
(Get-Process mintty -ErrorAction SilentlyContinue).Id -join ","
' 2>/dev/null | tr -d '\r')

# Count how many minttys exist
MINTTY_COUNT=$(echo "$OLD_MINTTY_PIDS" | tr ',' '\n' | grep -c .)

echo -e "\033[33mFound $MINTTY_COUNT mintty window(s): $OLD_MINTTY_PIDS\033[0m"

# Only auto-kill if exactly 1 mintty (must be ours)
# If multiple, user might have other windows - don't kill those
KILL_CMD=""
if [ "$MINTTY_COUNT" -eq 1 ] && [ -n "$OLD_MINTTY_PIDS" ]; then
    # Use PowerShell Stop-Process instead of taskkill to avoid Git Bash path conversion issues
    # taskkill //PID doesn't work reliably because // -> / conversion is inconsistent
    KILL_CMD="(sleep 3 && powershell -NoProfile -Command 'Stop-Process -Id $OLD_MINTTY_PIDS -Force -ErrorAction SilentlyContinue') &"
    echo -e "\033[32m✅ New terminal will auto-close this window in ~3 seconds.\033[0m"
else
    echo -e "\033[33m⚠️  Multiple terminals detected - please close this one manually.\033[0m"
fi

# Write the startup script to a temp file to avoid nested quoting issues
# This ensures the full skill command with all arguments is preserved
TEMP_SCRIPT=$(mktemp /tmp/claude-restart-XXXXXX.sh)

# Ensure temp file cleanup on any exit (success, failure, or interrupt)
trap 'rm -f "$TEMP_SCRIPT"' EXIT INT TERM

# CRITICAL: Compute base64 encoding NOW, before writing to temp script
# The heredoc below uses single quotes around the value, so we can't use $() there
SKILL_COMMAND_B64=""
if [ -n "$SKILL_COMMAND" ]; then
    SKILL_COMMAND_B64=$(printf '%s' "$SKILL_COMMAND" | base64 -w0 2>/dev/null || printf '%s' "$SKILL_COMMAND" | base64 | tr -d '\n')
fi
echo -e "\033[90mDEBUG: SKILL_COMMAND='$SKILL_COMMAND'\033[0m"
echo -e "\033[90mDEBUG: SKILL_COMMAND_B64='$SKILL_COMMAND_B64'\033[0m"
cat > "$TEMP_SCRIPT" << 'SCRIPT_HEADER'
#!/bin/bash
# CRITICAL: Export MSYS path conversion blockers at the VERY START
# These must be set BEFORE any argument expansion happens in bash
# Without this, ${cmd_args[@]} expansion converts /skill to C:/Program Files/Git/skill
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'

# CRITICAL: Unset CLAUDECODE to allow launching Claude from a spawned terminal
# Claude Code sets this env var to detect nested sessions, but our restart
# spawns a genuinely NEW terminal (not a nested session), so this is safe.
unset CLAUDECODE

# Function to run Claude in a loop until user explicitly exits
run_claude() {
    while true; do
        # Configure terminal for proper key handling before running Claude
        # -ixon: Disable XON/XOFF flow control (frees up Ctrl+S/Q)
        # -ixoff: Disable sending start/stop characters
        stty -ixon -ixoff 2>/dev/null

        # Set terminal type for proper escape sequence handling
        export TERM=xterm-256color

        # Set ESCDELAY=0 to eliminate delay after Escape key press
        # This prevents the terminal from waiting to see if Escape is part of a sequence
        export ESCDELAY=0

        # Debug: Show what was passed from parent
        echo -e "\033[90mDEBUG: CLAUDE_PATH_OVERRIDE='$CLAUDE_PATH_OVERRIDE'\033[0m"
        echo -e "\033[90mDEBUG: CLAUDE_CLI_JS_OVERRIDE='$CLAUDE_CLI_JS_OVERRIDE'\033[0m"

        # Find claude executable - winpty needs full path on Windows
        # Check multiple locations where npm might install global packages
        # CLAUDE_PATH_OVERRIDE and CLAUDE_CLI_JS_OVERRIDE are set by the parent script
        CLAUDE_PATH="${CLAUDE_PATH_OVERRIDE:-}"
        CLAUDE_CLI_JS="${CLAUDE_CLI_JS_OVERRIDE:-}"

        # If no CLI.js passed from parent, try to find it directly
        # This is the most reliable method on Windows
        if [ -z "$CLAUDE_CLI_JS" ]; then
            if [ -f "/c/nvm4w/nodejs/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
                CLAUDE_CLI_JS="/c/nvm4w/nodejs/node_modules/@anthropic-ai/claude-code/cli.js"
            elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
                CLAUDE_CLI_JS="$APPDATA/npm/node_modules/@anthropic-ai/claude-code/cli.js"
            elif [ -f "$HOME/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js" ]; then
                CLAUDE_CLI_JS="$HOME/.npm-global/lib/node_modules/@anthropic-ai/claude-code/cli.js"
            fi
        fi

        if [ -z "$CLAUDE_PATH" ]; then
            # First check if claude is in PATH
            if command -v claude &> /dev/null; then
                CLAUDE_PATH=$(command -v claude)
            # Native installer location (~/.local/bin/)
            elif [ -f "$HOME/.local/bin/claude.exe" ]; then
                CLAUDE_PATH="$HOME/.local/bin/claude.exe"
            elif [ -f "$HOME/.local/bin/claude" ]; then
                CLAUDE_PATH="$HOME/.local/bin/claude"
            # nvm for Windows (nvm4w) - common location
            elif [ -f "/c/nvm4w/nodejs/claude" ]; then
                CLAUDE_PATH="/c/nvm4w/nodejs/claude"
            elif [ -f "/c/nvm4w/nodejs/claude.cmd" ]; then
                CLAUDE_PATH="/c/nvm4w/nodejs/claude.cmd"
            # npm global installs on Windows (typically %APPDATA%\npm)
            elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/claude.cmd" ]; then
                CLAUDE_PATH="$APPDATA/npm/claude.cmd"
            elif [ -n "$APPDATA" ] && [ -f "$APPDATA/npm/claude" ]; then
                CLAUDE_PATH="$APPDATA/npm/claude"
            # Custom npm prefix location
            elif [ -f "$HOME/.npm-global/bin/claude" ]; then
                CLAUDE_PATH="$HOME/.npm-global/bin/claude"
            # nvm for Windows - alternative locations
            elif [ -n "$NVM_SYMLINK" ] && [ -f "$NVM_SYMLINK/claude.cmd" ]; then
                CLAUDE_PATH="$NVM_SYMLINK/claude.cmd"
            elif [ -n "$NVM_HOME" ] && [ -f "$NVM_HOME/nodejs/claude" ]; then
                CLAUDE_PATH="$NVM_HOME/nodejs/claude"
            # Local node_modules (if installed locally)
            elif [ -f "./node_modules/.bin/claude" ]; then
                CLAUDE_PATH="./node_modules/.bin/claude"
            # Fallback: try to find using 'where' command (Windows)
            elif where claude &> /dev/null 2>&1; then
                CLAUDE_PATH=$(where claude 2>/dev/null | head -1 | tr -d '\r')
            fi
        fi

        echo -e "\033[90mDEBUG: CLAUDE_PATH='$CLAUDE_PATH'\033[0m"
        echo -e "\033[90mDEBUG: CLAUDE_CLI_JS='$CLAUDE_CLI_JS'\033[0m"

        if [ -z "$CLAUDE_PATH" ] && [ -z "$CLAUDE_CLI_JS" ]; then
            echo -e "\033[31m❌ ERROR: claude not found\033[0m"
            echo -e "\033[33mSearched locations:\033[0m"
            echo -e "  - PATH (command -v): not found"
            echo -e "  - /c/nvm4w/nodejs/claude: not found"
            [ -n "$APPDATA" ] && echo -e "  - \$APPDATA/npm/claude.cmd: not found"
            echo -e "  - ~/.npm-global/bin/claude: not found"
            echo -e "  - ./node_modules/.bin/claude: not found"
            echo -e "\033[33mPlease ensure Claude Code CLI is installed:\033[0m"
            echo -e "  npm install -g @anthropic-ai/claude-code"
            return 1
        fi

        # Run Claude - it will handle Escape and Ctrl+C internally
        # MSYS_NO_PATHCONV=1 prevents Git Bash from converting /skill to C:/Program Files/Git/skill
        #
        # Use winpty if available - it creates a proper pseudo-terminal on Windows
        # that handles escape sequences and special keys correctly
        #
        # Strategy: Try methods in order of reliability
        # 1. Direct node execution of CLI.js (most reliable on Windows)
        # 2. winpty with full path to claude script
        # 3. Direct execution as fallback
        #
        # IMPORTANT: Claude CLI expects: claude [flags] [prompt]
        # The prompt is passed as a positional argument, NOT with --prompt flag
        #
        # CRITICAL: We read from environment variables instead of $@ to avoid
        # MSYS path conversion. Git Bash converts "/skill" to "C:/Program Files/Git/skill"
        # even with MSYS_NO_PATHCONV=1 when passed as command-line args.
        # We use BASE64 encoding to completely prevent any path conversion.
        local flags_str="${CLAUDE_FLAGS_OVERRIDE:-}"
        local prompt=""
        if [ -n "${CLAUDE_PROMPT_OVERRIDE_B64:-}" ]; then
            # Decode from base64 - this is the safe path that won't be converted
            # Use printf (not echo) to avoid adding newline before piping
            # Use tr -d '\r' to strip any Windows carriage returns
            # Try GNU base64 (-d) first, only fall back to BSD (--decode) if result is empty
            prompt=$(printf '%s' "$CLAUDE_PROMPT_OVERRIDE_B64" | base64 -d 2>/dev/null | tr -d '\r')

            # Fallback: if base64 -d fails (empty result), try base64 --decode (macOS/BSD)
            if [ -z "$prompt" ] && [ -n "$CLAUDE_PROMPT_OVERRIDE_B64" ]; then
                prompt=$(printf '%s' "$CLAUDE_PROMPT_OVERRIDE_B64" | base64 --decode 2>/dev/null | tr -d '\r')
            fi

            echo -e "\033[90mDEBUG: Decoded prompt='$prompt'\033[0m"
        fi

        # Convert flags string to array
        local flags=()
        if [ -n "$flags_str" ]; then
            read -ra flags <<< "$flags_str"
        fi

        echo -e "\033[90mDEBUG: flags_str='$flags_str'\033[0m"
        echo -e "\033[90mDEBUG: flags array=(${flags[*]})\033[0m"
        echo -e "\033[90mDEBUG: prompt='$prompt'\033[0m"
        echo -e "\033[90mDEBUG: B64 env var='$CLAUDE_PROMPT_OVERRIDE_B64'\033[0m"

        # Build the command - prompt is a positional argument, not a flag
        # Claude CLI syntax: claude [options] [prompt]
        #
        # CRITICAL: Even with MSYS_NO_PATHCONV=1, array expansion can still trigger
        # path conversion in some Git Bash versions. To be absolutely safe, we:
        # 1. Export MSYS_NO_PATHCONV=1 (affects child processes)
        # 2. Also set it inline (affects current command)
        # 3. Use eval with properly quoted arguments as last resort
        export MSYS_NO_PATHCONV=1
        export MSYS2_ARG_CONV_EXCL='*'

        local cmd_args=("${flags[@]}")
        if [ -n "$prompt" ]; then
            cmd_args+=("$prompt")
        fi

        echo -e "\033[90mDEBUG: Final cmd_args=(${cmd_args[*]})\033[0m"

        # =================================================================
        # MSYS PATH CONVERSION FIX:
        # Array expansion ${cmd_args[@]} triggers path conversion in Git Bash
        # even with MSYS_NO_PATHCONV=1. The solution is to pass the prompt
        # through a temp file that's sourced, avoiding bash argument expansion.
        # =================================================================

        # =================================================================
        # CRITICAL FIX: Decode base64 at execution time, not before!
        #
        # The problem: Even with MSYS_NO_PATHCONV=1, when we write
        # '/test-ascii --no-restart' literally to a script and then source it,
        # Git Bash STILL converts it to 'C:/Program Files/Git/test-ascii'.
        #
        # The solution: Keep the prompt base64 encoded until the EXACT moment
        # of execution. The string '/test-ascii' should NEVER appear literally
        # in any bash script that gets sourced.
        # =================================================================

        # Get the base64-encoded prompt from environment (set by parent script)
        local prompt_b64="${CLAUDE_PROMPT_OVERRIDE_B64:-}"

        # Create a mini-script that decodes and executes in one command
        local EXEC_SCRIPT=$(mktemp /tmp/claude-exec-XXXXXX.sh)

        cat > "$EXEC_SCRIPT" << 'EXEC_EOF'
#!/bin/bash
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL='*'
EXEC_EOF

        if [ -n "$CLAUDE_CLI_JS" ] && command -v node &> /dev/null; then
            echo -e "\033[90mUsing node to run: $CLAUDE_CLI_JS\033[0m"

            # Build command - but decode prompt INLINE at execution time
            # This prevents MSYS from ever seeing the /skill-name string
            if command -v winpty &> /dev/null; then
                echo -n 'winpty ' >> "$EXEC_SCRIPT"
            fi
            echo -n "node '$CLAUDE_CLI_JS'" >> "$EXEC_SCRIPT"

            # Add flags (these don't start with / so they're safe)
            for flag in "${flags[@]}"; do
                printf " '%s'" "$flag" >> "$EXEC_SCRIPT"
            done

            # Add prompt - decode base64 INLINE so /skill never appears literally
            if [ -n "$prompt_b64" ]; then
                # The magic: Decode base64 at runtime AND prefix with extra / to prevent MSYS conversion
                # MSYS treats // as UNC path prefix and doesn't convert it
                # We decode, check if starts with /, and if so add another /
                # The sed 's#^/#//#' converts /skill to //skill which MSYS leaves alone
                # Using # as delimiter instead of | to avoid conflicts with pipe characters in prompts
                printf ' "$(printf '"'"'%%s'"'"' '"'"'%s'"'"' | base64 -d 2>/dev/null | sed '"'"'s#^/#//#'"'"' || printf '"'"'%%s'"'"' '"'"'%s'"'"' | base64 --decode 2>/dev/null | sed '"'"'s#^/#//#'"'"')"' "$prompt_b64" "$prompt_b64" >> "$EXEC_SCRIPT"
            fi
            echo "" >> "$EXEC_SCRIPT"

        elif [ -n "$CLAUDE_PATH" ]; then
            echo -e "\033[90mUsing claude at: $CLAUDE_PATH\033[0m"

            if command -v winpty &> /dev/null; then
                echo -n 'winpty ' >> "$EXEC_SCRIPT"
            fi
            printf "'%s'" "$CLAUDE_PATH" >> "$EXEC_SCRIPT"

            for flag in "${flags[@]}"; do
                printf " '%s'" "$flag" >> "$EXEC_SCRIPT"
            done

            # Same inline decode for CLAUDE_PATH method - with // prefix to prevent MSYS conversion
            # Using # as delimiter instead of | to avoid conflicts with pipe characters in prompts
            if [ -n "$prompt_b64" ]; then
                printf ' "$(printf '"'"'%%s'"'"' '"'"'%s'"'"' | base64 -d 2>/dev/null | sed '"'"'s#^/#//#'"'"' || printf '"'"'%%s'"'"' '"'"'%s'"'"' | base64 --decode 2>/dev/null | sed '"'"'s#^/#//#'"'"')"' "$prompt_b64" "$prompt_b64" >> "$EXEC_SCRIPT"
            fi
            echo "" >> "$EXEC_SCRIPT"
        fi

        echo -e "\033[90mDEBUG: Exec script contents:\033[0m"
        cat "$EXEC_SCRIPT" | head -10

        # Execute the script - the /skill string only exists AFTER base64 decode
        # at the exact moment node/claude receives it
        chmod +x "$EXEC_SCRIPT"
        source "$EXEC_SCRIPT"
        EXIT_CODE=$?
        rm -f "$EXEC_SCRIPT"

        # Check exit code:
        # 0 = normal exit (user typed /exit or similar)
        # 130 = SIGINT (Ctrl+C) - Claude handles this, just show prompt
        # Other = error

        echo ""
        if [ $EXIT_CODE -eq 0 ]; then
            echo -e "\033[32mClaude session ended normally.\033[0m"
        elif [ $EXIT_CODE -eq 130 ]; then
            echo -e "\033[33mClaude interrupted (Ctrl+C).\033[0m"
        else
            echo -e "\033[31mClaude exited with code $EXIT_CODE\033[0m"
        fi

        echo ""
        echo -e "\033[36mOptions:\033[0m"
        echo -e "  \033[33mr\033[0m - Restart Claude with same command"
        echo -e "  \033[33mc\033[0m - Start new Claude session (no command)"
        echo -e "  \033[33mq\033[0m - Quit and close terminal"
        echo -e "  \033[33mENTER\033[0m - Stay in bash shell"
        echo ""
        read -p "Choice [r/c/q/ENTER]: " -n 1 choice
        echo ""

        case "$choice" in
            r|R)
                echo -e "\033[32mRestarting Claude...\033[0m"
                continue
                ;;
            c|C)
                echo -e "\033[32mStarting fresh Claude session...\033[0m"
                # Use same logic as main execution - prefer CLI.js
                if [ -n "$CLAUDE_CLI_JS" ] && command -v node &> /dev/null; then
                    if command -v winpty &> /dev/null; then
                        MSYS_NO_PATHCONV=1 winpty node "$CLAUDE_CLI_JS"
                    else
                        MSYS_NO_PATHCONV=1 node "$CLAUDE_CLI_JS"
                    fi
                elif [ -n "$CLAUDE_PATH" ]; then
                    if command -v winpty &> /dev/null; then
                        MSYS_NO_PATHCONV=1 winpty "$CLAUDE_PATH"
                    else
                        MSYS_NO_PATHCONV=1 "$CLAUDE_PATH"
                    fi
                fi
                ;;
            q|Q)
                echo -e "\033[33mExiting...\033[0m"
                exit 0
                ;;
            *)
                echo -e "\033[32mDropping to bash shell. Type '$CLAUDE_PATH' to start a new session.\033[0m"
                return 0
                ;;
        esac
    done
}
SCRIPT_HEADER

cat >> "$TEMP_SCRIPT" << SCRIPT_BODY
cd '$PROJECT_PATH'

# Pass the detected paths to the run_claude function
# This ensures it can find claude even if the new terminal's PATH differs
export CLAUDE_PATH_OVERRIDE='$DETECTED_CLAUDE_PATH'
export CLAUDE_CLI_JS_OVERRIDE='$DETECTED_CLI_JS'

# CRITICAL: Pass prompt via BASE64 to completely avoid MSYS path conversion
# Environment variables can still get converted in some contexts.
# Base64 encoding ensures no path-like strings exist to be converted.
export CLAUDE_PROMPT_OVERRIDE_B64='$SKILL_COMMAND_B64'
export CLAUDE_FLAGS_OVERRIDE='$CLAUDE_FLAGS'

$KILL_CMD
echo -e "\033[32m🚀 Fresh Claude session starting...\033[0m"
echo -e "\033[36mCommand: claude $CLAUDE_FLAGS \"$SKILL_COMMAND\"\033[0m"
echo ""
run_claude
SCRIPT_BODY

chmod +x "$TEMP_SCRIPT"

# =============================================================================
# SPAWN NEW MINTTY WITH MATCHING ELEVATION
# =============================================================================
# When already elevated, child processes inherit admin rights automatically
# No special handling needed - just spawn mintty directly in both cases
#
# Mintty options used:
#   -o AllowSetSelection=yes    - Allow programs to access clipboard
#   -o ScrollbackLines=10000    - Increase scrollback buffer
#   -o ConfirmExit=no           - Don't prompt on close (we handle exit ourselves)
#   -o BellType=0               - Disable terminal bell (less annoying)
#   -o Term=xterm-256color      - Set terminal type for proper escape sequences
#   -o CtrlShiftShortcuts=false - Don't use Ctrl+Shift shortcuts (pass to app)
#   -o AltSendsEsc=true         - Alt key sends Escape prefix (standard behavior)

MINTTY_OPTS="-o AllowSetSelection=yes -o ScrollbackLines=10000 -o ConfirmExit=no -o BellType=0 -o Term=xterm-256color -o CtrlShiftShortcuts=false -o AltSendsEsc=true"

# CRITICAL: Disable the EXIT trap before spawning mintty
# The mintty command handles its own cleanup (rm -f inside -c string)
# If we keep the trap, it fires on exit 0 BEFORE mintty can read the temp file
trap - EXIT INT TERM

if [ "$IS_ADMIN" = "True" ]; then
    # When already elevated, child processes inherit elevation automatically
    # Using -Verb RunAs when already admin can cause issues - just spawn directly
    echo -e "\033[90mSpawning mintty (elevation inherited from parent)...\033[0m"
    "$MINTTY_PATH" $MINTTY_OPTS -e bash -il -c "source '$TEMP_SCRIPT'; rm -f '$TEMP_SCRIPT'; exec bash -il" &
else
    # Spawn regular (non-elevated) mintty directly
    echo -e "\033[90mSpawning mintty directly...\033[0m"
    "$MINTTY_PATH" $MINTTY_OPTS -e bash -il -c "source '$TEMP_SCRIPT'; rm -f '$TEMP_SCRIPT'; exec bash -il" &
fi

exit 0
