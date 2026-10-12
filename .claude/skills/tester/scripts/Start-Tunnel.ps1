<#
.SYNOPSIS
  Abre localtunnel para API (:3333) e frontend (:3001).
#>
[CmdletBinding()]
param(
  [int]$ApiPort = 3333,
  [int]$WebPort = 3001
)

$ErrorActionPreference = 'Stop'
$runDir = Join-Path $PSScriptRoot '../.run'
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

function Start-LocalTunnel {
  param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Name)

  $log = Join-Path $runDir "tunnel-$Name.log"
  $pidFile = Join-Path $runDir "tunnel-$Name.pid"
  if (Test-Path $log) { Remove-Item $log -Force }

  # npx localtunnel imprime "your url is: https://...."
  $proc = Start-Process -FilePath 'npx' `
    -ArgumentList @('--yes', 'localtunnel', '--port', "$Port") `
    -RedirectStandardOutput $log -RedirectStandardError $log `
    -WindowStyle Hidden -PassThru
  Set-Content -Path $pidFile -Value $proc.Id

  $url = $null
  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    if (Test-Path $log) {
      $text = Get-Content -Path $log -Raw -ErrorAction SilentlyContinue
      if ($text -match 'https://[a-zA-Z0-9.-]+\.(loca\.lt|localtunnel\.me)[^\s]*') {
        $url = $Matches[0].TrimEnd('/', '.')
        break
      }
      if ($text -match 'your url is:\s*(https://\S+)') {
        $url = $Matches[1].Trim()
        break
      }
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $url) {
    throw "localtunnel ($Name / :$Port) não publicou URL a tempo. Log: $log"
  }

  return [pscustomobject]@{ Name = $Name; Port = $Port; Url = $url; Pid = $proc.Id }
}

Write-Host '=== Start-Tunnel (localtunnel) ==='
$api = Start-LocalTunnel -Port $ApiPort -Name 'api'
$web = Start-LocalTunnel -Port $WebPort -Name 'web'

$payload = [ordered]@{
  tool      = 'localtunnel'
  startedAt = (Get-Date).ToString('o')
  api       = @{ port = $api.Port; url = $api.Url; pid = $api.Pid }
  web       = @{ port = $web.Port; url = $web.Url; pid = $web.Pid }
  webhookHint = "$($api.Url)/api/v1/webhooks/whatsapp"
}

$out = Join-Path $runDir 'tunnel.json'
$payload | ConvertTo-Json -Depth 5 | Set-Content -Path $out -Encoding utf8

Write-Host "API  $($api.Url)"
Write-Host "WEB  $($web.Url)"
Write-Host "Webhook hint: $($payload.webhookHint)"
Write-Host "Salvo: $out"
