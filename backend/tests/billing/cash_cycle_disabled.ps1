# Aceite: o ciclo de caixa (abrir/fechar caixa) esta desativado; dinheiro e aceito sem sessao aberta
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../lib/Api.ps1"
Reset-AcceptResults

$session = Connect-AcceptSession -Role Reception
$unitId = Get-AcceptClinicUnitId -Session $session

$open = Invoke-ApiJson -Method POST -Path '/api/v1/cash-sessions' `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ unitId = $unitId; openingCents = 0 }
$code = $null
if ($open.Body.error) { $code = $open.Body.error.code }
Assert-Accept 'cash_open_feature_disabled_501' ($open.Status -eq 501 -and $code -eq 'FEATURE_DISABLED') ("HTTP {0} code={1}" -f $open.Status, $code)

$patientId = Find-AcceptPatientId -Session $session
$inst = Find-AcceptOpenInstallment -Session $session -PatientId $patientId -MinBalanceCents 200
$cash = Invoke-ApiJson -Method POST -Path ("/api/v1/installments/{0}/payments" -f $inst.id) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ amountCents = 100; splits = @(@{ method = 'CASH'; amountCents = 100 }) }
Assert-Accept 'cash_payment_without_session_ok' ($cash.Status -in @(200, 201)) ("HTTP {0}" -f $cash.Status)

Exit-AcceptSummary
