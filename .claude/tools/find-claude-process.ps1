# Find Claude process and show command line
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine
    if ($cmdLine -match 'anthropic|claude-code') {
        Write-Output "PID: $($_.Id)"
        Write-Output "CMD: $cmdLine"
        Write-Output "---"
    }
}
