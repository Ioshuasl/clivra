<#
.SYNOPSIS
  Gera board.md + queue.json a partir de docs/desenvolvimento/sprints/S*.md
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Sprint,

  [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  param([string]$Hint)
  if ($Hint) { return (Resolve-Path $Hint).Path }
  $root = $PSScriptRoot
  1..4 | ForEach-Object { $root = Split-Path $root -Parent }
  return $root
}

function Test-IsShouldLine {
  param([string]$Line)
  $l = $Line.ToLowerInvariant()
  if ($l -match '\bshould\b') { return $true }
  if ($l -match '\bcould\b') { return $true }
  if ($l -match 'escorrega') { return $true }
  if ($l -match 'se couber') { return $true }
  return $false
}

function Resolve-Agent {
  param([string]$Title)
  $t = $Title.ToLowerInvariant()
  if ($t -match 'backend') { return 'backend' }
  if ($t -match 'frontend') { return 'frontend' }
  return 'ask'
}

$root = Get-RepoRoot -Hint $RepoRoot
$sprintKey = $Sprint.Trim().ToUpperInvariant()
if ($sprintKey -notmatch '^S\d+') {
  throw "Sprint invalida: use S7, S6, etc. Recebido: $Sprint"
}

$sprintsDir = Join-Path $root 'docs\desenvolvimento\sprints'
$files = @(Get-ChildItem -Path $sprintsDir -Filter ($sprintKey + '-*.md') -File)
if ($files.Count -eq 0) {
  $files = @(Get-ChildItem -Path $sprintsDir -Filter ($sprintKey + '*.md') -File)
}
if ($files.Count -eq 0) {
  throw "Arquivo de sprint nao encontrado para $sprintKey em $sprintsDir"
}
$sprintFile = $files | Select-Object -First 1
$relSprint = 'docs/desenvolvimento/sprints/' + $sprintFile.Name

$lines = Get-Content -Path $sprintFile.FullName -Encoding UTF8

$blocks = New-Object System.Collections.Generic.List[object]
$inBlocks = $false
$current = $null

foreach ($line in $lines) {
  if ($line -match '^##\s+Blocos de entrega') {
    $inBlocks = $true
    continue
  }
  if ($inBlocks -and $line -match '^##\s+') {
    break
  }
  if (-not $inBlocks) { continue }

  if ($line -match '^###\s+Bloco\s+(\d+)(.+)$') {
    if ($null -ne $current) { [void]$blocks.Add($current) }
    $num = [int]$Matches[1]
    $title = ($Matches[2].Trim() -replace '^[^A-Za-z0-9]+', '').Trim()
    if (-not $title) { $title = "Bloco $num" }
    $current = [pscustomobject]@{
      id     = ('B' + $num)
      number = $num
      title  = $title
      agent  = (Resolve-Agent -Title $title)
      status = 'pending'
      dod    = New-Object System.Collections.Generic.List[string]
      smoke  = New-Object System.Collections.Generic.List[string]
    }
    continue
  }

  if ($null -eq $current) { continue }

  if ($line -match '^\s*-\s*\[([ xX])\]\s+(.+)\s*$') {
    $text = $Matches[2].Trim()
    if (Test-IsShouldLine -Line $text) { continue }
    [void]$current.dod.Add($text)
    $low = $text.ToLowerInvariant()
    if ($low -match 'smoke|test:|e2e/|playwright|pnpm test') {
      [void]$current.smoke.Add($text)
    }
  }
}
if ($null -ne $current) { [void]$blocks.Add($current) }

if ($blocks.Count -eq 0) {
  throw "Nenhum Bloco encontrado sob 'Blocos de entrega' em $($sprintFile.Name)"
}

$runDir = Join-Path $PSScriptRoot ('..\.run\' + $sprintKey)
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$updated = (Get-Date).ToString('o')
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# Board $sprintKey")
[void]$sb.AppendLine('')
[void]$sb.AppendLine("- Sprint file: $relSprint")
[void]$sb.AppendLine('- Status: running')
[void]$sb.AppendLine("- Updated: $updated")
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Queue (Must only)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| # | id | title | agent | status | notes |')
[void]$sb.AppendLine('| --- | --- | --- | --- | --- | --- |')
$i = 0
foreach ($b in $blocks) {
  $i++
  [void]$sb.AppendLine("| $i | $($b.id) | $($b.title) | $($b.agent) | $($b.status) | |")
}
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Fix queue (runtime)')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('| # | id | title | agent | status | cycle |')
[void]$sb.AppendLine('| --- | --- | --- | --- | --- | --- |')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## Tester')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('- Full runs: 0')
[void]$sb.AppendLine('- Last: -')
[void]$sb.AppendLine('- Fix cycles used: 0 / 2')
[void]$sb.AppendLine('')
[void]$sb.AppendLine('## DoD por bloco')
[void]$sb.AppendLine('')

foreach ($b in $blocks) {
  [void]$sb.AppendLine("### $($b.id) - $($b.title)")
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine("- agent: $($b.agent)")
  if ($b.dod.Count -eq 0) {
    [void]$sb.AppendLine('- (sem checkboxes Must parseados - usar texto do bloco na sprint)')
  } else {
    foreach ($d in $b.dod) {
      [void]$sb.AppendLine("- [ ] $d")
    }
  }
  if ($b.smoke.Count -gt 0) {
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine('Smoke/E2E pos-bloco:')
    foreach ($s in $b.smoke) {
      [void]$sb.AppendLine("- $s")
    }
  }
  [void]$sb.AppendLine('')
}

$boardPath = Join-Path $runDir 'board.md'
Set-Content -Path $boardPath -Value $sb.ToString() -Encoding utf8

$historyPath = Join-Path $runDir 'history.md'
if (-not (Test-Path $historyPath)) {
  Set-Content -Path $historyPath -Value "# History $sprintKey`r`n`r`n" -Encoding utf8
}
Add-Content -Path $historyPath -Value "- $updated init board from $relSprint" -Encoding utf8

$payload = [ordered]@{
  sprintId     = $sprintKey
  sprintFile   = $relSprint
  updated      = $updated
  status       = 'running'
  fixCycles    = 0
  maxFixCycles = 2
  blocks       = @($blocks | ForEach-Object {
      [ordered]@{
        id     = $_.id
        number = $_.number
        title  = $_.title
        agent  = $_.agent
        status = $_.status
        dod    = @($_.dod)
        smoke  = @($_.smoke)
      }
    })
}
$jsonPath = Join-Path $runDir 'queue.json'
($payload | ConvertTo-Json -Depth 8) | Set-Content -Path $jsonPath -Encoding utf8

Write-Host "Board: $boardPath"
Write-Host "Queue: $jsonPath"
Write-Host ("Blocos Must: " + $blocks.Count)
$ask = @($blocks | Where-Object { $_.agent -eq 'ask' })
if ($ask.Count -gt 0) {
  Write-Host 'ATENCAO: blocos com agent=ask (definir BE/FE com o usuario):'
  $ask | ForEach-Object { Write-Host (" - " + $_.id + ' ' + $_.title) }
}
