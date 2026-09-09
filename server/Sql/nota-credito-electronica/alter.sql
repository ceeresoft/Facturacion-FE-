/*
  Instalación/actualización idempotente de la trazabilidad de notas crédito.
  Recomendado para bases de datos existentes.
*/

SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.NotaCreditoElectronica', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[NotaCreditoElectronica] (
    [IdNotaCreditoElectronica] BIGINT IDENTITY(1,1) NOT NULL,
    [Id Factura] INT NOT NULL,
    [IdEmpresaV] INT NOT NULL,
    [NumeroFactura] NVARCHAR(50) NOT NULL,
    [PrefijoFactura] NVARCHAR(20) NULL,
    [NumeroNotaCredito] NVARCHAR(50) NOT NULL,
    [PrefijoNotaCredito] NVARCHAR(20) NOT NULL,
    [CufeFacturaReferenciada] NVARCHAR(200) NULL,
    [ArchivoXml] NVARCHAR(260) NULL,
    [Estado] NVARCHAR(40) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_Estado] DEFAULT (N'GENERADA'),
    [CodigoFacturatech] INT NULL,
    [TransaccionID] NVARCHAR(200) NULL,
    [MensajeFacturatech] NVARCHAR(MAX) NULL,
    [FechaCreacion] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_FechaCreacion]
      DEFAULT (SYSDATETIME()),
    [FechaEnvio] DATETIME2(0) NULL,
    [FechaActualizacion] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_FechaActualizacion]
      DEFAULT (SYSDATETIME()),
    CONSTRAINT [PK_NotaCreditoElectronica]
      PRIMARY KEY ([IdNotaCreditoElectronica]),
    CONSTRAINT [UQ_NotaCreditoElectronica_EmpresaNota]
      UNIQUE ([IdEmpresaV], [PrefijoNotaCredito], [NumeroNotaCredito]),
    CONSTRAINT [FK_NotaCreditoElectronica_Factura]
      FOREIGN KEY ([Id Factura]) REFERENCES dbo.Factura ([Id Factura])
  );

  PRINT N'Tabla dbo.NotaCreditoElectronica creada.';
END
ELSE
  PRINT N'Tabla dbo.NotaCreditoElectronica ya existe; validando estructura.';
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'Id Factura') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [Id Factura] INT NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'IdEmpresaV') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [IdEmpresaV] INT NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'NumeroFactura') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [NumeroFactura] NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'PrefijoFactura') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [PrefijoFactura] NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'NumeroNotaCredito') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [NumeroNotaCredito] NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'PrefijoNotaCredito') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [PrefijoNotaCredito] NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'CufeFacturaReferenciada') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica
    ADD [CufeFacturaReferenciada] NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'ArchivoXml') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [ArchivoXml] NVARCHAR(260) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'Estado') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica
    ADD [Estado] NVARCHAR(40) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_Estado] DEFAULT (N'GENERADA')
      WITH VALUES;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'CodigoFacturatech') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [CodigoFacturatech] INT NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'TransaccionID') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [TransaccionID] NVARCHAR(200) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'MensajeFacturatech') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica
    ADD [MensajeFacturatech] NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'FechaCreacion') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica
    ADD [FechaCreacion] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_FechaCreacion]
      DEFAULT (SYSDATETIME()) WITH VALUES;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'FechaEnvio') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica ADD [FechaEnvio] DATETIME2(0) NULL;
GO

IF COL_LENGTH('dbo.NotaCreditoElectronica', 'FechaActualizacion') IS NULL
  ALTER TABLE dbo.NotaCreditoElectronica
    ADD [FechaActualizacion] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_FechaActualizacion]
      DEFAULT (SYSDATETIME()) WITH VALUES;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.key_constraints
  WHERE [name] = N'UQ_NotaCreditoElectronica_EmpresaNota'
    AND [parent_object_id] = OBJECT_ID(N'dbo.NotaCreditoElectronica')
)
BEGIN
  ALTER TABLE dbo.NotaCreditoElectronica
    ADD CONSTRAINT [UQ_NotaCreditoElectronica_EmpresaNota]
    UNIQUE ([IdEmpresaV], [PrefijoNotaCredito], [NumeroNotaCredito]);
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE [name] = N'FK_NotaCreditoElectronica_Factura'
    AND [parent_object_id] = OBJECT_ID(N'dbo.NotaCreditoElectronica')
)
BEGIN
  ALTER TABLE dbo.NotaCreditoElectronica WITH CHECK
    ADD CONSTRAINT [FK_NotaCreditoElectronica_Factura]
    FOREIGN KEY ([Id Factura]) REFERENCES dbo.Factura ([Id Factura]);
END
GO

PRINT N'Trazabilidad de notas crédito electrónicas lista.';
GO

