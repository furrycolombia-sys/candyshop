param(
  [string]$RepoPath = "Z:\Github\candystore",
  [string]$TunnelToken = "",
  [string]$TunnelName = "",
  [string]$TunnelArgs = "",
  [string]$CloudflaredBin = "cloudflared.exe",
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[setup-machine] $Message"
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Command([string]$Name, [string]$InstallHint) {
  if (-not (Test-Command $Name)) {
    throw "Missing required command '$Name'. $InstallHint"
  }
}

function Run-Step([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory) {
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
  }
}

Write-Step "Validating local tooling"

Ensure-Command "git" "Install Git for Windows first."
Ensure-Command "node" "Install Node.js first."
Ensure-Command "pnpm" "Enable Corepack or install pnpm globally."
Ensure-Command $CloudflaredBin "Install Cloudflare Tunnel first."

if (-not (Test-Path $RepoPath)) {
  throw "Repo path '$RepoPath' does not exist."
}

Set-Location $RepoPath

if (-not $SkipInstall) {
  Write-Step "Installing workspace dependencies"
  Run-Step "pnpm" @("install") $RepoPath
}

$setupArgs = @("setup:cloudflare")

if ($TunnelToken) {
  $setupArgs += @("--token", $TunnelToken)
} elseif ($TunnelName) {
  $setupArgs += @("--name", $TunnelName)
} elseif ($TunnelArgs) {
  $setupArgs += @("--args", $TunnelArgs)
} else {
  throw "Provide -TunnelToken, -TunnelName, or -TunnelArgs."
}

if ($CloudflaredBin) {
  $setupArgs += @("--bin", $CloudflaredBin)
}

Write-Step "Persisting Cloudflare tunnel configuration"
Run-Step "pnpm" $setupArgs $RepoPath

Write-Step "Machine ready"
Write-Host ""
Write-Host "Next command to bring the public stack up:"
Write-Host "  pnpm dev:up:tunnel"
