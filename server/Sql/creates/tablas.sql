/*
  creates/tablas.sql
  CREATE TABLE — solo tablas propias de Facturacion-FE (IF NOT EXISTS).

  Generado desde Sql/sqlcripts.sql
  Regenerar todo:  node scripts/generateInstalarOActualizarSql.js
*/

SET NOCOUNT ON;
GO


PRINT N'=== CREATE TABLE: tablas Facturacion-FE ===';
GO

------------------------------------------------------------------------------
-- TABLA: Empresa
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[Empresa]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Empresa] (
    [Id Empresa] INT IDENTITY(1,1) NOT NULL,
    [Documento Empresa] NVARCHAR(50) NOT NULL,
    [Id Tipo de Documento] INT NULL,
    [Fecha Expedición Empresa] DATETIME NULL,
    [Id Ciudad] INT NULL,
    [Nombre Comercial Empresa] NVARCHAR(100) NULL,
    [Razon Social Empresa] NVARCHAR(100) NULL,
    [Fecha Inscripción Empresa] DATETIME NULL,
    [Código Empresa] NVARCHAR(50) NULL,
    [Observaciones Empresa] NVARCHAR(200) NULL,
    [Foto Empresa] NVARCHAR(100) NULL,
    [Id Estado] INT NULL,
    [NroIDPrestador] NVARCHAR(50) NULL,
    CONSTRAINT [PK_Empresa] PRIMARY KEY ([Documento Empresa])
  );
END
ELSE
  PRINT N'Tabla [Empresa] ya existe — omitida.';
GO


------------------------------------------------------------------------------
-- TABLA: EmpresaII
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[EmpresaII]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EmpresaII] (
    [Id EmpresaII] INT IDENTITY(1,1) NOT NULL,
    [Documento Empresa] NVARCHAR(50) NULL,
    [Id Tipo Empresa] INT NULL,
    [Id Actividad Económica] INT NULL,
    [Id Régimen Tributario] INT NULL,
    [Gran Contribuyente EmpresaII] BIT NOT NULL,
    [Autorretenedor EmpresaII] BIT NOT NULL,
    CONSTRAINT [PK_EmpresaII] PRIMARY KEY ([Id EmpresaII])
  );
END
ELSE
  PRINT N'Tabla [EmpresaII] ya existe — omitida.';
GO


------------------------------------------------------------------------------
-- TABLA: EmpresaIII
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[EmpresaIII]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EmpresaIII] (
    [Id EmpresaIII] INT IDENTITY(1,1) NOT NULL,
    [Documento Empresa] NVARCHAR(50) NULL,
    [Dirección EmpresaIII] NVARCHAR(255) NULL,
    [Id Ciudad] INT NULL,
    [Teléfono No 1 EmpresaIII] NVARCHAR(50) NULL,
    [Teléfono No 2 EmpresaIII] NVARCHAR(50) NULL,
    [Teléfono No 3 EmpresaIII] NVARCHAR(50) NULL,
    [Teléfono Fax 1 EmpresaIII] NVARCHAR(50) NULL,
    [Teléfono Fax 2 EmpresaIII] NVARCHAR(50) NULL,
    [E-mail 1 EmpresaIII] NVARCHAR(50) NULL,
    [E-mail 2 EmpresaIII] NVARCHAR(50) NULL,
    [Id Estado] INT NULL,
    CONSTRAINT [PK_EmpresaIII] PRIMARY KEY ([Id EmpresaIII])
  );
END
ELSE
  PRINT N'Tabla [EmpresaIII] ya existe — omitida.';
GO


------------------------------------------------------------------------------
-- TABLA: Tipo de Documento
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[Tipo de Documento]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Tipo de Documento] (
    [Id Tipo de Documento] INT IDENTITY(1,1) NOT NULL,
    [Código Tipo de Documento] NVARCHAR(50) NULL,
    [Tipo de Documento] NVARCHAR(50) NULL,
    [Descripción Tipo de Documento] NVARCHAR(200) NULL,
    [Orden Tipo de Documento] INT NULL,
    [Id Estado] INT NULL,
    [codigoDian] INT NULL,
    CONSTRAINT [PK_Tipo de Documento] PRIMARY KEY ([Id Tipo de Documento])
  );
END
ELSE
  PRINT N'Tabla [Tipo de Documento] ya existe — omitida.';
GO


------------------------------------------------------------------------------
-- TABLA: ConfiguracionFace
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[ConfiguracionFace]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[ConfiguracionFace] (
    [IdConfiguracionFace] INT IDENTITY(1,1) NOT NULL,
    [IdEmpresaV] INT NULL,
    [IdResolucionFactura] INT NULL,
    [IdresolucionNotaCredito] INT NULL,
    [IdresolucionNotaDebito] INT NULL,
    [VersionGraficaFactura] INT NULL,
    [VersionGraficaFacturaNC] INT NULL,
    [VersionGraficaFacturaND] INT NULL,
    CONSTRAINT [PK_ConfiguracionFace] PRIMARY KEY ([IdConfiguracionFace])
  );
END
ELSE
  PRINT N'Tabla [ConfiguracionFace] ya existe — omitida.';
GO


------------------------------------------------------------------------------
-- TABLA: NotaCreditoElectronica
------------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.[NotaCreditoElectronica]', N'U') IS NULL
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
      CONSTRAINT [DF_NotaCreditoElectronica_FechaCreacion] DEFAULT (SYSDATETIME()),
    [FechaEnvio] DATETIME2(0) NULL,
    [FechaActualizacion] DATETIME2(0) NOT NULL
      CONSTRAINT [DF_NotaCreditoElectronica_FechaActualizacion] DEFAULT (SYSDATETIME()),
    CONSTRAINT [PK_NotaCreditoElectronica]
      PRIMARY KEY ([IdNotaCreditoElectronica]),
    CONSTRAINT [UQ_NotaCreditoElectronica_EmpresaNota]
      UNIQUE ([IdEmpresaV], [PrefijoNotaCredito], [NumeroNotaCredito]),
    CONSTRAINT [FK_NotaCreditoElectronica_Factura]
      FOREIGN KEY ([Id Factura]) REFERENCES dbo.Factura ([Id Factura])
  );
END
ELSE
  PRINT N'Tabla [NotaCreditoElectronica] ya existe — omitida.';
GO


PRINT N'';
PRINT N'=== Facturacion-FE: script completado ===';
GO
