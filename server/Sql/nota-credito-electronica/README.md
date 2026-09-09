# Trazabilidad de notas crédito electrónicas

Scripts exclusivos de la tabla `dbo.NotaCreditoElectronica`.

- `create.sql`: instalación nueva; requiere que la tabla no exista.
- `alter.sql`: instalación o actualización idempotente para una base existente.

## Uso recomendado

En una base del cliente ejecute `alter.sql`. El script crea la tabla cuando no
existe y agrega columnas o restricciones faltantes cuando ya existe.

La tabla relaciona cada nota crédito electrónica con `dbo.Factura` mediante
`[Id Factura]` y registra el resultado enviado a Facturatech.

