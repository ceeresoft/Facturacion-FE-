# Servicios Windows con NSSM

Instala la API, el frontend y el worker de auto-envío como servicios de Windows para que arranquen con el servidor.

## Requisitos en el cliente

1. **Node.js 18+** instalado y en PATH
2. **NSSM** instalado y en PATH ([nssm.cc](https://nssm.cc/download))
3. Proyecto clonado y dependencias instaladas:

```powershell
cd server
copy .env.example .env
# Editar .env: BD, JWT, Facturatech, PORT, FRONTEND_PORT, CORS_ORIGIN, WORKER_*
npm install
```

## Instalar servicios

PowerShell **como Administrador**:

```powershell
cd C:\ruta\al\proyecto\Facturacion-FE-\server
.\scripts\install-nssm-services.ps1
```

El script:

- Crea `server/logs/` si no existe
- Regenera `assets/js/env-config.js` desde `.env`
- Instala **FacturacionFE-API** (`node src/index.js` en `server/`)
- Instala **FacturacionFE-Web** (`npx serve` en la raíz del proyecto)
- Instala **FacturacionFE-Worker** (`node src/worker/index.js` en `server/`)
- Lee `PORT` y `FRONTEND_PORT` del `.env`

## URLs por defecto

| Servicio | URL |
|----------|-----|
| API | http://localhost:3005 |
| Frontend | http://localhost:8080 |

## Comandos útiles

```powershell
nssm status FacturacionFE-API
nssm status FacturacionFE-Web
nssm status FacturacionFE-Worker

nssm stop FacturacionFE-API
nssm stop FacturacionFE-Web
nssm stop FacturacionFE-Worker

nssm start FacturacionFE-API
nssm start FacturacionFE-Web
nssm start FacturacionFE-Worker
```

También desde `services.msc` (Servicios de Windows).

## Logs

```
server/logs/api-out.log
server/logs/api-err.log
server/logs/web-out.log
server/logs/web-err.log
server/logs/worker-out.log
server/logs/worker-err.log
```

Si un servicio no arranca, revisa primero el archivo `*-err.log` correspondiente.

## Desinstalar servicios

PowerShell como Administrador:

```powershell
cd server
.\scripts\uninstall-nssm-services.ps1
```

## Después de un `git pull`

Si cambió código o `.env`:

```powershell
cd server
npm install
node scripts/generateFrontendConfig.js
nssm restart FacturacionFE-API
nssm restart FacturacionFE-Web
nssm restart FacturacionFE-Worker
```

## Notas

- Usa `npm run start` / `node src/index.js` en producción, **no** `npm run dev`.
- `CORS_ORIGIN` en `.env` debe coincidir con la URL del frontend.
- La cuenta del servicio (NSSM → Log on) debe tener acceso a SQL Server.
- El worker requiere `FE_FACTURA_MODO=enviar` y `WORKER_ENABLED=true`. Ver [worker-auto-envio.md](worker-auto-envio.md).
