param(
  [switch]$Stop,
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$StateDir = Join-Path $RootDir ".tmp"
$StatePath = Join-Path $StateDir "site-prod-public.json"
$LogDir = Join-Path $RootDir ".logs"
$CloudflaredConfig = Join-Path $env:USERPROFILE ".cloudflared\config.yml"

$Apps = @(
  @{ Name = "auth-app"; Port = 5000; Url = $env:NEXT_PUBLIC_AUTH_URL },
  @{ Name = "store"; Port = 5001; Url = $env:NEXT_PUBLIC_STORE_URL },
  @{ Name = "admin"; Port = 5002; Url = $env:NEXT_PUBLIC_ADMIN_URL },
  @{ Name = "playground"; Port = 5003; Url = $env:NEXT_PUBLIC_PLAYGROUND_URL },
  @{ Name = "landing"; Port = 5004; Url = $env:NEXT_PUBLIC_LANDING_URL },
  @{ Name = "payments"; Port = 5005; Url = $env:NEXT_PUBLIC_PAYMENTS_URL },
  @{ Name = "studio"; Port = 5006; Url = $env:NEXT_PUBLIC_STUDIO_URL }
)

function Write-Log($Message) {
  Write-Host "[site-prod-public] $Message"
}

function Stop-ManagedProcess($ManagedProcessId) {
  if (-not $ManagedProcessId) { return }
  try {
    Stop-Process -Id $ManagedProcessId -Force -ErrorAction Stop
  } catch {
    try {
      taskkill /pid $ManagedProcessId /t /f | Out-Null
    } catch {}
  }
}

function Clear-Port($Port) {
  $pids = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $pids) {
    Stop-ManagedProcess $procId
  }
}

function Clear-Cloudflared {
  $procs = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
  foreach ($proc in $procs) {
    Stop-ManagedProcess $proc.Id
  }
}

function Read-State {
  if (-not (Test-Path $StatePath)) { return $null }
  return Get-Content $StatePath -Raw | ConvertFrom-Json
}

function Stop-StateProcesses {
  $state = Read-State
  if ($null -eq $state) { return }
  foreach ($proc in $state.processes) {
    Stop-ManagedProcess $proc.pid
  }
  Remove-Item $StatePath -Force -ErrorAction SilentlyContinue
}

function Ensure-Command($Command, $Hint) {
  if (Get-Command $Command -ErrorAction SilentlyContinue) { return }
  throw "`$Command not found. $Hint"
}

function Start-BackgroundProcess($FilePath, $Arguments, $Name) {
  $outLog = Join-Path $LogDir "$Name.out.log"
  $errLog = Join-Path $LogDir "$Name.err.log"

  return Start-Process `
    -FilePath $FilePath `
    -ArgumentList $Arguments `
    -WorkingDirectory $RootDir `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru
}

Ensure-Command "pnpm" "Install pnpm first."
Ensure-Command "cloudflared.exe" "Install cloudflared first or add it to PATH."

if ($Stop) {
  Stop-StateProcesses
  foreach ($app in $Apps) {
    Clear-Port $app.Port
  }
  Clear-Cloudflared
  Write-Log "Stopped public production processes."
  exit 0
}

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Stop-StateProcesses
foreach ($app in $Apps) {
  Clear-Port $app.Port
}
Clear-Cloudflared

Write-Log "Starting Supabase..."
try {
  & pnpm supabase:start
} catch {
  Write-Log "Supabase start returned non-zero. Continuing because it may already be running."
}
$global:LASTEXITCODE = 0

if (-not $NoBuild) {
  Write-Log "Building all apps..."
  & pnpm build
  $global:LASTEXITCODE = 0
}

$Started = @()
foreach ($app in $Apps) {
  $proc = Start-BackgroundProcess "pnpm.cmd" @("--filter", $app.Name, "start") $app.Name
  $Started += @{ name = $app.Name; pid = $proc.Id; port = $app.Port }
}

if (-not (Test-Path $CloudflaredConfig)) {
  throw "Cloudflared config not found at $CloudflaredConfig"
}

$cloudflared = Start-BackgroundProcess "cloudflared.exe" @("tunnel", "--config", $CloudflaredConfig, "run") "cloudflared"
$Started += @{ name = "cloudflared"; pid = $cloudflared.Id; port = 0 }

$State = @{
  startedAt = (Get-Date).ToString("o")
  processes = $Started
}
$State | ConvertTo-Json -Depth 4 | Set-Content -Path $StatePath

Write-Log "Public production stack is up."
foreach ($app in $Apps) {
  $publicUrl = if ($app.Url) { " -> $($app.Url)" } else { "" }
  Write-Log "$($app.Name): http://127.0.0.1:$($app.Port)$publicUrl"
}
Write-Log "Stop it with: pnpm site:prod:public:stop"
$global:LASTEXITCODE = 0
exit 0
