/*
  alters/columnas.sql
  ALTER TABLE — columnas requeridas por Facturacion-FE en tablas existentes.

  Generado desde Sql/sqlcripts.sql
  Regenerar todo:  node scripts/generateInstalarOActualizarSql.js
*/

SET NOCOUNT ON;
GO


PRINT N'=== ALTER TABLE: columnas Facturacion-FE ===';
GO

IF COL_LENGTH('dbo.Factura', 'EstadoFacturaElectronica') IS NULL
BEGIN
  ALTER TABLE dbo.Factura ADD EstadoFacturaElectronica INT NULL;
  PRINT N'Columna Factura.EstadoFacturaElectronica creada.';
END
ELSE
  PRINT N'Columna Factura.EstadoFacturaElectronica ya existe.';
GO

IF COL_LENGTH('dbo.[Nota Crédito]', 'EstadoFace') IS NULL
BEGIN
  ALTER TABLE dbo.[Nota Crédito] ADD EstadoFace INT NULL;
  PRINT N'Columna [Nota Crédito].EstadoFace creada.';
END
ELSE
  PRINT N'Columna [Nota Crédito].EstadoFace ya existe.';
GO

IF COL_LENGTH('dbo.[Tipo de Documento]', 'codigoDian') IS NULL
BEGIN
  ALTER TABLE dbo.[Tipo de Documento] ADD codigoDian INT NULL;
  PRINT N'Columna [Tipo de Documento].codigoDian creada.';
END
ELSE
  PRINT N'Columna [Tipo de Documento].codigoDian ya existe.';
GO

PRINT N'';
PRINT N'=== Facturacion-FE: script completado ===';
GO
