# Objetos SQL usados por Facturacion-FE

Fuente de verdad: `sqlcripts.sql` → `node scripts/generateInstalarOActualizarSql.js`

Ver también: `README.md` (estructura de carpetas y orden de ejecución)

## Scripts compuestos (`installs/`)

| Archivo | Cuándo usarlo | SQL Server |
|---------|---------------|------------|
| `installs/instalar-o-actualizar.sql` | BD existente Face/CeereSio — idempotente | **2016 SP1+** |
| `installs/actualizar-solo-alters.sql` | BD existente — servidores viejos | **2008+** |
| `installs/instalar-solo-creates.sql` | Instalación nueva sin objetos FE | **2008+** |

## Piezas separadas

| Carpeta | Archivo | Contenido |
|---------|---------|-----------|
| `alters/` | `columnas.sql` | `ALTER TABLE` — `EstadoFacturaElectronica`, `EstadoFace`, `codigoDian` |
| `alters/` | `vistas-drop-create.sql` | `DROP VIEW` + `CREATE VIEW` (30 vistas) |
| `alters/` | `vistas-create-or-alter.sql` | `CREATE OR ALTER VIEW` (30 vistas) |
| `creates/` | `tablas.sql` | `CREATE TABLE` IF NOT EXISTS (5 tablas) |
| `creates/` | `vistas.sql` | `CREATE VIEW` puro (30 vistas) |
| `updates/` | `catalogos.sql` | INSERT `Tipo Empresa`, UPDATE `codigoDian` |

## Validación vs código Node (`server/src`)

### Columnas ALTER (`alters/columnas.sql`)

| Columna | Tabla | Usado en |
|---------|-------|----------|
| `EstadoFacturaElectronica` | `Factura` | envío FE, worker |
| `EstadoFace` | `[Nota Crédito]` | envío NC |
| `codigoDian` | `[Tipo de Documento]` | XML, combos |

### Tablas CREATE (`creates/tablas.sql`)

| Tabla | Usado en |
|-------|----------|
| `Empresa`, `EmpresaII`, `EmpresaIII` | perfil empresa |
| `[Tipo de Documento]` | catálogo |
| `ConfiguracionFace` | XML factura/NC |
| `NotaCreditoElectronica` | trazabilidad e idempotencia de notas crédito enviadas |
| `CredencialesWSDLFacturaTech` | usuario/clave/URL SOAP Facturatech por `[Documento Empresa]` |

### Vistas (30) — en `creates/vistas.sql` y `alters/`

Todas las vistas usadas por el backend están incluidas, incluyendo **`Face Cnsta FacturaParticular`**, **`Face Cnsta FacturaSaldos`**, **`Face Cnsta NumeroItems`** y **`Face Cnsta GuiaCuotaInicial`**. `[Face Cnsta Factura]` incluye **`IdFactura`**. **`Face Cnsta Salud Prepagada`** normaliza `Documento Responsable` (trim + CR/LF) para SS06/SS07.

### Tablas base Face (deben existir en CeereSio)

`Factura`, `FacturaII`, `Entidad`, `EmpresaV`, `Contraseña`, `País`, etc.

## Verificación en SSMS

```sql
SELECT COL_LENGTH('dbo.Factura', 'EstadoFacturaElectronica');
SELECT OBJECT_ID(N'dbo.CredencialesWSDLFacturaTech', N'U');
SELECT OBJECT_ID(N'dbo.NotaCreditoElectronica', N'U');
SELECT TOP 1 IdFactura, NroFactura FROM [Face Cnsta Factura];
SELECT COUNT(*) FROM [Face Cnsta TipoDocumento];
-- SQL 2014: confirmar vista con limpieza CR/LF
SELECT CASE
  WHEN OBJECT_DEFINITION(OBJECT_ID(N'dbo.[Face Cnsta Salud Prepagada]'))
       LIKE N'%CHAR(13)%' THEN N'OK'
  ELSE N'Actualizar vistas (actualizar-solo-alters / drop-create)'
END AS VistaSaludPrepagada;
```
