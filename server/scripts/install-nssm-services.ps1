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
    throw "No se encontró '$Name' en PATH. Instálalo y vuelve a intentar."
  }
  return $cmd.Source
}

$nssm = Require-Command "nssm"
$nodeExe = Require-Command "node"
$cmdExe = Require-Command "cmd"

$apiPort = Get-EnvValue "PORT" "3005"
$frontendPort = Get-EnvValue "FRONTEND_PORT" "8080"
$facturaModo = Get-EnvValue "FE_FACTURA_MODO" "enviar"

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

Write-Host "Generando env-config.js del frontend..."
Push-Location $ServerDir
node scripts/generateFrontendConfig.js
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Falló generateFrontendConfig.js" }
Pop-Location

function Install-Service {
  param(
    [string]$Name,
    [string]$Exe,
    [string]$Args,
    [string]$WorkDir,
    [string]$DisplayName,
    [string]$Description,
    [string]$OutLog,
    [string]$ErrLog
  )

  $existing = & $nssm status $Name 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Servicio '$Name' ya existe. Deteniendo y reconfigurando..."
    & $nssm stop $Name confirm 2>$null | Out-Null
    Start-Sleep -Seconds 2
  } else {
    & $nssm install $Name $Exe $Args
    if ($LASTEXITCODE -ne 0) { throw "No se pudo instalar el servicio $Name" }
  }

  & $nssm set $Name Application $Exe
  & $nssm set $Name AppDirectory $WorkDir
  & $nssm set $Name AppParameters $Args
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
  & $nssm start $Name
  if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar el servicio $Name. Revisa $ErrLog" }
}

$apiOut = Join-Path $LogsDir "api-out.log"
$apiErr = Join-Path $LogsDir "api-err.log"
$webOut = Join-Path $LogsDir "web-out.log"
$webErr = Join-Path $LogsDir "web-err.log"
$workerOut = Join-Path $LogsDir "worker-out.log"
$workerErr = Join-Path $LogsDir "worker-err.log"

Write-Host ""
Write-Host "Proyecto:  $ProjectRoot"
Write-Host "API:       http://localhost:$apiPort"
Write-Host "Frontend:  http://localhost:$frontendPort"
Write-Host ""

Install-Service `
  -Name $ServiceApi `
  -Exe $nodeExe `
  -Args "src\index.js" `
  -WorkDir $ServerDir `
  -DisplayName "Facturacion FE - API" `
  -Description "API Node.js facturación electrónica (puerto $apiPort)" `
  -OutLog $apiOut `
  -ErrLog $apiErr

Install-Service `
  -Name $ServiceWeb `
  -Exe $cmdExe `
  -Args "/c npx --yes serve -p $frontendPort" `
  -WorkDir $ProjectRoot `
  -DisplayName "Facturacion FE - Web" `
  -Description "Frontend estático facturación electrónica (puerto $frontendPort)" `
  -OutLog $webOut `
  -ErrLog $webErr

Install-Service `
  -Name $ServiceWorker `
  -Exe $nodeExe `
  -Args "src\worker\index.js" `
  -WorkDir $ServerDir `
  -DisplayName "Facturacion FE - Worker" `
  -Description "Worker auto-envío de facturas pendientes" `
  -OutLog $workerOut `
  -ErrLog $workerErr

if ($facturaModo -eq "solo_xml") {
  Write-Host "FE_FACTURA_MODO=solo_xml — deteniendo worker (no debe ejecutarse en este modo)"
  & $nssm stop $ServiceWorker confirm 2>$null | Out-Null
}

Write-Host ""
Write-Host "Servicios instalados y en ejecución."
Write-Host "  nssm status $ServiceApi"
Write-Host "  nssm status $ServiceWeb"
Write-Host "  nssm status $ServiceWorker"
Write-Host "Logs en: $LogsDir"
