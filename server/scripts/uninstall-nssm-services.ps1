#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Elimina los servicios Windows NSSM de Facturacion-FE.

.USAGE
  PowerShell como Administrador:
    cd server
    .\scripts\uninstall-nssm-services.ps1
#>

$ErrorActionPreference = "Stop"

$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssm) {
  throw "No se encontró NSSM en PATH."
}

$services = @("FacturacionFE-API", "FacturacionFE-Web", "FacturacionFE-Worker")

foreach ($name in $services) {
  $status = & $nssm.Source status $name 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Servicio '$name' no está instalado."
    continue
  }

  Write-Host "Deteniendo y eliminando '$name'..."
  & $nssm.Source stop $name confirm 2>$null | Out-Null
  Start-Sleep -Seconds 2
  & $nssm.Source remove $name confirm
}

Write-Host "Listo."
