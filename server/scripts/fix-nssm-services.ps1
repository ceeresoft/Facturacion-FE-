#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Corrige AppParameters de servicios NSSM ya instalados (API/Web/Worker).

.USAGE
  PowerShell como Administrador:
    cd server
    .\scripts\fix-nssm-services.ps1
#>

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$ServerDir = Resolve-Path (Join-Path $ScriptDir "..")
$ProjectRoot = Resolve-Path (Join-Path $ServerDir "..")

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
  if (-not $cmd) { throw "No se encontro '$Name' en PATH." }
  return $cmd.Source
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

$nssm = Require-Command "nssm"
$nodeExe = Require-Command "node"
$cmdExe = Require-Command "cmd"

$frontendPort = Get-EnvValue "FRONTEND_PORT" "8080"

$services = @(
  @{
    Name = "FacturacionFE-API"
    Application = $nodeExe
    AppDirectory = $ServerDir
    AppParameters = "src\index.js"
  },
  @{
    Name = "FacturacionFE-Web"
    Application = $cmdExe
    AppDirectory = $ProjectRoot
    AppParameters = "/c npx --yes serve -p $frontendPort"
  },
  @{
    Name = "FacturacionFE-Worker"
    Application = $nodeExe
    AppDirectory = $ServerDir
    AppParameters = "src\worker\index.js"
  }
)

Write-Host ""
Write-Host "Corrigiendo servicios NSSM..."
Write-Host ""

foreach ($svc in $services) {
  $name = $svc.Name
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $null = & $nssm status $name 2>&1
  $exists = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prev

  if (-not $exists) {
    Write-Host "  [SKIP] $name no existe"
    continue
  }

  Write-Host "  [FIX] $name"
  & $nssm stop $name confirm 2>&1 | Out-Null
  Start-Sleep -Seconds 2

  & $nssm set $name Application $svc.Application
  & $nssm set $name AppDirectory $svc.AppDirectory
  Set-NssmAppParameters -Nssm $nssm -ServiceName $name -AppParameters $svc.AppParameters

  Write-Host "         AppParameters = $($svc.AppParameters)"
  & $nssm start $name
  if ($LASTEXITCODE -ne 0) {
    Write-Host "         WARN: no arranco. Revisa server\logs\*-err.log"
  }
}

Write-Host ""
Write-Host "Verificacion:"
foreach ($svc in $services) {
  $name = $svc.Name
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  $null = & $nssm status $name 2>&1
  if ($LASTEXITCODE -eq 0) {
    $params = & $nssm get $name AppParameters 2>&1
    Write-Host "  $name : $params"
  }
  $ErrorActionPreference = $prev
}
Write-Host ""
