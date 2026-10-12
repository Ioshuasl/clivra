<#
.SYNOPSIS
  Orquestra a suíte tester (stack → tunnel? → seed → fases → relatório).
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = '',
  [switch]$Tunnel,
  [switch]$SkipStack,
  [switch]$SkipSeed,
  [switch]$SkipE2E,
  [switch]$SkipAcceptance,
  [string]$Only = '',
  [switch]$IncludeLint,
  [switch]$IncludeBillingBundle,
  [string]$ReportPath = ''
)

$ErrorActionPreference = 'Continue'
$scriptsDir = $PSScriptRoot
$skillDir = Resolve-Path (Join-Path $scriptsDir '..')
$runDir = Join-Path $skillDir '.run'
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

function Get-RepoRoot {
  param([string]$Hint)
  if ($Hint) { return (Resolve-Path $Hint).Path }
  $root = $scriptsDir
  1..4 | ForEach-Object { $root = Split-Path $root -Parent }
  return $root
}

function Test-ShouldRunPhase {
  param([string]$Name, [string[]]$Filter)
  if (-not $Filter -or $Filter.Count -eq 0) { return $true }
  return $Filter -contains $Name
}

function Invoke-Step {
  param(
    [Parameter(Mandatory)][string]$Phase,
    [Parameter(Mandatory)][string]$Id,
    [scriptblock]$Action,
    [string]$Command = ''
  )
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Write-Host ""
  Write-Host ">>> [$Phase] $Id"
  $exit = 0
  $err = ''
  try {
    if ($Command) {
      cmd /c $Command
    } elseif ($Action) {
      & $Action
    } else {
      throw 'Invoke-Step requer -Command ou -Action'
    }
    if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
      $exit = [int]$LASTEXITCODE
    }
  } catch {
    $exit = 1
    $err = $_.Exception.Message
    Write-Host $err
  }
  $sw.Stop()
  $status = if ($exit -eq 0) { 'pass' } else { 'fail' }
  Write-Host "<<< [$Phase] $Id → $status ($([int]$sw.Elapsed.TotalSeconds)s)"
  return [pscustomobject]@{
    phase    = $Phase
    id       = $Id
    status   = $status
    exitCode = $exit
    seconds  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
    error    = $err
  }
}

function Write-TesterReport {
  param(
    [Parameter(Mandatory)]$Results,
    [Parameter(Mandatory)][datetime]$StartedAt,
    [Parameter(Mandatory)][string]$OutPath,
    [Parameter(Mandatory)][string]$RunDir
  )
  $endedAt = Get-Date
  $failed = @($Results | Where-Object { $_.status -eq 'fail' })
  $passed = @($Results | Where-Object { $_.status -eq 'pass' })
  $skipped = @($Results | Where-Object { $_.status -eq 'skip' })

  $tunnelInfo = ''
  $tunnelFile = Join-Path $RunDir 'tunnel.json'
  if (Test-Path $tunnelFile) {
    $tunnelInfo = Get-Content $tunnelFile -Raw
  }

  $md = New-Object System.Text.StringBuilder
  [void]$md.AppendLine('# Tester report')
  [void]$md.AppendLine('')
  [void]$md.AppendLine("- Started: $($StartedAt.ToString('o'))")
  [void]$md.AppendLine("- Ended: $($endedAt.ToString('o'))")
  [void]$md.AppendLine("- Duration: $([int]($endedAt - $StartedAt).TotalSeconds)s")
  [void]$md.AppendLine("- Pass: $($passed.Count) · Fail: $($failed.Count) · Skip: $($skipped.Count)")
  [void]$md.AppendLine('')
  if ($tunnelInfo) {
    [void]$md.AppendLine('## Tunnel')
    [void]$md.AppendLine('```json')
    [void]$md.AppendLine($tunnelInfo.Trim())
    [void]$md.AppendLine('```')
    [void]$md.AppendLine('')
  } else {
    [void]$md.AppendLine('## Tunnel')
    [void]$md.AppendLine('off')
    [void]$md.AppendLine('')
  }
  [void]$md.AppendLine('## Results')
  [void]$md.AppendLine('')
  [void]$md.AppendLine('| Phase | Id | Status | Seconds |')
  [void]$md.AppendLine('| --- | --- | --- | ---: |')
  foreach ($row in $Results) {
    [void]$md.AppendLine("| $($row.phase) | $($row.id) | $($row.status) | $($row.seconds) |")
  }
  if ($failed.Count -gt 0) {
    [void]$md.AppendLine('')
    [void]$md.AppendLine('## Failures')
    foreach ($f in $failed) {
      [void]$md.AppendLine("- **$($f.phase)/$($f.id)** exit=$($f.exitCode) $($f.error)")
    }
  }

  $md.ToString() | Set-Content -Path $OutPath -Encoding utf8
  ($Results | ConvertTo-Json -Depth 4) | Set-Content -Path (Join-Path $RunDir 'results.json') -Encoding utf8

  Write-Host ''
  Write-Host "Report: $OutPath"
  Write-Host "Pass=$($passed.Count) Fail=$($failed.Count) Skip=$($skipped.Count)"
  return $failed.Count
}

$root = Get-RepoRoot -Hint $RepoRoot
if (-not $ReportPath) {
  $ReportPath = Join-Path $runDir 'last-report.md'
}

$filter = @()
if ($Only) {
  $filter = @($Only.Split(',') | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
}

$envTunnel = $env:TESTER_TUNNEL
if ($envTunnel -eq '1' -or $envTunnel -eq 'true') { $Tunnel = $true }

$results = New-Object System.Collections.Generic.List[object]
$startedAt = Get-Date
$abortSuite = $false

Push-Location $root
try {
  Write-Host "=== Invoke-Tester ==="
  Write-Host "Repo: $root"

  if (-not $SkipStack) {
    $ensure = Join-Path $scriptsDir 'Ensure-Stack.ps1'
    $r = Invoke-Step -Phase 'preflight' -Id 'ensure-stack' -Command "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ensure`" -RepoRoot `"$root`""
    [void]$results.Add($r)
    if ($r.status -ne 'pass') {
      Write-Host 'ABORT: stack unhealthy — fases de teste puladas.'
      $abortSuite = $true
    }
  } else {
    [void]$results.Add([pscustomobject]@{ phase = 'preflight'; id = 'ensure-stack'; status = 'skip'; exitCode = 0; seconds = 0; error = '' })
  }

  if (-not $abortSuite) {
    if ($Tunnel) {
      $startTunnel = Join-Path $scriptsDir 'Start-Tunnel.ps1'
      $r = Invoke-Step -Phase 'preflight' -Id 'localtunnel' -Command "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$startTunnel`""
      [void]$results.Add($r)
    } else {
      [void]$results.Add([pscustomobject]@{ phase = 'preflight'; id = 'localtunnel'; status = 'skip'; exitCode = 0; seconds = 0; error = '' })
    }

    if (-not $SkipSeed) {
      [void]$results.Add((Invoke-Step -Phase 'preflight' -Id 'db:seed' -Command 'pnpm db:seed'))
    } else {
      [void]$results.Add([pscustomobject]@{ phase = 'preflight'; id = 'db:seed'; status = 'skip'; exitCode = 0; seconds = 0; error = '' })
    }

    if (Test-ShouldRunPhase -Name 'quality' -Filter $filter) {
      [void]$results.Add((Invoke-Step -Phase 'quality' -Id 'typecheck' -Command 'pnpm typecheck'))
      [void]$results.Add((Invoke-Step -Phase 'quality' -Id 'arch:check' -Command 'pnpm arch:check'))
      if ($IncludeLint) {
        [void]$results.Add((Invoke-Step -Phase 'quality' -Id 'lint' -Command 'pnpm lint'))
      }
    }

    if (Test-ShouldRunPhase -Name 'unit' -Filter $filter) {
      foreach ($cmd in @(
          'pnpm test:kms',
          'pnpm test:clinical-crypto',
          'pnpm test:split-installments',
          'pnpm test:receipt-amount-in-words',
          'pnpm test:rls'
        )) {
        $id = ($cmd -replace '^pnpm ', '')
        [void]$results.Add((Invoke-Step -Phase 'unit' -Id $id -Command $cmd))
      }
    }

    if (Test-ShouldRunPhase -Name 'smoke' -Filter $filter) {
      $smokes = @(
        'pnpm test:identity',
        'pnpm --filter @repo/backend test:clinic',
        'pnpm --filter @repo/backend test:patients',
        'pnpm --filter @repo/backend test:scheduling',
        'pnpm test:outbox',
        'pnpm test:public-booking',
        'pnpm test:waitlist',
      'pnpm test:messaging',
      'pnpm test:messaging-inbox',
      'pnpm test:anamnesis',
      'pnpm test:odontogram',
      'pnpm test:clinical-notes',
      'pnpm test:attachments',
      'pnpm test:quotes-crud',
      'pnpm test:quotes-send',
      'pnpm test:quotes-decision',
      'pnpm test:treatments-execute',
      'pnpm test:billing-payments',
      'pnpm test:billing-cash',
      'pnpm test:billing-payables',
      'pnpm test:billing-reports',
      'pnpm test:reporting-dashboard',
      'pnpm test:reporting-export',
      'pnpm test:subscription'
    )
      foreach ($cmd in $smokes) {
        $id = ($cmd -replace '^pnpm (--filter @repo/backend )?','')
        [void]$results.Add((Invoke-Step -Phase 'smoke' -Id $id -Command $cmd))
      }
    }

    if ((-not $SkipAcceptance) -and (Test-ShouldRunPhase -Name 'acceptance' -Filter $filter)) {
      $acceptRoot = Join-Path $root 'backend/tests'
      $invokeAccept = Join-Path $acceptRoot 'Invoke-Acceptance.ps1'
      $modules = Get-ChildItem -Path $acceptRoot -Directory |
        Where-Object { $_.Name -notin @('lib') } |
        Where-Object {
          @(Get-ChildItem -Path $_.FullName -Filter '*.ps1' -File |
            Where-Object { $_.Name -notlike 'Run-*' -and $_.Name -notlike '_*' }).Count -gt 0
        }

      foreach ($mod in $modules) {
        $modName = $mod.Name
        $acceptCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$invokeAccept`" -Module $modName"
        [void]$results.Add((Invoke-Step -Phase 'acceptance' -Id "accept:$modName" -Command $acceptCmd))
      }

      if ($IncludeBillingBundle) {
        $bundle = Join-Path $acceptRoot 'billing/Run-S6.ps1'
        if (Test-Path $bundle) {
          $bundleCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$bundle`""
          [void]$results.Add((Invoke-Step -Phase 'acceptance' -Id 'accept:billing-bundle-S6' -Command $bundleCmd))
        }
      }
    }

    if ((-not $SkipE2E) -and (Test-ShouldRunPhase -Name 'e2e' -Filter $filter)) {
      [void]$results.Add((Invoke-Step -Phase 'e2e' -Id 'playwright' -Command 'pnpm test:e2e'))
    }
  }

  $failCount = Write-TesterReport -Results $results -StartedAt $startedAt -OutPath $ReportPath -RunDir $runDir
  if ($failCount -gt 0) { exit 1 }
  exit 0
}
finally {
  Pop-Location
}
