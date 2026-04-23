$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$toolRoot = Join-Path $repoRoot ".tools\\livekit"
$version = "1.11.0"
$zipName = "livekit_${version}_windows_amd64.zip"
$downloadUrl = "https://github.com/livekit/livekit/releases/download/v$version/$zipName"
$zipPath = Join-Path $toolRoot $zipName
$extractDir = Join-Path $toolRoot $version
$exePath = Join-Path $extractDir "livekit-server.exe"
$logDir = Join-Path $toolRoot "logs"
$stdoutLog = Join-Path $logDir "livekit.out.log"
$stderrLog = Join-Path $logDir "livekit.err.log"
$hostInfoPath = Join-Path $toolRoot "livekit-host.txt"

function Get-PreferredIPv4 {
  $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, InterfaceMetric |
    Select-Object -First 1

  if ($defaultRoute) {
    $candidate = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
      Select-Object -First 1

    if ($candidate) {
      return $candidate.IPAddress
    }
  }

  $fallback = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
    Select-Object -First 1

  if ($fallback) {
    return $fallback.IPAddress
  }

  return "127.0.0.1"
}

New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$nodeIp = Get-PreferredIPv4
$url = "ws://$nodeIp`:7880"
Set-Content -Path $hostInfoPath -Value $url -Encoding UTF8

$existing = Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq "livekit-server.exe" -and $_.CommandLine -match "--dev" } |
  Select-Object -First 1

if ($existing) {
  Write-Output "LiveKit server already running (PID $($existing.ProcessId))."
  Write-Output "URL: $url"
  exit 0
}

if (-not (Test-Path $exePath)) {
  Write-Output "Downloading LiveKit server $version..."
  Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

  if (Test-Path $extractDir) {
    Remove-Item -LiteralPath $extractDir -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force
}

if (-not (Test-Path $exePath)) {
  throw "LiveKit server executable was not found after extraction."
}

Remove-Item -LiteralPath $stdoutLog -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $stderrLog -ErrorAction SilentlyContinue

$process = Start-Process `
  -FilePath $exePath `
  -ArgumentList "--dev","--bind","0.0.0.0","--node-ip",$nodeIp `
  -WorkingDirectory $extractDir `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

Start-Sleep -Seconds 2

if ($process.HasExited) {
  $stderr = if (Test-Path $stderrLog) { Get-Content $stderrLog -Raw } else { "" }
  throw "LiveKit server exited immediately. $stderr"
}

Write-Output "LiveKit server started (PID $($process.Id))."
Write-Output "URL: $url"
