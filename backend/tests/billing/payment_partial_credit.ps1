# Aceite: parcial -> PARTIALLY_PAID; excedente -> credito; PATIENT_CREDIT consome ledger
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/../lib/Api.ps1"
Reset-AcceptResults

$session = Connect-AcceptSession -Role Reception
$unitId = Get-AcceptClinicUnitId -Session $session
$patientId = Find-AcceptPatientId -Session $session
$inst = Find-AcceptOpenInstallment -Session $session -PatientId $patientId -MinBalanceCents 500
[void](Ensure-AcceptCashSessionOpen -Session $session -UnitId $unitId)

$balance = [int64]$inst.amountCents - [int64]$inst.paidCents
$partial = [Math]::Max(100, [Math]::Floor($balance / 3))

$p1 = Invoke-ApiJson -Method POST -Path ("/api/v1/installments/{0}/payments" -f $inst.id) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ amountCents = $partial; splits = @(@{ method = 'PIX'; amountCents = $partial }) }

Assert-Accept 'payment_partial_2xx' ($p1.Status -in @(200, 201)) ("HTTP {0}" -f $p1.Status)

$after = Invoke-ApiJson -Method GET -Path ("/api/v1/installments/{0}" -f $inst.id) `
  -Token $session.Token -TenantId $session.TenantId
$status = [string]$after.Body.data.status
Assert-Accept 'payment_partial_status' ($status -eq 'PARTIALLY_PAID') ("status={0}" -f $status)

$rest = [int64]$after.Body.data.amountCents - [int64]$after.Body.data.paidCents
$overpay = $rest + 100
$p2 = Invoke-ApiJson -Method POST -Path ("/api/v1/installments/{0}/payments" -f $inst.id) `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{ amountCents = $overpay; splits = @(@{ method = 'PIX'; amountCents = $overpay }) }

Assert-Accept 'payment_overpay_2xx' ($p2.Status -in @(200, 201)) ("HTTP {0}" -f $p2.Status)
$creditGranted = [int64]$p2.Body.data.creditCentsGranted
Assert-Accept 'payment_overpay_credit' ($creditGranted -ge 100) ("creditCentsGranted={0}" -f $creditGranted)

$credit = Invoke-ApiJson -Method GET -Path ("/api/v1/patients/{0}/credit" -f $patientId) `
  -Token $session.Token -TenantId $session.TenantId
$available = [int64]$credit.Body.data.availableCents
Assert-Accept 'patient_credit_available' ($available -ge 100) ("availableCents={0}" -f $available)

$due = (Get-Date).AddDays(10).ToString('yyyy-MM-dd')
$recv = Invoke-ApiJson -Method POST -Path '/api/v1/receivables' `
  -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
  -Body @{
    patientId        = $patientId
    totalCents       = 150
    installmentCount = 1
    firstDueDate     = $due
    description      = '[accept] credito PATIENT_CREDIT'
  }
Assert-Accept 'receivable_for_credit_consume' ($recv.Status -in @(200, 201)) ("HTTP {0}" -f $recv.Status)

$listPath = '/api/v1/installments?patientId={0}&limit=20' -f $patientId
$list = Invoke-ApiJson -Method GET -Path $listPath -Token $session.Token -TenantId $session.TenantId
$newInst = @($list.Body.data) | Where-Object {
  $_.status -eq 'OPEN' -and ([int64]$_.amountCents) -eq 150
} | Select-Object -First 1

if ($newInst) {
  $use = [Math]::Min(100, $available)
  $payCredit = Invoke-ApiJson -Method POST -Path ("/api/v1/installments/{0}/payments" -f $newInst.id) `
    -Token $session.Token -TenantId $session.TenantId -IdempotencyKey (New-IdempotencyKey) `
    -Body @{
      amountCents = $use
      splits      = @(@{ method = 'PATIENT_CREDIT'; amountCents = $use })
    }
  Assert-Accept 'patient_credit_consume' ($payCredit.Status -in @(200, 201)) ("HTTP {0}" -f $payCredit.Status)
} else {
  Assert-Accept 'patient_credit_consume' $false 'parcela 150c nao encontrada'
}

Exit-AcceptSummary
