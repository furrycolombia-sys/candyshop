# Dev Tunnel Auto-Installer
# VS Code Remote SSH access via Cloudflare Tunnel at dev.ffxivbe.org
# Automatically elevates to Administrator if needed

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "Elevating to Administrator..." -ForegroundColor Yellow
    Write-Host ""
    $scriptPath = $MyInvocation.MyCommand.Path
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`"" -Wait
    exit $LASTEXITCODE
}

try {

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dev Tunnel Auto-Installer" -ForegroundColor Green
Write-Host "VS Code Remote SSH via dev.ffxivbe.org" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$devTunnelName   = "dev-tunnel"
$devHostname     = "dev.ffxivbe.org"
$cloudflaredPath = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$configDir       = Join-Path $env:USERPROFILE ".cloudflared"
$idStorePath     = Join-Path $configDir "dev-tunnel-id.txt"
$scriptDir       = Split-Path -Parent $MyInvocation.MyCommand.Path
$secretsPath     = Join-Path (Resolve-Path (Join-Path $scriptDir "..\..")) ".secrets"

# ── Step 1: Check/Install cloudflared ────────────────────────────────────────
Write-Host "[1/6] Checking cloudflared..." -ForegroundColor Yellow

# MUST use official MSI path (not Chocolatey) for Smart App Control compatibility
if (Test-Path $cloudflaredPath) {
    $cfVersion = & $cloudflaredPath --version 2>&1
    Write-Host "  OK Cloudflared: $cfVersion" -ForegroundColor Green
} else {
    Write-Host "  Cloudflared not found, installing from official MSI..." -ForegroundColor Yellow
    Write-Host "  (Using official MSI for Smart App Control compatibility)" -ForegroundColor Gray

    $msiPath = "$env:TEMP\cloudflared.msi"
    Write-Host "  Downloading..." -ForegroundColor Gray
    Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi' -OutFile $msiPath
    Write-Host "  Installing..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList '/i', $msiPath, '/quiet', '/norestart' -Wait
    Remove-Item $msiPath -Force -ErrorAction SilentlyContinue

    if (Test-Path $cloudflaredPath) {
        $cfVersion = & $cloudflaredPath --version 2>&1
        Write-Host "  OK Cloudflared installed: $cfVersion" -ForegroundColor Green
    } else {
        Write-Host "  X Failed to install cloudflared" -ForegroundColor Red
        exit 1
    }
}

# ── Step 2: Configure OpenSSH Server ─────────────────────────────────────────
Write-Host ""
Write-Host "[2/6] Configuring OpenSSH Server..." -ForegroundColor Yellow

$sshCapability = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
if ($sshCapability.State -eq "Installed") {
    Write-Host "  OK OpenSSH Server already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing OpenSSH Server..." -ForegroundColor Gray
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    Write-Host "  OK OpenSSH Server installed" -ForegroundColor Green
}

# Ensure service is running and auto-starts
$sshdService = Get-Service -Name sshd -ErrorAction SilentlyContinue
if ($sshdService.Status -ne "Running") { Start-Service sshd }
Set-Service -Name sshd -StartupType Automatic
Write-Host "  OK SSH service running and auto-start enabled" -ForegroundColor Green

# Ensure firewall rule covers all profiles
$firewallRule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
if ($firewallRule) {
    Set-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -Profile Any
} else {
    New-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -Profile Any
}
Write-Host "  OK Firewall rule set for all profiles" -ForegroundColor Green

# Enable PubkeyAuthentication explicitly (default is yes but be explicit for reliability)
$sshdConfig = "C:\ProgramData\ssh\sshd_config"
$sshdContent = Get-Content $sshdConfig -Raw
if ($sshdContent -notmatch '^PubkeyAuthentication yes') {
    $sshdContent = $sshdContent -replace '#PubkeyAuthentication yes', 'PubkeyAuthentication yes'
    [System.IO.File]::WriteAllText($sshdConfig, $sshdContent, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  OK PubkeyAuthentication enabled in sshd_config" -ForegroundColor Green
} else {
    Write-Host "  OK PubkeyAuthentication already enabled" -ForegroundColor Green
}

# ── Step 3: Create or reuse dev-tunnel ───────────────────────────────────────
Write-Host ""
Write-Host "[3/6] Setting up dev-tunnel..." -ForegroundColor Yellow

if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }

$devTunnelId = $null
if (Test-Path $idStorePath) {
    $devTunnelId = (Get-Content $idStorePath).Trim()
    Write-Host "  Found stored tunnel ID: $devTunnelId" -ForegroundColor Gray
}

$tunnelListRaw = & $cloudflaredPath tunnel list 2>&1
$tunnelList    = $tunnelListRaw -join "`n"
$tunnelExists  = $false

if ($devTunnelId -and ($tunnelList -match [regex]::Escape($devTunnelId))) {
    $tunnelExists = $true
    Write-Host "  OK Tunnel exists: $devTunnelId" -ForegroundColor Green
} elseif ($tunnelList -match [regex]::Escape($devTunnelName)) {
    $match = [regex]::Match($tunnelList, "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\s+$([regex]::Escape($devTunnelName))")
    if ($match.Success) {
        $devTunnelId = $match.Groups[1].Value
        Set-Content -Path $idStorePath -Value $devTunnelId
        $tunnelExists = $true
        Write-Host "  OK Tunnel found by name, ID: $devTunnelId" -ForegroundColor Green
    }
}

if (-not $tunnelExists) {
    Write-Host "  Creating new tunnel: $devTunnelName..." -ForegroundColor Gray
    $createOutput = & $cloudflaredPath tunnel create $devTunnelName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X Failed to create tunnel: $createOutput" -ForegroundColor Red
        exit 1
    }
    if ($createOutput -match "([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})") {
        $devTunnelId = $matches[1]
        Set-Content -Path $idStorePath -Value $devTunnelId
        Write-Host "  OK Tunnel created: $devTunnelId" -ForegroundColor Green
    } else {
        Write-Host "  X Could not extract tunnel ID from output: $createOutput" -ForegroundColor Red
        exit 1
    }
}

# ── Step 4: Create dev-config.yml ────────────────────────────────────────────
Write-Host ""
Write-Host "[4/6] Creating dev tunnel configuration..." -ForegroundColor Yellow

$devConfigPath    = Join-Path $configDir "dev-config.yml"
$credentialsPath  = Join-Path $configDir "$devTunnelId.json"

$devConfigContent = @"
tunnel: $devTunnelId
credentials-file: $credentialsPath
protocol: http2

ingress:
  - hostname: $devHostname
    service: ssh://localhost:22
  - service: http_status:404
"@

Set-Content -Path $devConfigPath -Value $devConfigContent
Write-Host "  OK Config created: $devConfigPath" -ForegroundColor Green

if (-not (Test-Path $credentialsPath)) {
    Write-Host "  Credentials file not found, generating from tunnel token..." -ForegroundColor Gray
    $token = & $cloudflaredPath tunnel token $devTunnelName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X Failed to get tunnel token: $token" -ForegroundColor Red
        exit 1
    }
    try {
        $tokenJson = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($token.Trim()))
        $tokenData = $tokenJson | ConvertFrom-Json
        $credentials = @{ AccountTag = $tokenData.a; TunnelSecret = $tokenData.s; TunnelID = $tokenData.t } | ConvertTo-Json
        Set-Content -Path $credentialsPath -Value $credentials
        Write-Host "  OK Credentials file created: $credentialsPath" -ForegroundColor Green
    } catch {
        Write-Host "  X Failed to decode tunnel token: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  OK Credentials file exists: $credentialsPath" -ForegroundColor Green
}

# ── Step 5: Install authorized SSH keys ──────────────────────────────────────
Write-Host ""
Write-Host "[5/6] Installing authorized SSH keys..." -ForegroundColor Yellow

$adminKeysPath = "C:\ProgramData\ssh\administrators_authorized_keys"
$userKeysPath  = "C:\Users\$env:USERNAME\.ssh\authorized_keys"
$userSshDir    = "C:\Users\$env:USERNAME\.ssh"

if (Test-Path $secretsPath) {
    $keys = @()
    foreach ($line in (Get-Content $secretsPath)) {
        if ($line -match '^DEV_SSH_PUBLIC_KEY\w*=(.+)$') {
            $keys += $matches[1].Trim()
        }
    }

    if ($keys.Count -gt 0) {
        $keyContent = ($keys -join "`n") + "`n"

        # Write to administrators_authorized_keys (used for admin accounts)
        if (-not (Test-Path "C:\ProgramData\ssh")) { New-Item -ItemType Directory -Path "C:\ProgramData\ssh" -Force | Out-Null }
        [System.IO.File]::WriteAllText($adminKeysPath, $keyContent, [System.Text.UTF8Encoding]::new($false))
        icacls $adminKeysPath /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" | Out-Null

        # Also write to user's .ssh/authorized_keys as fallback
        if (-not (Test-Path $userSshDir)) { New-Item -ItemType Directory -Path $userSshDir -Force | Out-Null }
        [System.IO.File]::WriteAllText($userKeysPath, $keyContent, [System.Text.UTF8Encoding]::new($false))

        Restart-Service sshd
        Write-Host "  OK Installed $($keys.Count) SSH key(s) from .secrets" -ForegroundColor Green
    } else {
        Write-Host "  No DEV_SSH_PUBLIC_KEY entries in .secrets — skipping" -ForegroundColor Gray
        Write-Host "  Run .\setup-authorized-keys.ps1 after adding keys" -ForegroundColor Gray
    }
} else {
    Write-Host "  .secrets not found — skipping SSH key setup" -ForegroundColor Gray
    Write-Host "  Run .\setup-authorized-keys.ps1 after running pnpm sync-secrets" -ForegroundColor Gray
}

# ── Step 6: Create scheduled task ────────────────────────────────────────────
Write-Host ""
Write-Host "[6/6] Creating scheduled task..." -ForegroundColor Yellow

$taskName = "dev-tunnel"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action    = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -Command `"& '$cloudflaredPath' tunnel --config '$devConfigPath' run $devTunnelName`""
$trigger   = New-ScheduledTaskTrigger -AtLogOn
$settings  = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -Hidden
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Dev SSH Tunnel for $devHostname (VS Code Remote)" | Out-Null
Write-Host "  OK Scheduled task installed: $taskName" -ForegroundColor Green

Start-ScheduledTask -TaskName $taskName
Write-Host "  OK Task started" -ForegroundColor Green

# Desktop shortcut
$desktop = if (Test-Path "$env:USERPROFILE\OneDrive\Desktop") {
    "$env:USERPROFILE\OneDrive\Desktop"
} elseif (Test-Path "$env:USERPROFILE\Desktop") {
    "$env:USERPROFILE\Desktop"
} else {
    [Environment]::GetFolderPath("Desktop")
}
$togglePath = Join-Path $scriptDir "toggle-dev-tunnel.bat"
if (Test-Path $togglePath) {
    $ws = New-Object -ComObject WScript.Shell
    $shortcut = $ws.CreateShortcut("$desktop\Toggle Dev Tunnel.lnk")
    $shortcut.TargetPath      = $togglePath
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.IconLocation    = "shell32.dll,144"
    $shortcut.Description     = "Toggle Dev SSH Tunnel (Start/Stop)"
    $shortcut.Save()
    Write-Host "  OK Desktop shortcut created" -ForegroundColor Green
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tunnel ID: $devTunnelId" -ForegroundColor White
Write-Host ""

Write-Host "Waiting 10 seconds for tunnel to connect..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$taskStatus = (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue).State
Write-Host "Dev Tunnel Status: $taskStatus" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "MANUAL STEPS REQUIRED (Cloudflare Dashboard)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. DNS Record:" -ForegroundColor White
Write-Host "   - Go to: https://dash.cloudflare.com/ -> ffxivbe.org -> DNS -> Records" -ForegroundColor Gray
Write-Host "   - Add CNAME: dev -> $devTunnelId.cfargotunnel.com" -ForegroundColor Gray
Write-Host "   - Proxy: Enabled (orange cloud)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. WAF Bypass Rule:" -ForegroundColor White
Write-Host "   - Go to: https://dash.cloudflare.com/ -> ffxivbe.org -> Security -> WAF" -ForegroundColor Gray
Write-Host "   - Create rule: Hostname equals $devHostname -> Skip all WAF components" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "CLIENT SETUP (run on each connecting PC)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Mac / Linux:" -ForegroundColor White
Write-Host "  brew install cloudflared                     # Mac" -ForegroundColor Gray
Write-Host '  echo "" >> ~/.ssh/config' -ForegroundColor Gray
Write-Host '  echo "Host dev-windows" >> ~/.ssh/config' -ForegroundColor Gray
Write-Host "  echo `"    HostName $devHostname`" >> ~/.ssh/config" -ForegroundColor Gray
Write-Host '  echo "    User Heiner" >> ~/.ssh/config' -ForegroundColor Gray
Write-Host '  echo "    ProxyCommand cloudflared access ssh --hostname %h" >> ~/.ssh/config' -ForegroundColor Gray
Write-Host '  echo "    StrictHostKeyChecking accept-new" >> ~/.ssh/config' -ForegroundColor Gray
Write-Host '  ssh dev-windows' -ForegroundColor Gray
Write-Host ""
Write-Host "Windows (PowerShell):" -ForegroundColor White
Write-Host "  winget install Cloudflare.cloudflared" -ForegroundColor Gray
Write-Host "  `$c = `"`$env:USERPROFILE\.ssh\config`"" -ForegroundColor Gray
Write-Host "  if (!(Test-Path (Split-Path `$c))) { New-Item -ItemType Directory -Path (Split-Path `$c) -Force }" -ForegroundColor Gray
Write-Host "  Add-Content `$c \`"`nHost dev-windows\`n    HostName $devHostname\`n    User Heiner\`n    ProxyCommand cloudflared access ssh --hostname %h\`n    StrictHostKeyChecking accept-new\`n\`"" -ForegroundColor Gray
Write-Host "  ssh dev-windows" -ForegroundColor Gray
Write-Host ""
Write-Host "Full instructions: DEV_CLIENT_SETUP.md in this folder" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "INSTALLATION FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
