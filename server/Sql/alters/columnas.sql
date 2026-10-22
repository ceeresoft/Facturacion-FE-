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

-- CredencialesWSDLFacturaTech: asegurar columnas si la tabla ya existía incompleta
IF OBJECT_ID(N'dbo.CredencialesWSDLFacturaTech', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH('dbo.CredencialesWSDLFacturaTech', 'Usuario') IS NULL
  BEGIN
    ALTER TABLE dbo.CredencialesWSDLFacturaTech ADD [Usuario] NVARCHAR(100) NULL;
    PRINT N'Columna CredencialesWSDLFacturaTech.Usuario creada.';
  END

  IF COL_LENGTH('dbo.CredencialesWSDLFacturaTech', 'Contrasena') IS NULL
  BEGIN
    ALTER TABLE dbo.CredencialesWSDLFacturaTech ADD [Contrasena] NVARCHAR(100) NULL;
    PRINT N'Columna CredencialesWSDLFacturaTech.Contrasena creada.';
  END

  IF COL_LENGTH('dbo.CredencialesWSDLFacturaTech', 'Documento Empresa') IS NULL
  BEGIN
    ALTER TABLE dbo.CredencialesWSDLFacturaTech ADD [Documento Empresa] NVARCHAR(50) NULL;
    PRINT N'Columna CredencialesWSDLFacturaTech.[Documento Empresa] creada.';
  END

  IF COL_LENGTH('dbo.CredencialesWSDLFacturaTech', 'URL SOAP') IS NULL
  BEGIN
    ALTER TABLE dbo.CredencialesWSDLFacturaTech ADD [URL SOAP] NVARCHAR(200) NULL;
    PRINT N'Columna CredencialesWSDLFacturaTech.[URL SOAP] creada.';
  END

  IF COL_LENGTH('dbo.CredencialesWSDLFacturaTech', 'Id Facturador') IS NULL
  BEGIN
    ALTER TABLE dbo.CredencialesWSDLFacturaTech ADD [Id Facturador] INT NULL;
    PRINT N'Columna CredencialesWSDLFacturaTech.[Id Facturador] creada.';
  END
END
ELSE
  PRINT N'Tabla CredencialesWSDLFacturaTech aún no existe — se crea en creates/tablas.sql.';
GO

PRINT N'';
PRINT N'=== Facturacion-FE: script completado ===';
GO
