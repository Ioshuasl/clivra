<#
.SYNOPSIS
  Encerra processos localtunnel gravados em .run/tunnel-*.pid
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$runDir = Join-Path $PSScriptRoot '../.run'

Write-Host '=== Stop-Tunnel ==='
foreach ($name in @('api', 'web')) {
  $pidFile = Join-Path $runDir "tunnel-$name.pid"
  if (-not (Test-Path $pidFile)) { continue }
  $procId = [int](Get-Content $pidFile -Raw).Trim()
  if ($procId -gt 0) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Host "Parado tunnel-$name pid=$procId"
    } catch {
      Write-Host "tunnel-$name pid=$procId já encerrado"
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host 'Tunnel stop solicitado'
