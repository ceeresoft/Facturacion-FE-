#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Instala los servicios Windows NSSM para API, frontend y worker de Facturacion-FE.

.USAGE
  PowerShell como Administrador:
    cd server
    .\scripts\install-nssm-services.ps1

  Requiere: Node.js, NSSM en PATH, npm install ya ejecutado, server\.env configurado.
#>

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ServerDir = Resolve-Path (Join-Path $ScriptDir "..")
$ProjectRoot = Resolve-Path (Join-Path $ServerDir "..")
$LogsDir = Join-Path $ServerDir "logs"

$ServiceApi = "FacturacionFE-API"
$ServiceWeb = "FacturacionFE-Web"
$ServiceWorker = "FacturacionFE-Worker"

function Get-EnvValue {
  param([string]$Key, [string]$Default)
  $envFile = Join-Path $ServerDir ".env"
  if (-not (Test-Path $envFile)) { return $Default }
  $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$([regex]::Escape($Key))\s*=" } | Select-Object -First 1
  if (-not $line) { return $Default }
  $value = ($line -split "=", 2)[1].Trim()
  if ($value) { return $value }
  return $Default
}

function Require-Command {
  param([string]$Name)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "No se encontro '$Name' en PATH. Instalalo y vuelve a intentar."
  }
  return $cmd.Source
}

function Test-NssmService {
  param([string]$Name)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $null = & $nssm status $Name 2>&1
  $ok = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prev
  return $ok
}

function Get-NssmStatusText {
  param([string]$Name)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $raw = (& $nssm status $Name 2>&1 | Out-String)
  $ErrorActionPreference = $prev
  if ($raw -match "SERVICE_[A-Z_]+") {
    return $Matches[0]
  }
  return $raw.Trim()
}

function Start-NssmServiceWait {
  param(
    [string]$Name,
    [string]$ErrLog,
    [int]$TimeoutSec = 40
  )
  Write-Host "Iniciando $Name..."
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $nssm start $Name 2>&1 | Out-Null
  $ErrorActionPreference = $prev

  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $status = ""
  do {
    $status = Get-NssmStatusText -Name $Name
    if ($status -eq "SERVICE_RUNNING") {
      Write-Host "$Name : SERVICE_RUNNING"
      return
    }
    if ($status -eq "SERVICE_STOPPED" -or $status -eq "SERVICE_PAUSED") {
      throw "No se pudo iniciar el servicio $Name (estado $status). Revisa $ErrLog"
    }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  throw "Timeout esperando $Name (ultimo estado: $status). Revisa $ErrLog"
}

$nssm = Require-Command "nssm"
$nodeExe = Require-Command "node"

$apiPort = Get-EnvValue "PORT" "3005"
$facturaModo = Get-EnvValue "FE_FACTURA_MODO" "enviar"

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Write-Host "Compilando frontend (Vite -> dist/)..."
Push-Location $ProjectRoot
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Fallo npm install en la raiz del repo" }
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Fallo npm run build (Vite)" }
Pop-Location

$distIndex = Join-Path $ProjectRoot "dist\index.html"
if (-not (Test-Path $distIndex)) {
  throw "No se genero dist/index.html. Revisa npm run build."
}

function Set-NssmAppParameters {
  param(
    [string]$Nssm,
    [string]$ServiceName,
    [string]$AppParameters
  )
  & $Nssm set $ServiceName AppParameters $AppParameters
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo setear AppParameters en $ServiceName"
  }
}

function Install-Service {
  param(
    [string]$Name,
    [string]$Exe,
    [string]$AppArgs,
    [string]$WorkDir,
    [string]$DisplayName,
    [string]$Description,
    [string]$OutLog,
    [string]$ErrLog
  )

  if (Test-NssmService -Name $Name) {
    Write-Host "Servicio '$Name' ya existe. Deteniendo y reconfigurando..."
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    & $nssm stop $Name confirm 2>&1 | Out-Null
    $ErrorActionPreference = $prev
    Start-Sleep -Seconds 2
  } else {
    Write-Host "Servicio '$Name' no existe. Instalando..."
    & $nssm install $Name $Exe $AppArgs
    if ($LASTEXITCODE -ne 0) { throw "No se pudo instalar el servicio $Name" }
  }

  & $nssm set $Name Application $Exe
  & $nssm set $Name AppDirectory $WorkDir
  Set-NssmAppParameters -Nssm $nssm -ServiceName $Name -AppParameters $AppArgs
  & $nssm set $Name DisplayName $DisplayName
  & $nssm set $Name Description $Description
  & $nssm set $Name AppStdout $OutLog
  & $nssm set $Name AppStderr $ErrLog
  & $nssm set $Name AppStdoutCreationDisposition 4
  & $nssm set $Name AppStderrCreationDisposition 4
  & $nssm set $Name AppRotateFiles 1
  & $nssm set $Name AppRotateOnline 1
  & $nssm set $Name AppRotateBytes 1048576
  & $nssm set $Name Start SERVICE_AUTO_START

  if ($Name -eq $ServiceWorker) {
    & $nssm set $Name AppExit Default Exit
  }

  Write-Host "Iniciando $Name..."
  Start-NssmServiceWait -Name $Name -ErrLog $ErrLog
}

$apiOut = Join-Path $LogsDir "api-out.log"
$apiErr = Join-Path $LogsDir "api-err.log"
$workerOut = Join-Path $LogsDir "worker-out.log"
$workerErr = Join-Path $LogsDir "worker-err.log"

Write-Host ""
Write-Host "Proyecto:  $ProjectRoot"
Write-Host "API+Web:   http://localhost:$apiPort"
Write-Host ""

Install-Service `
  -Name $ServiceApi `
  -Exe $nodeExe `
  -AppArgs "src\index.js" `
  -WorkDir $ServerDir `
  -DisplayName "Facturacion FE - API" `
  -Description "API Node.js y frontend dist (puerto $apiPort)" `
  -OutLog $apiOut `
  -ErrLog $apiErr

if (Test-NssmService -Name $ServiceWeb) {
  Write-Host "El frontend ahora lo sirve la API (dist/). Deteniendo $ServiceWeb..."
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $nssm stop $ServiceWeb confirm 2>&1 | Out-Null
  $ErrorActionPreference = $prev
}

Install-Service `
  -Name $ServiceWorker `
  -Exe $nodeExe `
  -AppArgs "src\worker\index.js" `
  -WorkDir $ServerDir `
  -DisplayName "Facturacion FE - Worker" `
  -Description "Worker auto-envio de facturas pendientes" `
  -OutLog $workerOut `
  -ErrLog $workerErr

if ($facturaModo -eq "solo_xml") {
  Write-Host "FE_FACTURA_MODO=solo_xml - deteniendo worker (no debe ejecutarse en este modo)"
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  & $nssm stop $ServiceWorker confirm 2>&1 | Out-Null
  $ErrorActionPreference = $prev
}

Write-Host ""
Write-Host "Servicios instalados y en ejecucion."
Write-Host "  nssm status $ServiceApi"
Write-Host "  nssm status $ServiceWorker"
Write-Host "Frontend: http://localhost:$apiPort  (servido por la API desde dist/)"
Write-Host "Logs en: $LogsDir"
