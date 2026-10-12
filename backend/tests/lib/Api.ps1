# Helpers HTTP para aceite de codigo contra API ja em execucao.
# Uso: . "$PSScriptRoot/Api.ps1"

. "$PSScriptRoot/Credentials.ps1"

if (-not $env:ACCEPT_API_URL) { $env:ACCEPT_API_URL = 'http://localhost:3333' }

function Get-AcceptApiBase {
  return $env:ACCEPT_API_URL.TrimEnd('/')
}

function New-IdempotencyKey {
  return [guid]::NewGuid().ToString()
}

function Write-AcceptResult {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][bool]$Ok,
    [string]$Detail = ''
  )
  $tag = if ($Ok) { 'PASS' } else { 'FAIL' }
  if ($Detail) {
    Write-Host ("[{0}] {1} - {2}" -f $tag, $Name, $Detail)
  } else {
    Write-Host ("[{0}] {1}" -f $tag, $Name)
  }
  if (-not $Ok) {
    if (-not $script:AcceptFailures) {
      $script:AcceptFailures = New-Object System.Collections.Generic.List[string]
    }
    [void]$script:AcceptFailures.Add($Name)
  }
}

function Reset-AcceptResults {
  $script:AcceptFailures = New-Object System.Collections.Generic.List[string]
  $script:AcceptPassCount = 0
  $script:AcceptFailCount = 0
}

function Assert-Accept {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][bool]$Condition,
    [string]$Detail = ''
  )
  if ($Condition) {
    $script:AcceptPassCount++
    Write-AcceptResult -Name $Name -Ok $true -Detail $Detail
  } else {
    $script:AcceptFailCount++
    Write-AcceptResult -Name $Name -Ok $false -Detail $Detail
  }
}

function Exit-AcceptSummary {
  $pass = $script:AcceptPassCount
  $fail = $script:AcceptFailCount
  Write-Host ''
  Write-Host ("Resumo: {0} PASS / {1} FAIL" -f $pass, $fail)
  if ($fail -gt 0) {
    Write-Host 'Falhas:'
    foreach ($f in $script:AcceptFailures) { Write-Host ("  - {0}" -f $f) }
    exit 1
  }
  exit 0
}

function Invoke-ApiJson {
  param(
    [Parameter(Mandatory)][ValidateSet('GET', 'POST', 'PUT', 'PATCH', 'DELETE')][string]$Method,
    [Parameter(Mandatory)][string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null,
    [string]$Token = '',
    [string]$TenantId = '',
    [string]$IdempotencyKey = ''
  )

  $url = (Get-AcceptApiBase) + $Path
  $hdr = @{ 'Content-Type' = 'application/json' }
  foreach ($k in $Headers.Keys) { $hdr[$k] = [string]$Headers[$k] }
  if ($Token) { $hdr['Authorization'] = "Bearer $Token" }
  if ($TenantId) { $hdr['X-Tenant-Id'] = $TenantId }
  if ($IdempotencyKey) { $hdr['Idempotency-Key'] = $IdempotencyKey }

  $tmp = [System.IO.Path]::GetTempFileName()
  $bodyFile = $null
  try {
    $curlArgs = New-Object System.Collections.Generic.List[string]
    [void]$curlArgs.Add('-s')
    [void]$curlArgs.Add('-S')
    [void]$curlArgs.Add('-X')
    [void]$curlArgs.Add($Method)
    [void]$curlArgs.Add('-w')
    [void]$curlArgs.Add("`n%{http_code}")
    [void]$curlArgs.Add('-o')
    [void]$curlArgs.Add($tmp)

    foreach ($k in $hdr.Keys) {
      [void]$curlArgs.Add('-H')
      [void]$curlArgs.Add(('{0}: {1}' -f $k, $hdr[$k]))
    }

    if ($null -ne $Body) {
      if ($Body -is [string]) {
        $json = $Body
      } else {
        $json = $Body | ConvertTo-Json -Depth 20 -Compress
      }
      $bodyFile = [System.IO.Path]::GetTempFileName()
      $utf8 = New-Object System.Text.UTF8Encoding $false
      [System.IO.File]::WriteAllText($bodyFile, $json, $utf8)
      [void]$curlArgs.Add('--data-binary')
      [void]$curlArgs.Add('@' + $bodyFile)
    }

    [void]$curlArgs.Add($url)
    $raw = & curl.exe @($curlArgs.ToArray()) 2>&1 | Out-String
    $raw = $raw.Trim()
    $lines = $raw -split "`n"
    $statusText = $lines[-1].Trim()
    $status = 0
    [void][int]::TryParse($statusText, [ref]$status)

    $text = [System.IO.File]::ReadAllText($tmp)
    $parsed = $null
    if ($text) {
      try { $parsed = $text | ConvertFrom-Json } catch { $parsed = @{ raw = $text } }
    }

    return [pscustomobject]@{
      Status = $status
      Body   = $parsed
      Text   = $text
    }
  } finally {
    Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue
    if ($bodyFile) { Remove-Item -LiteralPath $bodyFile -ErrorAction SilentlyContinue }
  }
}

function Connect-AcceptSession {
  param(
    [Parameter(Mandatory)][ValidateSet('Owner', 'Reception', 'Finance', 'Dentist', 'Assistant')][string]$Role,
    [int]$MaxAttempts = 6
  )

  $user = $script:TestUsers[$Role]
  if (-not $user) { throw ("papel desconhecido: {0}" -f $Role) }

  $last = $null
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    $last = Invoke-ApiJson -Method POST -Path '/api/v1/auth/login' -Body @{
      email    = $user.Email
      password = $user.Password
    }
    if ($last.Status -eq 429) {
      Start-Sleep -Seconds 16
      continue
    }
    break
  }

  if ($last.Status -ne 200) {
    throw ("login {0} falhou: HTTP {1} {2}" -f $Role, $last.Status, $last.Text)
  }

  $data = $last.Body.data
  return [pscustomobject]@{
    Role     = $Role
    Token    = [string]$data.accessToken
    TenantId = [string]$data.tenant.id
    UserId   = [string]$data.user.id
    Email    = $user.Email
  }
}

function Get-AcceptClinicUnitId {
  param([Parameter(Mandatory)]$Session)

  $res = Invoke-ApiJson -Method GET -Path '/api/v1/clinic' -Token $Session.Token -TenantId $Session.TenantId
  $unitId = $null
  if ($res.Status -eq 200 -and $res.Body.data.defaultUnit) {
    $unitId = $res.Body.data.defaultUnit.id
  }
  if (-not $unitId) {
    $units = Invoke-ApiJson -Method GET -Path '/api/v1/clinic/units' -Token $Session.Token -TenantId $Session.TenantId
    $unitId = @($units.Body.data)[0].id
  }
  if (-not $unitId) { throw 'unidade padrao nao encontrada' }
  return [string]$unitId
}

function Find-AcceptPatientId {
  param(
    [Parameter(Mandatory)]$Session,
    [string]$Name = $script:SeedPatient
  )

  $q = [uri]::EscapeDataString($Name)
  $path = '/api/v1/patients?search={0}&limit=20' -f $q
  $res = Invoke-ApiJson -Method GET -Path $path -Token $Session.Token -TenantId $Session.TenantId
  $row = @($res.Body.data) | Where-Object { $_.name -like ("*{0}*" -f $Name) } | Select-Object -First 1
  if (-not $row) { throw ("paciente '{0}' nao encontrado" -f $Name) }
  return [string]$row.id
}

function Find-AcceptOpenInstallment {
  param(
    [Parameter(Mandatory)]$Session,
    [Parameter(Mandatory)][string]$PatientId,
    [int]$MinBalanceCents = 200
  )

  $path = '/api/v1/installments?patientId={0}&limit=50' -f $PatientId
  $res = Invoke-ApiJson -Method GET -Path $path -Token $Session.Token -TenantId $Session.TenantId
  $open = @($res.Body.data) | Where-Object {
    $_.status -in @('OPEN', 'PARTIALLY_PAID', 'OVERDUE') -and
    (([int64]$_.amountCents) - ([int64]$_.paidCents)) -ge $MinBalanceCents
  } | Select-Object -First 1

  if (-not $open) { throw 'parcela em aberto insuficiente para o teste' }
  return $open
}

function Ensure-AcceptCashSessionOpen {
  param(
    [Parameter(Mandatory)]$Session,
    [Parameter(Mandatory)][string]$UnitId
  )

  $path = '/api/v1/cash-sessions/current?unitId={0}' -f $UnitId
  $current = Invoke-ApiJson -Method GET -Path $path -Token $Session.Token -TenantId $Session.TenantId
  if ($current.Status -eq 200 -and $current.Body.data -and $current.Body.data.id) {
    return [string]$current.Body.data.id
  }

  $opened = Invoke-ApiJson -Method POST -Path '/api/v1/cash-sessions' `
    -Token $Session.Token -TenantId $Session.TenantId `
    -IdempotencyKey (New-IdempotencyKey) `
    -Body @{ unitId = $UnitId; openingCents = 0 }

  if ($opened.Status -notin @(200, 201)) {
    throw ("abrir caixa falhou: HTTP {0} {1}" -f $opened.Status, $opened.Text)
  }
  return [string]$opened.Body.data.id
}
