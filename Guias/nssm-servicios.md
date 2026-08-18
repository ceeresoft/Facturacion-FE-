# Servicios Windows con NSSM

Instala la API (con el frontend compilado) y el worker de auto-envío como servicios de Windows.

El frontend se construye con **Vite** (`npm run build` en la raíz) y lo sirve **Express** en el mismo puerto que la API. Ya no hace falta un servicio web aparte.

## Requisitos en el cliente

1. **Node.js 18+** instalado y en PATH
2. **NSSM** instalado y en PATH ([nssm.cc](https://nssm.cc/download))
3. Proyecto en el servidor (repo o carpeta `release/`):

```powershell
# En la raíz del proyecto
npm install
npm run build

cd server
copy .env.example .env
# Editar .env: BD, JWT, Facturatech, PORT, CORS_ORIGIN, WORKER_*
npm install
```

## Instalar servicios

PowerShell **como Administrador**:

```powershell
cd C:\ruta\al\proyecto\Facturacion-FE-\server
.\scripts\install-nssm-services.ps1
```

El script:

- Corre `npm install` y `npm run build` en la raíz (genera `dist/`)
- Instala **FacturacionFE-API** (`node src/index.js` en `server/`) — API + frontend
- Instala **FacturacionFE-Worker** (`node src/worker/index.js` en `server/`)
- Si existía **FacturacionFE-Web**, lo detiene (ya no se usa)

## URLs por defecto

| Servicio | URL |
|----------|-----|
| App (API + frontend) | http://localhost:3005 |

En desarrollo local el frontend Vite sigue en http://localhost:8080 (`npm run dev` en la raíz) y la API en el puerto 3005.

## Comandos útiles

```powershell
nssm status FacturacionFE-API
nssm status FacturacionFE-Worker

nssm stop FacturacionFE-API
nssm stop FacturacionFE-Worker

nssm start FacturacionFE-API
nssm start FacturacionFE-Worker
```

También desde `services.msc` (Servicios de Windows).

## Logs

```
server/logs/api-out.log
server/logs/api-err.log
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

```powershell
# Raíz del repo
npm install
npm run build

cd server
npm install
nssm restart FacturacionFE-API
nssm restart FacturacionFE-Worker
```

## Entregar solo compilado (`release/`)

En la máquina de desarrollo:

```powershell
npm run build:release
```

Copia la carpeta `release/` al cliente. Allí:

```powershell
cd release\server
copy .env.example .env
# Editar .env
npm install
npm start
```

`npm start` sirve API y `release/dist` en `PORT` (por defecto 3005).

## Notas

- Usa `npm start` / `node src/index.js` en producción, **no** `npm run dev`.
- Debe existir `dist/index.html` (salida de Vite) un nivel arriba de `server/`.
- `CORS_ORIGIN` en `.env` debe coincidir con la URL que abre el usuario. Con un solo puerto, suele ser la misma que `API_BASE_URL`.
- La cuenta del servicio (NSSM → Log on) debe tener acceso a SQL Server.
- El worker requiere `FE_FACTURA_MODO=enviar` y `WORKER_ENABLED=true`. Ver [worker-auto-envio.md](worker-auto-envio.md).
