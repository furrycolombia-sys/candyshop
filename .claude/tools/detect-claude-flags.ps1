# detect-claude-flags.ps1
# Detects how Claude Code was started and outputs the flags

# Strategy: Try multiple detection methods in order of preference
# 1. Native claude.exe (new method - installed via installer)
# 2. node cli.js (old method - npm global install)

$flags = ""

# Method 1: Look for claude.exe (native executable)
# Note: Allow optional trailing quote for quoted paths (e.g., "C:\Program Files\claude.exe")
$claudeExe = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match '\\claude\.exe(?:"|\s)' -or $_.CommandLine -match '/claude\.exe(?:"|\s)'
}

if ($claudeExe) {
    $process = $claudeExe | Select-Object -First 1
    $cmdLine = $process.CommandLine

    # Extract flags after claude.exe (handle both quoted and unquoted paths)
    # Pattern: claude.exe" [flags] or claude.exe [flags]
    if ($cmdLine -match 'claude\.exe"?\s+(.+)$') {
        $flags = $Matches[1]

        # Remove the prompt/command part (anything in quotes at the end)
        $flags = $flags -replace "'[^']*'$", ""
        $flags = $flags -replace '"[^"]*"$', ""
        $flags = $flags.Trim()
    }
}

# Method 2: Look for node cli.js (npm global install method)
if (-not $flags) {
    $cliJs = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -match 'claude-code.cli\.js' -or $_.CommandLine -match 'claude-code\\cli\.js'
    }

    if ($cliJs) {
        $process = $cliJs | Select-Object -First 1
        $cmdLine = $process.CommandLine

        # Extract flags after cli.js
        if ($cmdLine -match 'cli\.js\s+(.+)$') {
            $flags = $Matches[1]

            # Remove the prompt/command part (anything in quotes at the end)
            $flags = $flags -replace "'[^']*'$", ""
            $flags = $flags -replace '"[^"]*"$', ""
            $flags = $flags.Trim()
        }
    }
}

# Output result
if ($flags) {
    Write-Output $flags
} else {
    Write-Output "NONE"
}
