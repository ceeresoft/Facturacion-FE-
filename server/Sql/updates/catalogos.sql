/*
  updates/catalogos.sql
  INSERT / UPDATE de datos de catalogo (Tipo Empresa, codigos DIAN).

  Generado desde Sql/sqlcripts.sql
  Regenerar todo:  node scripts/generateInstalarOActualizarSql.js
*/

SET NOCOUNT ON;
GO


PRINT N'=== UPDATE / INSERT: catalogos Facturacion-FE ===';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[Tipo Empresa] WHERE [Id Tipo Empresa] = 5)
BEGIN
  SET IDENTITY_INSERT dbo.[Tipo Empresa] ON;
  INSERT INTO dbo.[Tipo Empresa] (
    [Id Tipo Empresa],
    [Código Tipo Empresa],
    [Tipo Empresa],
    [Descripción Tipo Empresa],
    [Orden Tipo Empresa],
    [Id Estado]
  )
  VALUES (5, 1, N'Juridica', NULL, 1, 1);
  SET IDENTITY_INSERT dbo.[Tipo Empresa] OFF;
  PRINT N'Registro Tipo Empresa Id=5 (Juridica) insertado.';
END
ELSE
  PRINT N'Registro Tipo Empresa Id=5 ya existe — omitido.';
GO

IF NOT EXISTS (SELECT 1 FROM dbo.[Tipo Empresa] WHERE [Id Tipo Empresa] = 6)
BEGIN
  SET IDENTITY_INSERT dbo.[Tipo Empresa] ON;
  INSERT INTO dbo.[Tipo Empresa] (
    [Id Tipo Empresa],
    [Código Tipo Empresa],
    [Tipo Empresa],
    [Descripción Tipo Empresa],
    [Orden Tipo Empresa],
    [Id Estado]
  )
  VALUES (6, 2, N'Natural', NULL, 1, 1);
  SET IDENTITY_INSERT dbo.[Tipo Empresa] OFF;
  PRINT N'Registro Tipo Empresa Id=6 (Natural) insertado.';
END
ELSE
  PRINT N'Registro Tipo Empresa Id=6 ya existe — omitido.';
GO

UPDATE dbo.[Tipo de Documento] SET codigoDian = NULL WHERE [Id Tipo de Documento] = 1;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 13   WHERE [Id Tipo de Documento] = 2;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 22   WHERE [Id Tipo de Documento] = 3;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 41   WHERE [Id Tipo de Documento] = 4;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 11   WHERE [Id Tipo de Documento] = 5;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 12   WHERE [Id Tipo de Documento] = 6;
UPDATE dbo.[Tipo de Documento] SET codigoDian = NULL WHERE [Id Tipo de Documento] = 7;
UPDATE dbo.[Tipo de Documento] SET codigoDian = NULL WHERE [Id Tipo de Documento] = 8;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 31   WHERE [Id Tipo de Documento] = 9;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 31   WHERE [Id Tipo de Documento] = 10;
UPDATE dbo.[Tipo de Documento] SET codigoDian = 13   WHERE [Id Tipo de Documento] = 11;
GO

PRINT N'Codigos DIAN actualizados en [Tipo de Documento].';
GO

PRINT N'';
PRINT N'=== Facturacion-FE: script completado ===';
GO
