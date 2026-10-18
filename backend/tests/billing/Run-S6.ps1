# Orquestra os aceites S6 (billing) na ordem menos destrutiva → mais mutável
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$failed = 0

$order = @(
  'roles_permissions',
  'receivable_manual_title',
  'payment_idempotency',
  'payment_partial_credit',
  'cash_flow_basis',
  'cash_cycle_disabled'
)

foreach ($name in $order) {
  $path = Join-Path $here "$name.ps1"
  Write-Host ''
  Write-Host "========== billing/$name =========="
  & $path
  if ($LASTEXITCODE -ne 0) { $failed++ }
}

Write-Host ''
if ($failed -gt 0) {
  Write-Host "Run-S6: $failed script(s) com falha"
  exit 1
}
Write-Host 'Run-S6: todos OK'
exit 0
