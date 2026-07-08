# Objetos SQL usados por Facturacion-FE

Fuente: servicios en `server/src`. Definiciones guardadas en `Creates.sql` (extraídas 2026-07-08).

## Estado en esta base

| Estado | Cantidad |
|--------|----------|
| EXISTE | 24 |
| NO EXISTE | 2 |

### No existen (atención)

| Objeto | Cuándo lo usa el app |
|--------|----------------------|
| `Face Cnsta FacturaParticular` | GuiaFactura=0 y GuiaFacturaNormal in (5,13) y GuiaSaldos=0 y GuiaCantidadPresupuesto=1 |
| `Face Cnsta FacturaSaldos` | GuiaSaldos ≠ 0 |

Si llega una factura de esos tipos, fallará el detalle/XML hasta crear la vista o ajustar `itemRouter` / `resolveDetailTableXml`.

## Inventario completo

| # | Objeto | Estado | Tipo |
|---|--------|--------|------|
| 1 | Face Cnsta Login | OK | VIEW |
| 2 | face Cnsta Empresa | OK | VIEW |
| 3 | Empresa | OK | TABLE |
| 4 | EmpresaII | OK | TABLE |
| 5 | EmpresaIII | OK | TABLE |
| 6 | Tipo de Documento | OK | TABLE |
| 7 | face_ConsultaEmpresaV | OK | VIEW |
| 8 | face_facturaPorUsuario | OK | VIEW |
| 9 | Face Cnsta Factura | OK | VIEW |
| 10 | Face Cnsta FacturaE Empresa | OK | VIEW |
| 11 | Face Cnsta FacturaE Entidad | OK | VIEW |
| 12 | Face Cnsta TipoDeFactura | OK | VIEW |
| 13 | Face Cnsta FacturaCopago | OK | VIEW |
| 14 | Face Cnsta FacturaAnticiposVariosItems | OK | VIEW |
| 15 | Face Cnsta FacturaParticular | **NO EXISTE** | — |
| 16 | Face Cnsta FacturaSaldos | **NO EXISTE** | — |
| 17 | Face Cnsta FacturaEII | OK | VIEW |
| 18 | Face Cnsta Salud Prepagada | OK | VIEW |
| 19 | Face Cnsta Salud Recaudo Prepagada | OK | VIEW |
| 20 | ConfiguracionFace | OK | TABLE |
| 21 | Face Total base impuestos porcentaje | OK | VIEW |
| 22 | Face Total base impuestos porcentaje FacturaNormal | OK | VIEW |
| 23 | Face Cnsta Total Base Imponible | OK | VIEW |
| 24 | Face Cnsta Total Base Imponible FacturaNormal | OK | VIEW |
| 25 | Face Cnsta Descuento Copago | OK | VIEW |
| 26 | Face Cnsta ObservacionesFacturas | OK | VIEW |
