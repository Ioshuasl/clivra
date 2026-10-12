# Aceite: CASH sem sessao 422; estorno com caixa CLOSED 423
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../lib/Api.ps1"
Reset-AcceptResults

$session = Connect-AcceptSession -Role Reception
$unitId = Get-AcceptClinicUnitId -Session $session
$patientId = Find-AcceptPatientId -Session $session

$currentPath = '/api/v1/cash-sessions/current?unitId={0}' -f $unitId
$current = Invoke-ApiJson -Method GET -Path $currentPath -Token $session.Token -TenantId $session.TenantId
if ($current.Body.data -and $current.Body.data.id -and $current.Body.data.status -eq 'OPEN') {
  $sid = [string]$current.Body.data.id
  $counted = @($current.Body.data.expectedByMethod) | ForEach-Object {
    @{ method = $_.method; countedCents = [int64]$_.expectedCents }
  }
  if (-not $counted -or $counted.Count -eq 0) {
    $counted = @(@{ method = 'CASH'; countedCents = [int64]$current.Body.data.expectedCents })
  }
  [void](Invoke-ApiJson -Method POST -Path ("/api/v1/cash-sessions/{0}/close" -f $sid) `
    -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
    -Body @{ countedByMethod = @($counted); differenceReason = 'fechamento para aceite CASH 422' })
}

$inst = Find-AcceptOpenInstallment -Session $session -PatientId $patientId -MinBalanceCents 200
$amount = 200
$cashNoSession = Invoke-ApiJson -Method POST -Path ("/api/v1/installments/{0}/payments" -f $inst.id) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ amountCents = $amount; splits = @(@{ method = 'CASH'; amountCents = $amount }) }

$code = $null
if ($cashNoSession.Body.error) { $code = $cashNoSession.Body.error.code }
Assert-Accept 'cash_without_session_422' ($cashNoSession.Status -eq 422) ("HTTP {0} code={1}" -f $cashNoSession.Status, $code)

[void](Ensure-AcceptCashSessionOpen -Session $session -UnitId $unitId)
$inst2 = Find-AcceptOpenInstallment -Session $session -PatientId $patientId -MinBalanceCents 200
$pay = Invoke-ApiJson -Method POST -Path ("/api/v1/installments/{0}/payments" -f $inst2.id) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ amountCents = 200; splits = @(@{ method = 'PIX'; amountCents = 200 }) }
Assert-Accept 'payment_before_close' ($pay.Status -in @(200, 201)) ("HTTP {0}" -f $pay.Status)
$paymentId = [string]$pay.Body.data.paymentId

$cur = Invoke-ApiJson -Method GET -Path $currentPath -Token $session.Token -TenantId $session.TenantId
$sid = [string]$cur.Body.data.id
$counted = @($cur.Body.data.expectedByMethod) | ForEach-Object {
  @{ method = $_.method; countedCents = [int64]$_.expectedCents }
}
$close = Invoke-ApiJson -Method POST -Path ("/api/v1/cash-sessions/{0}/close" -f $sid) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ countedByMethod = @($counted); differenceReason = '' }
Assert-Accept 'cash_close_ok' ($close.Status -in @(200, 201)) ("HTTP {0}" -f $close.Status)

$rev = Invoke-ApiJson -Method POST -Path ("/api/v1/payments/{0}/reverse" -f $paymentId) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ reason = 'estorno apos caixa fechado no aceite' }
$revCode = $null
if ($rev.Body.error) { $revCode = $rev.Body.error.code }
Assert-Accept 'reverse_closed_cash_423' ($rev.Status -eq 423) ("HTTP {0} code={1}" -f $rev.Status, $revCode)

$move = Invoke-ApiJson -Method POST -Path ("/api/v1/cash-sessions/{0}/movements" -f $sid) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ kind = 'SUPPLY'; method = 'CASH'; amountCents = 100; description = 'teste imutavel' }
$moveCode = $null
if ($move.Body.error) { $moveCode = $move.Body.error.code }
Assert-Accept 'closed_session_immutable' ($move.Status -in @(404, 409, 422, 423)) ("HTTP {0} code={1}" -f $move.Status, $moveCode)

Exit-AcceptSummary
