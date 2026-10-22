# SQL — Facturacion-FE

Fuente: `sqlcripts.sql` → `node scripts/generateInstalarOActualizarSql.js`

## Estructura de carpetas

```
Sql/
  alters/           ← cambios en objetos existentes
    columnas.sql              ALTER TABLE (columnas nuevas)
    vistas-drop-create.sql    DROP VIEW + CREATE VIEW (SQL 2008+)
    vistas-create-or-alter.sql CREATE OR ALTER VIEW (SQL 2016 SP1+)
  creates/          ← objetos nuevos
    tablas.sql                CREATE TABLE (IF NOT EXISTS)
    vistas.sql                CREATE VIEW puro
  updates/          ← datos de catalogo
    catalogos.sql             INSERT Tipo Empresa, UPDATE codigoDian
  installs/         ← scripts compuestos (ejecutar uno segun el caso)
    instalar-o-actualizar.sql
    instalar-solo-creates.sql
    actualizar-solo-alters.sql
```

## Que ejecutar en el cliente

| Situacion | Script |
|-----------|--------|
| BD Face existente, SQL Server **2016+** | `installs/instalar-o-actualizar.sql` |
| BD Face existente, SQL Server **2008/2014** (p. ej. SQLEXPRESS2014) | `installs/actualizar-solo-alters.sql` |
| Instalacion nueva (objetos FE no existen) | `installs/instalar-solo-creates.sql` |

En **SQL 2014** no uses `CREATE OR ALTER` (`vistas-create-or-alter.sql`); usa `actualizar-solo-alters.sql` o `alters/vistas-drop-create.sql`.

Los scripts son idempotentes: crean tablas/columnas solo si faltan y recrean/actualizan las 30 vistas FE (incluye `CredencialesWSDLFacturaTech` y `NotaCreditoElectronica`).

## Orden manual (pieza por pieza)

1. `alters/columnas.sql`
2. `creates/tablas.sql`
3. Vistas — una de estas:
   - `alters/vistas-create-or-alter.sql` (2016+)
   - `alters/vistas-drop-create.sql` (2008+)
   - `creates/vistas.sql` (solo si no existen)
4. `updates/catalogos.sql`

## Inventario detallado

Ver `Listado.md`
