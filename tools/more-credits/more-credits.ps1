# Relaunch Claude Code against a local FreeLLMAPI router (github.com/tashfeenahmed/freellmapi).
# Usage:  powershell -ExecutionPolicy Bypass -File "$HOME\.claude\skills\more-credits\more-credits.ps1" [-Url http://localhost:3001] [-Key <unified key>]
# The key can also live in the env var FREELLMAPI_KEY (never in a repo).
param([string]$Url = "", [string]$Key = $env:FREELLMAPI_KEY)
$candidates = if ($Url) { @($Url) } else { @("http://localhost:3001", "http://127.0.0.1:31415", "http://localhost:20128") }
$base = $null
foreach ($u in $candidates) {
  try { Invoke-WebRequest -UseBasicParsing "$u/v1/models" -Headers @{ Authorization = "Bearer $Key" } -TimeoutSec 5 | Out-Null; $base = $u; break } catch {
    if ($_.Exception.Response) { $base = $u; break }   # router answered (even 401) = it is running
  }
}
if (-not $base) {
  Write-Host "No free router is running. Start FreeLLMAPI (tray app / Docker) or OmniRoute (omniroute), then rerun." -ForegroundColor Yellow
  Write-Host "Install: https://github.com/tashfeenahmed/freellmapi/releases/latest (Windows .exe)" ; exit 1
}
if (-not $Key) { Write-Host "Set FREELLMAPI_KEY to the unified key from the FreeLLMAPI dashboard (or pass -Key)." -ForegroundColor Yellow; exit 1 }
Write-Host "Claude Code -> FreeLLMAPI at $base (free-tier models; answers come from other providers, not Claude)" -ForegroundColor Cyan
$env:ANTHROPIC_BASE_URL = $base
$env:ANTHROPIC_AUTH_TOKEN = $Key
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
claude @args
