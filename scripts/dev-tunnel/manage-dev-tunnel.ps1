# Dev Tunnel Manager
# View status, start, or stop the dev-tunnel (dev.ffxivbe.org)
#
# Usage:
#   .\manage-dev-tunnel.ps1           - Show status
#   .\manage-dev-tunnel.ps1 -Start    - Start the tunnel
#   .\manage-dev-tunnel.ps1 -Stop     - Stop the tunnel
#   .\manage-dev-tunnel.ps1 -Kill     - Force-kill cloudflared processes for this tunnel

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Kill
)

$taskName       = "dev-tunnel"
$tunnelName     = "dev-tunnel"
$hostname       = "dev.ffxivbe.org"
$cloudflaredPath = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$configPath     = Join-Path $env:USERPROFILE ".cloudflared\dev-config.yml"
$idStorePath    = Join-Path $env:USERPROFILE ".cloudflared\dev-tunnel-id.txt"

function Show-Status {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Dev Tunnel Status  ($hostname)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Scheduled task
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        $color = if ($task.State -eq "Running") { "Green" } elseif ($task.State -eq "Ready") { "Yellow" } else { "Red" }
        Write-Host "Scheduled Task : $($task.State)" -ForegroundColor $color
        $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName -ErrorAction SilentlyContinue
        if ($taskInfo.LastRunTime -and $taskInfo.LastRunTime -ne [DateTime]::MinValue) {
            Write-Host "Last Run       : $($taskInfo.LastRunTime)" -ForegroundColor Gray
        }
    } else {
        Write-Host "Scheduled Task : NOT FOUND (run install-dev-tunnel.ps1)" -ForegroundColor Red
    }

    # cloudflared processes
    $procs = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
    if ($procs) {
        Write-Host "Processes      : $($procs.Count) cloudflared process(es) running" -ForegroundColor Green
        foreach ($p in $procs) {
            Write-Host "  PID $($p.Id)  CPU $([Math]::Round($p.CPU, 1))s  Started $($p.StartTime)" -ForegroundColor Gray
        }
    } else {
        Write-Host "Processes      : No cloudflared processes running" -ForegroundColor Red
    }

    # Tunnel ID
    if (Test-Path $idStorePath) {
        $tunnelId = (Get-Content $idStorePath).Trim()
        Write-Host "Tunnel ID      : $tunnelId" -ForegroundColor Gray
    }

    # Config file
    if (Test-Path $configPath) {
        Write-Host "Config         : $configPath" -ForegroundColor Gray
    } else {
        Write-Host "Config         : NOT FOUND - run install-dev-tunnel.ps1" -ForegroundColor Red
    }

    # Connectivity check
    Write-Host ""
    Write-Host "Checking tunnel connection..." -ForegroundColor Gray
    if (Test-Path $cloudflaredPath) {
        $tunnelInfo = & $cloudflaredPath tunnel info $tunnelName 2>&1 | Select-String "CONNECTOR"
        if ($tunnelInfo) {
            Write-Host "Tunnel         : CONNECTED (has connectors)" -ForegroundColor Green
        } else {
            Write-Host "Tunnel         : NOT CONNECTED (no connectors)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  .\manage-dev-tunnel.ps1 -Start   start the tunnel" -ForegroundColor Gray
    Write-Host "  .\manage-dev-tunnel.ps1 -Stop    stop the tunnel" -ForegroundColor Gray
    Write-Host "  .\manage-dev-tunnel.ps1 -Kill    force-kill all cloudflared processes" -ForegroundColor Gray
    Write-Host ""
}

function Start-DevTunnel {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Host "Task '$taskName' not found. Run install-dev-tunnel.ps1 first." -ForegroundColor Red
        exit 1
    }
    if ($task.State -eq "Running") {
        Write-Host "Dev tunnel is already running." -ForegroundColor Yellow
        return
    }
    Start-ScheduledTask -TaskName $taskName
    Write-Host "Dev tunnel started." -ForegroundColor Green
    Start-Sleep -Seconds 3
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    Write-Host "Status: $($task.State)" -ForegroundColor Cyan
}

function Stop-DevTunnel {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Host "Task '$taskName' not found." -ForegroundColor Yellow
    } elseif ($task.State -eq "Running") {
        Stop-ScheduledTask -TaskName $taskName
        Write-Host "Dev tunnel stopped." -ForegroundColor Yellow
    } else {
        Write-Host "Dev tunnel was not running (state: $($task.State))." -ForegroundColor Gray
    }
}

function Kill-DevTunnel {
    $procs = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($p in $procs) {
            Write-Host "Killing PID $($p.Id)..." -ForegroundColor Yellow
            Stop-Process -Id $p.Id -Force
        }
        Write-Host "All cloudflared processes killed." -ForegroundColor Red
    } else {
        Write-Host "No cloudflared processes found." -ForegroundColor Gray
    }

    # Also stop the scheduled task so it doesn't restart immediately
    Stop-DevTunnel
}

# Main
if ($Start) {
    Start-DevTunnel
} elseif ($Stop) {
    Stop-DevTunnel
} elseif ($Kill) {
    Kill-DevTunnel
} else {
    Show-Status
}
