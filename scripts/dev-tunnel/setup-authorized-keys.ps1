# SSH Authorized Keys Setup
# Reads DEV_SSH_PUBLIC_KEY from .secrets and installs it on this machine.
# Run this whenever a new developer needs SSH access to this PC.
# Automatically elevates to Administrator if needed.
#
# Usage:
#   .\setup-authorized-keys.ps1                  - Install keys from .secrets
#   .\setup-authorized-keys.ps1 -ShowClientSetup - Also print client setup commands

param(
    [switch]$ShowClientSetup
)

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    $scriptPath = $MyInvocation.MyCommand.Path
    $arguments = "-ExecutionPolicy Bypass -File `"$scriptPath`""
    if ($ShowClientSetup) { $arguments += " -ShowClientSetup" }
    Start-Process powershell -Verb RunAs -ArgumentList $arguments -Wait
    exit $LASTEXITCODE
}

try {

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSH Authorized Keys Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot    = Resolve-Path (Join-Path $scriptDir "..\..") | Select-Object -ExpandProperty Path
$secretsPath = Join-Path $repoRoot ".secrets"
$keysPath    = "C:\ProgramData\ssh\administrators_authorized_keys"

# ── Step 1: Read keys from .secrets ─────────────────────────────────────────
Write-Host "[1/3] Reading keys from .secrets..." -ForegroundColor Yellow

if (-not (Test-Path $secretsPath)) {
    Write-Host "  X .secrets file not found at: $secretsPath" -ForegroundColor Red
    Write-Host "  Run 'pnpm sync-secrets' to download it first." -ForegroundColor Gray
    exit 1
}

$keys = @()
$content = Get-Content $secretsPath -Raw
foreach ($line in ($content -split "`n")) {
    $line = $line.Trim()
    if ($line -match '^DEV_SSH_PUBLIC_KEY=(.+)$') {
        $keys += $matches[1].Trim()
        Write-Host "  + DEV_SSH_PUBLIC_KEY" -ForegroundColor Gray
    }
    # Add more DEV_SSH_PUBLIC_KEY_* patterns here as team grows:
    # if ($line -match '^DEV_SSH_PUBLIC_KEY_\w+=(.+)$') { ... }
}

if ($keys.Count -eq 0) {
    Write-Host "  X No DEV_SSH_PUBLIC_KEY found in .secrets" -ForegroundColor Red
    exit 1
}

Write-Host "  OK Found $($keys.Count) key(s)" -ForegroundColor Green

# ── Step 2: Write authorized_keys ────────────────────────────────────────────
Write-Host ""
Write-Host "[2/3] Installing authorized keys..." -ForegroundColor Yellow

if (-not (Test-Path "C:\ProgramData\ssh")) {
    New-Item -ItemType Directory -Path "C:\ProgramData\ssh" -Force | Out-Null
}

[System.IO.File]::WriteAllText($keysPath, ($keys -join "`n") + "`n", [System.Text.UTF8Encoding]::new($false))
icacls $keysPath /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null

Write-Host "  OK Written $($keys.Count) key(s) to:" -ForegroundColor Green
Write-Host "     $keysPath" -ForegroundColor Gray

# ── Step 3: Restart sshd ─────────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Restarting OpenSSH Server..." -ForegroundColor Yellow

Restart-Service sshd
Write-Host "  OK sshd restarted" -ForegroundColor Green

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Keys installed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($ShowClientSetup) {
    Write-Host "CLIENT SETUP COMMANDS" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "Mac / Linux" -ForegroundColor Cyan
    Write-Host "-----------" -ForegroundColor DarkGray
    Write-Host "# 1. Install cloudflared"
    Write-Host "brew install cloudflared                        # Mac"
    Write-Host "curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cf.deb && sudo dpkg -i /tmp/cf.deb   # Ubuntu"
    Write-Host ""
    Write-Host "# 2. Add SSH config (run each line separately)"
    Write-Host 'echo "" >> ~/.ssh/config'
    Write-Host 'echo "Host dev-windows" >> ~/.ssh/config'
    Write-Host 'echo "    HostName dev.ffxivbe.org" >> ~/.ssh/config'
    Write-Host 'echo "    User Heiner" >> ~/.ssh/config'
    Write-Host 'echo "    ProxyCommand cloudflared access ssh --hostname %h" >> ~/.ssh/config'
    Write-Host 'echo "    StrictHostKeyChecking accept-new" >> ~/.ssh/config'
    Write-Host ""
    Write-Host "# 3. Generate SSH key (if you don't have one)"
    Write-Host 'ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519'
    Write-Host ""
    Write-Host "# 4. Send your public key to the Windows PC owner"
    Write-Host 'cat ~/.ssh/id_ed25519.pub'
    Write-Host ""
    Write-Host "# 5. Connect"
    Write-Host "ssh dev-windows"
    Write-Host ""

    Write-Host "Windows (PowerShell)" -ForegroundColor Cyan
    Write-Host "--------------------" -ForegroundColor DarkGray
    Write-Host "# 1. Install cloudflared"
    Write-Host 'Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi" -OutFile "$env:TEMP\cf.msi"; Start-Process msiexec -ArgumentList "/i `"$env:TEMP\cf.msi`" /quiet" -Wait'
    Write-Host ""
    Write-Host "# 2. Add SSH config"
    Write-Host '$c = "$env:USERPROFILE\.ssh\config"; if (!(Test-Path (Split-Path $c))) { New-Item -ItemType Directory -Path (Split-Path $c) -Force }'
    Write-Host 'Add-Content -Path "$env:USERPROFILE\.ssh\config" -Value "`nHost dev-windows`n    HostName dev.ffxivbe.org`n    User Heiner`n    ProxyCommand cloudflared access ssh --hostname %h`n    StrictHostKeyChecking accept-new`n"'
    Write-Host ""
    Write-Host "# 3. Connect"
    Write-Host "ssh dev-windows"
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
