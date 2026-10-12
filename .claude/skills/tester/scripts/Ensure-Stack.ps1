<#
.SYNOPSIS
  Garante Docker + API (:3333) + worker + web (:3001) healthy.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = '',
  [switch]$SkipStart,
  [int]$TimeoutSec = 180
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  param([string]$Hint)
  if ($Hint) { return (Resolve-Path $Hint).Path }
  $root = $PSScriptRoot
  1..4 | ForEach-Object { $root = Split-Path $root -Parent }
  return $root
}

function Test-HttpOk {
  param([Parameter(Mandatory)][string]$Url, [int]$TimeoutSec = 5)
  try {
    $resp = curl.exe -sS -o NUL -w '%{http_code}' --max-time $TimeoutSec $Url 2>$null
    if (-not $resp) { return $false }
    $code = [int]$resp
    return ($code -ge 200 -and $code -lt 500)
  } catch {
    return $false
  }
}

function Wait-HttpOk {
  param([Parameter(Mandatory)][string]$Url, [int]$TimeoutSec = 120, [string]$Label = 'service')
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpOk -Url $Url) {
      Write-Host "OK  $Label  $Url"
      return $true
    }
    Start-Sleep -Seconds 2
  }
  Write-Host "FAIL $Label ainda down: $Url"
  return $false
}

function Start-PnpmDev {
  param(
    [Parameter(Mandatory)][string]$Root,
    [Parameter(Mandatory)][string]$ScriptName,
    [Parameter(Mandatory)][string]$LogPath
  )
  $arg = '/c pnpm ' + $ScriptName + ' > "' + $LogPath + '" 2>&1'
  Start-Process -FilePath 'cmd.exe' -ArgumentList $arg -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
}

$root = Get-RepoRoot -Hint $RepoRoot
$runDir = Join-Path $PSScriptRoot '..\.run'
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

Write-Host '=== Ensure-Stack ==='
Write-Host "Repo: $root"

Push-Location $root
try {
  $compose = Join-Path $root 'docker-compose.yml'
  if (-not (Test-Path $compose)) { throw "docker-compose.yml nao encontrado em $root" }

  if (-not $SkipStart) {
    Write-Host 'docker compose up -d'
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up falhou (exit $LASTEXITCODE)" }
  }

  Write-Host 'aguardando containers healthy (postgres/redis)...'
  $deadline = (Get-Date).AddSeconds([Math]::Min($TimeoutSec, 120))
  do {
    $ps = docker compose ps --format json 2>$null
    $healthyEnough = $true
    if ($ps) {
      $lines = $ps -split "`n" | Where-Object { $_.Trim() }
      foreach ($line in $lines) {
        try {
          $row = $line | ConvertFrom-Json
          $name = [string]$row.Service
          if ($name -in @('postgres', 'redis')) {
            $h = [string]$row.Health
            if ($h -and $h -ne 'healthy') { $healthyEnough = $false }
          }
        } catch {
          # ignore parse noise
        }
      }
    }
    if ($healthyEnough) { break }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  $apiUrl = 'http://localhost:3333/health'
  $webUrl = 'http://localhost:3001/login'

  $apiUp = Test-HttpOk -Url $apiUrl
  $webUp = Test-HttpOk -Url $webUrl

  if ($SkipStart) {
    if (-not $apiUp) { throw 'API down e -SkipStart ativo' }
    if (-not $webUp) { throw 'Frontend down e -SkipStart ativo' }
    Write-Host 'Stack OK (SkipStart)'
    exit 0
  }

  if (-not $apiUp) {
    Write-Host 'subindo pnpm dev:api'
    Start-PnpmDev -Root $root -ScriptName 'dev:api' -LogPath (Join-Path $runDir 'api.log')
  }

  $workerMarker = Join-Path $runDir 'worker.started'
  if (-not (Test-Path $workerMarker) -or -not $apiUp) {
    Write-Host 'subindo pnpm dev:worker'
    Start-PnpmDev -Root $root -ScriptName 'dev:worker' -LogPath (Join-Path $runDir 'worker.log')
    Set-Content -Path $workerMarker -Value (Get-Date).ToString('o')
  }

  if (-not $webUp) {
    Write-Host 'subindo pnpm dev:web'
    Start-PnpmDev -Root $root -ScriptName 'dev:web' -LogPath (Join-Path $runDir 'web.log')
  }

  $okApi = Wait-HttpOk -Url $apiUrl -TimeoutSec $TimeoutSec -Label 'API'
  $okWeb = Wait-HttpOk -Url $webUrl -TimeoutSec $TimeoutSec -Label 'Frontend'
  if (-not $okApi -or -not $okWeb) {
    throw 'Stack nao ficou healthy a tempo. Veja .claude/skills/tester/.run/*.log'
  }

  Write-Host 'Stack OK'
  exit 0
}
finally {
  Pop-Location
}
