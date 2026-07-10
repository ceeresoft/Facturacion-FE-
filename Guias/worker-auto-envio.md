# Worker automático de envío de facturas

Proceso en segundo plano que consulta periódicamente la BD en busca de facturas con `EstadoFacturaElectronica IS NULL` y las envía a Facturatech sin intervención manual.

## Requisitos

- API configurada con `FE_FACTURA_MODO=enviar`
- Credenciales Facturatech en `server/.env`
- Acceso a SQL Server
- **Un solo worker** corriendo contra la misma BD (no iniciar dos instancias)

## Variables `.env`

```env
WORKER_ENABLED=true
WORKER_POLL_INTERVAL_MS=60000      # intervalo entre ciclos (ms)
WORKER_MAX_PER_CYCLE=5             # máx. facturas por ciclo
WORKER_DELAY_BETWEEN_MS=3000       # pausa entre facturas del mismo ciclo
WORKER_MAX_RETRIES_PER_WINDOW=2    # máx. intentos fallidos por factura
WORKER_RETRY_WINDOW_MS=900000      # ventana de reintentos (15 min)
```

| Variable | Default | Descripción |
|----------|---------|-------------|
| `WORKER_ENABLED` | `true` | Activa/desactiva el procesamiento |
| `WORKER_POLL_INTERVAL_MS` | `60000` | Cada cuánto consulta pendientes |
| `WORKER_MAX_PER_CYCLE` | `5` | Límite por ciclo (máx. 50) |
| `WORKER_DELAY_BETWEEN_MS` | `3000` | Espera entre envíos del mismo ciclo |
| `WORKER_MAX_RETRIES_PER_WINDOW` | `2` | Máx. intentos fallidos por factura en la ventana |
| `WORKER_RETRY_WINDOW_MS` | `900000` | Ventana de reintentos (15 minutos) |

Si `FE_FACTURA_MODO=solo_xml`, el worker **no envía** (solo registra que el ciclo fue omitido).

## Desarrollo local

```powershell
cd server
npm run worker
```

Terminal aparte de la API y el frontend.

## Criterio de pendiente

El worker busca facturas que cumplan:

- `EstadoFacturaElectronica IS NULL`
- `[Id Estado] <> 5` (no anuladas)
- Existen en `[Face Cnsta Factura]` (datos listos para XML)
- Todas las empresas

Orden: fecha ascendente (las más antiguas primero).

## Flujo por factura

1. Generar XML (`face_{numero}.xml`)
2. Esperar `FACTURATECH_ENVIO_DELAY_MS`
3. Enviar a Facturatech
4. Actualizar `EstadoFacturaElectronica = 1`

Si falla un envío, la factura queda pendiente y se reintenta en el próximo ciclo, **con límite de 2 intentos fallidos cada 15 minutos por factura** (evita bloqueo del folio en Facturatech).

El estado de reintentos se guarda en `server/logs/worker-retry-state.json` (persiste entre reinicios del servicio).

## Logs

Con NSSM:

```
server/logs/worker-out.log
server/logs/worker-err.log
```

En desarrollo, la salida va a la consola.

## Servicio Windows (NSSM)

Se instala con el script general:

```powershell
cd server
.\scripts\install-nssm-services.ps1
```

Servicio: **FacturacionFE-Worker**  
Comando: `node src\worker\index.js`  
Carpeta: `server/`

```powershell
nssm status FacturacionFE-Worker
nssm restart FacturacionFE-Worker
nssm stop FacturacionFE-Worker
```

## Troubleshooting

| Síntoma | Revisar |
|---------|---------|
| No envía nada | `WORKER_ENABLED`, `FE_FACTURA_MODO`, `worker-out.log` |
| Error Facturatech | `worker-err.log`, credenciales, XML en `xml/` |
| Error BD | `DB_*` en `.env`, permisos SQL |
| Duplicados | Verificar que solo hay **una** instancia del worker |
| Folio bloqueado | Revisar `WORKER_MAX_RETRIES_PER_WINDOW` y `worker-retry-state.json` |
| Ciclo omitido | `FE_FACTURA_MODO=solo_xml` activo |

## Después de `git pull`

```powershell
cd server
npm install
nssm restart FacturacionFE-Worker
```
