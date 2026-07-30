#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Instala solo el servicio Windows NSSM del worker de auto-envío.

.USAGE
  PowerShell como Administrador:
    cd server
    .\scripts\install-nssm-worker.ps1

  No toca Facturacion-back / Facturacion-Front ni instala API/Web.
  Requiere: Node.js, NSSM en PATH, npm install ya ejecutado, server\.env configurado.
#>

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ServerDir = Resolve-Path (Join-Path $ScriptDir "..")
$LogsDir = Join-Path $ServerDir "logs"

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
    throw "No se encontró '$Name' en PATH. Instálalo y vuelve a intentar."
  }
  return $cmd.Source
}

$nssm = Require-Command "nssm"
$nodeExe = Require-Command "node"

$ServiceWorker = Get-EnvValue "WORKER_NSSM_SERVICE_NAME" "FacturacionFE-Worker"
$facturaModo = Get-EnvValue "FE_FACTURA_MODO" "enviar"
$workerOut = Join-Path $LogsDir "worker-out.log"
$workerErr = Join-Path $LogsDir "worker-err.log"

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Write-Host ""
Write-Host "Instalando solo el worker de auto-envío"
Write-Host "  Servicio: $ServiceWorker"
Write-Host "  Node:     $nodeExe"
Write-Host "  Carpeta:  $ServerDir"
Write-Host "  Modo FE:  $facturaModo"
Write-Host ""

$existing = & $nssm status $ServiceWorker 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Servicio '$ServiceWorker' ya existe. Deteniendo y reconfigurando..."
  & $nssm stop $ServiceWorker confirm 2>$null | Out-Null
  Start-Sleep -Seconds 2
} else {
  & $nssm install $ServiceWorker $nodeExe "src\worker\index.js"
  if ($LASTEXITCODE -ne 0) { throw "No se pudo instalar el servicio $ServiceWorker" }
}

& $nssm set $ServiceWorker Application $nodeExe
& $nssm set $ServiceWorker AppDirectory $ServerDir
& $nssm set $ServiceWorker AppParameters "src\worker\index.js"
& $nssm set $ServiceWorker DisplayName "Facturacion FE - Worker"
& $nssm set $ServiceWorker Description "Worker auto-envío de facturas pendientes"
& $nssm set $ServiceWorker AppStdout $workerOut
& $nssm set $ServiceWorker AppStderr $workerErr
& $nssm set $ServiceWorker AppStdoutCreationDisposition 4
& $nssm set $ServiceWorker AppStderrCreationDisposition 4
& $nssm set $ServiceWorker AppRotateFiles 1
& $nssm set $ServiceWorker AppRotateOnline 1
& $nssm set $ServiceWorker AppRotateBytes 1048576
& $nssm set $ServiceWorker Start SERVICE_AUTO_START
& $nssm set $ServiceWorker AppExit Default Exit

if ($facturaModo -eq "solo_xml") {
  Write-Host "FE_FACTURA_MODO=solo_xml — el worker se deja instalado pero detenido."
  & $nssm stop $ServiceWorker confirm 2>$null | Out-Null
} else {
  Write-Host "Iniciando $ServiceWorker..."
  & $nssm start $ServiceWorker
  if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar el servicio $ServiceWorker. Revisa $workerErr" }
}

Write-Host ""
Write-Host "Listo. Solo se instaló el worker (API/Web existentes no se tocaron)."
Write-Host "  nssm status $ServiceWorker"
Write-Host "  nssm restart $ServiceWorker"
Write-Host "  nssm stop $ServiceWorker"
Write-Host "Logs: $workerOut / $workerErr"
Write-Host ""
Write-Host "En la app: Consultar factura → Activar worker"
