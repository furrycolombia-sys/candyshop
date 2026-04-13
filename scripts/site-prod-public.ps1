param(
  [switch]$Stop,
  [switch]$NoBuild,
  [switch]$Fresh
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$NodeScript = Join-Path $ScriptDir "site-prod.mjs"
$CloudflareConfig = Join-Path $RootDir "docker\cloudflared-candystore.generated.yml"
$CloudflareOutLog = Join-Path $RootDir ".tmp-cloudflared-domain.out.log"
$CloudflareErrLog = Join-Path $RootDir ".tmp-cloudflared-domain.err.log"

function Resolve-PublicHost {
  param(
    [string]$ExplicitValue,
    [string]$Prefix,
    [switch]$UseBaseDomain
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitValue)) {
    return $ExplicitValue.Trim()
  }

  $baseDomain = if ($env:PUBLIC_BASE_DOMAIN) { $env:PUBLIC_BASE_DOMAIN.Trim() } else { "ffxivbe.org" }
  if ($UseBaseDomain) {
    return $baseDomain
  }

  return "$Prefix.$baseDomain"
}

$RootHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_ROOT_HOST -UseBaseDomain
$WwwHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_WWW_HOST -Prefix "www"
$LandingHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_LANDING_HOST -Prefix "landing"
$AuthHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_AUTH_HOST -Prefix "auth"
$StoreHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_STORE_HOST -Prefix "store"
$AdminHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_ADMIN_HOST -Prefix "admin"
$PlaygroundHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_PLAYGROUND_HOST -Prefix "playground"
$PaymentsHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_PAYMENTS_HOST -Prefix "payments"
$StudioHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_STUDIO_HOST -Prefix "studio"
$SupabaseHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_SUPABASE_HOST -Prefix "supabase"
$SupabaseStudioHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_SUPABASE_STUDIO_HOST -Prefix "supabase-studio"
$MailpitHost = Resolve-PublicHost -ExplicitValue $env:PUBLIC_MAILPIT_HOST -Prefix "mailpit"
$PublicOrigin = if ($env:SITE_PUBLIC_ORIGIN) { $env:SITE_PUBLIC_ORIGIN } else { "https://$StoreHost" }

function Stop-CandystoreCloudflareTunnel {
  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like "*cloudflared-candystore.generated.yml*" } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Write-CloudflareConfig {
  $lines = @(
    "tunnel: c552cb9c-62bd-4c8b-9ec6-16627b1b8af3",
    "credentials-file: C:\Users\Heiner\.cloudflared\c552cb9c-62bd-4c8b-9ec6-16627b1b8af3.json",
    "protocol: http2",
    "",
    "ingress:",
    "  - hostname: $RootHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_ROOT) { $env:CLOUDFLARE_SERVICE_ROOT } else { 'http://127.0.0.1:9000' })",
    "  - hostname: $WwwHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_WWW) { $env:CLOUDFLARE_SERVICE_WWW } else { 'http://127.0.0.1:9000' })",
    "  - hostname: $LandingHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_LANDING) { $env:CLOUDFLARE_SERVICE_LANDING } else { 'http://127.0.0.1:5004' })",
    "  - hostname: $AuthHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_AUTH) { $env:CLOUDFLARE_SERVICE_AUTH } else { 'http://127.0.0.1:5000' })",
    "  - hostname: $StoreHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_STORE) { $env:CLOUDFLARE_SERVICE_STORE } else { 'http://127.0.0.1:8088' })",
    "  - hostname: $AdminHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_ADMIN) { $env:CLOUDFLARE_SERVICE_ADMIN } else { 'http://127.0.0.1:5002' })",
    "  - hostname: $PlaygroundHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_PLAYGROUND) { $env:CLOUDFLARE_SERVICE_PLAYGROUND } else { 'http://127.0.0.1:5003' })",
    "  - hostname: $PaymentsHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_PAYMENTS) { $env:CLOUDFLARE_SERVICE_PAYMENTS } else { 'http://127.0.0.1:5005' })",
    "  - hostname: $StudioHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_STUDIO) { $env:CLOUDFLARE_SERVICE_STUDIO } else { 'http://127.0.0.1:5006' })",
    "  - hostname: $SupabaseHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_SUPABASE) { $env:CLOUDFLARE_SERVICE_SUPABASE } else { 'http://127.0.0.1:54321' })",
    "  - hostname: $SupabaseStudioHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_SUPABASE_STUDIO) { $env:CLOUDFLARE_SERVICE_SUPABASE_STUDIO } else { 'http://127.0.0.1:54323' })",
    "  - hostname: $MailpitHost",
    "    service: $(if ($env:CLOUDFLARE_SERVICE_MAILPIT) { $env:CLOUDFLARE_SERVICE_MAILPIT } else { 'http://127.0.0.1:54324' })",
    "  - service: http_status:404"
  )

  Set-Content -Path $CloudflareConfig -Value $lines
}

function Wait-ForPublicHealth {
  param(
    [string]$Url
  )

  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing $Url
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
      Start-Sleep -Seconds 2
      continue
    }

    Start-Sleep -Seconds 2
  }

  throw "Public health check did not reach 200 at $Url within 2 minutes."
}

if ($Stop) {
  Write-Host "[site-prod-public] Stopping named Cloudflare tunnel..."
  Stop-CandystoreCloudflareTunnel
  Write-Host "[site-prod-public] Stopping Docker production stack..."
  & node $NodeScript --stop
  exit $LASTEXITCODE
}

$env:SITE_PUBLIC_ORIGIN = $PublicOrigin
$env:SUPABASE_AUTH_SITE_URL = "https://$StoreHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_AUTH = "https://$AuthHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_STORE = "https://$StoreHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_ADMIN = "https://$AdminHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_PAYMENTS = "https://$PaymentsHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_PLAYGROUND = "https://$PlaygroundHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_LANDING = "https://$LandingHost/auth/callback"
$env:SUPABASE_AUTH_REDIRECT_URL_STUDIO = "https://$StudioHost/auth/callback"
$env:SUPABASE_AUTH_EXTERNAL_REDIRECT_URI = "https://$SupabaseHost/auth/v1/callback"

if ([string]::IsNullOrWhiteSpace($env:NEXT_PUBLIC_ENABLE_TEST_IDS)) {
  $env:NEXT_PUBLIC_ENABLE_TEST_IDS = "true"
}

if (
  ($env:AUTH_PROVIDER_MODE -eq "supabase" -or [string]::IsNullOrWhiteSpace($env:AUTH_PROVIDER_MODE)) -and
  ([string]::IsNullOrWhiteSpace($env:NEXT_PUBLIC_SUPABASE_URL) -or
   $env:NEXT_PUBLIC_SUPABASE_URL -match "^https?://(localhost|127\.0\.0\.1)(:\d+)?/?$")
) {
  $env:NEXT_PUBLIC_SUPABASE_URL = "https://$SupabaseHost"
}

$ArgsList = @()
if ($NoBuild) {
  $ArgsList += "--no-build"
}
if ($Fresh) {
  $ArgsList += "--fresh"
}

Write-Host "[site-prod-public] Building and starting Docker production stack..."
& node $NodeScript @ArgsList
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "[site-prod-public] Restarting named Cloudflare tunnel..."
Stop-CandystoreCloudflareTunnel
Start-Sleep -Seconds 2
Write-CloudflareConfig

foreach ($logPath in @($CloudflareOutLog, $CloudflareErrLog)) {
  if (Test-Path $logPath) {
    try {
      Remove-Item $logPath -Force -ErrorAction Stop
    } catch {
      Write-Host "[site-prod-public] Skipping locked log file: $logPath"
    }
  }
}

$command = 'cloudflared --config "' + $CloudflareConfig + '" tunnel run ffxivbe-tunnel 1>"' + $CloudflareOutLog + '" 2>"' + $CloudflareErrLog + '"'
Start-Process -FilePath "cmd.exe" -ArgumentList "/d", "/s", "/c", $command -WorkingDirectory $RootDir | Out-Null

Wait-ForPublicHealth "$PublicOrigin/health"

Write-Host "[site-prod-public] Public site is live:"
Write-Host "[site-prod-public]   $PublicOrigin"
Write-Host "[site-prod-public]   $PublicOrigin/store"
Write-Host "[site-prod-public]   $PublicOrigin/auth"
