# Dev Tunnel Uninstaller
# Removes the dev-tunnel scheduled task, config files, and optionally deletes the tunnel from Cloudflare
# Automatically elevates to Administrator if needed
#
# Usage:
#   .\uninstall-dev-tunnel.ps1                  - Remove task, config, credentials, shortcut
#   .\uninstall-dev-tunnel.ps1 -DeleteTunnel    - Also delete the tunnel from Cloudflare account

param(
    [switch]$DeleteTunnel
)

$ErrorActionPreference = "Stop"

# Auto-elevate to Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "Elevating to Administrator..." -ForegroundColor Yellow
    Write-Host ""

    $scriptPath = $MyInvocation.MyCommand.Path
    $arguments = "-ExecutionPolicy Bypass -File `"$scriptPath`""
    if ($DeleteTunnel) { $arguments += " -DeleteTunnel" }

    Start-Process powershell -Verb RunAs -ArgumentList $arguments -Wait
    exit $LASTEXITCODE
}

# Wrap everything so errors are visible instead of silently closing the window
try {

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dev Tunnel Uninstaller" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$taskName        = "dev-tunnel"
$tunnelName      = "dev-tunnel"
$cloudflaredPath = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$configDir       = Join-Path $env:USERPROFILE ".cloudflared"
$devConfigPath   = Join-Path $configDir "dev-config.yml"
$idStorePath     = Join-Path $configDir "dev-tunnel-id.txt"

# Resolve desktop path (OneDrive or standard)
$desktop = if (Test-Path "$env:USERPROFILE\OneDrive\Desktop") {
    "$env:USERPROFILE\OneDrive\Desktop"
} elseif (Test-Path "$env:USERPROFILE\Desktop") {
    "$env:USERPROFILE\Desktop"
} else {
    [Environment]::GetFolderPath("Desktop")
}

$shortcutPath = Join-Path $desktop "Toggle Dev Tunnel.lnk"

# ── Step 1: Stop and remove scheduled task ──────────────────────────────────
Write-Host "[1/5] Removing scheduled task..." -ForegroundColor Yellow

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    if ($task.State -eq "Running") {
        Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        Write-Host "  Stopped running task" -ForegroundColor Gray
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "  OK Scheduled task '$taskName' removed" -ForegroundColor Green
} else {
    Write-Host "  Scheduled task '$taskName' not found (already removed)" -ForegroundColor Gray
}

# ── Step 2: Kill any remaining cloudflared processes ────────────────────────
Write-Host ""
Write-Host "[2/5] Stopping cloudflared processes..." -ForegroundColor Yellow

$procs = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if ($procs) {
    foreach ($p in $procs) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Killed PID $($p.Id)" -ForegroundColor Gray
    }
    Write-Host "  OK All cloudflared processes stopped" -ForegroundColor Green
} else {
    Write-Host "  No cloudflared processes were running" -ForegroundColor Gray
}

# ── Step 3: Remove config and credentials ───────────────────────────────────
Write-Host ""
Write-Host "[3/5] Removing tunnel config and credentials..." -ForegroundColor Yellow

# Read tunnel ID before deleting the store file
$tunnelId = $null
if (Test-Path $idStorePath) {
    $tunnelId = (Get-Content $idStorePath).Trim()
}

# Remove dev-config.yml
if (Test-Path $devConfigPath) {
    Remove-Item $devConfigPath -Force
    Write-Host "  OK Removed dev-config.yml" -ForegroundColor Green
} else {
    Write-Host "  dev-config.yml not found (already removed)" -ForegroundColor Gray
}

# Remove credentials file (named after tunnel ID)
if ($tunnelId) {
    $credentialsPath = Join-Path $configDir "$tunnelId.json"
    if (Test-Path $credentialsPath) {
        Remove-Item $credentialsPath -Force
        Write-Host "  OK Removed credentials file ($tunnelId.json)" -ForegroundColor Green
    } else {
        Write-Host "  Credentials file not found (already removed)" -ForegroundColor Gray
    }
}

# Remove tunnel ID store file
if (Test-Path $idStorePath) {
    Remove-Item $idStorePath -Force
    Write-Host "  OK Removed dev-tunnel-id.txt" -ForegroundColor Green
} else {
    Write-Host "  dev-tunnel-id.txt not found (already removed)" -ForegroundColor Gray
}

# ── Step 4: Remove desktop shortcut ─────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Removing desktop shortcut..." -ForegroundColor Yellow

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "  OK Removed 'Toggle Dev Tunnel' shortcut" -ForegroundColor Green
} else {
    Write-Host "  Desktop shortcut not found (already removed)" -ForegroundColor Gray
}

# ── Step 5: Delete tunnel from Cloudflare (optional) ────────────────────────
Write-Host ""
Write-Host "[5/5] Cloudflare tunnel deletion..." -ForegroundColor Yellow

if ($DeleteTunnel) {
    if (-not (Test-Path $cloudflaredPath)) {
        Write-Host "  X cloudflared.exe not found — cannot delete tunnel from Cloudflare" -ForegroundColor Red
    } elseif (-not $tunnelId) {
        Write-Host "  No tunnel ID found — attempting to find '$tunnelName' by name..." -ForegroundColor Gray
        $tunnelList = & $cloudflaredPath tunnel list 2>&1
        $match = [regex]::Match($tunnelList, "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s+$tunnelName")
        if ($match.Success) {
            $tunnelId = $match.Groups[1].Value
        }
    }

    if ($tunnelId) {
        Write-Host "  Deleting tunnel $tunnelId from Cloudflare..." -ForegroundColor Gray
        $output = & $cloudflaredPath tunnel delete $tunnelName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK Tunnel '$tunnelName' deleted from Cloudflare account" -ForegroundColor Green
        } else {
            Write-Host "  X Failed to delete tunnel: $output" -ForegroundColor Red
            Write-Host "  You may need to delete it manually at: https://one.dash.cloudflare.com/" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Could not find tunnel '$tunnelName' in Cloudflare account" -ForegroundColor Gray
    }
} else {
    Write-Host "  Skipped (tunnel kept in Cloudflare account)" -ForegroundColor Gray
    Write-Host "  To also delete from Cloudflare: .\uninstall-dev-tunnel.ps1 -DeleteTunnel" -ForegroundColor Gray
}

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Uninstall Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Removed:" -ForegroundColor White
Write-Host "  - Scheduled task 'dev-tunnel'" -ForegroundColor Gray
Write-Host "  - cloudflared processes" -ForegroundColor Gray
Write-Host "  - dev-config.yml" -ForegroundColor Gray
Write-Host "  - Tunnel credentials file" -ForegroundColor Gray
Write-Host "  - dev-tunnel-id.txt" -ForegroundColor Gray
Write-Host "  - Desktop shortcut" -ForegroundColor Gray
Write-Host ""
Write-Host "NOT removed (shared with other tunnels):" -ForegroundColor White
Write-Host "  - cloudflared.exe (used by web + SSH tunnels)" -ForegroundColor Gray
Write-Host "  - OpenSSH Server (system feature)" -ForegroundColor Gray
Write-Host "  - ~/.cloudflared/config.yml (web tunnel)" -ForegroundColor Gray
Write-Host "  - ~/.cloudflared/ssh-config.yml (SSH tunnel)" -ForegroundColor Gray
if (-not $DeleteTunnel) {
    Write-Host "  - Tunnel entry in Cloudflare account (use -DeleteTunnel to remove)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "To reinstall: .\install-dev-tunnel.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "UNINSTALL FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
