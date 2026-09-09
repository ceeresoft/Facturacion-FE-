/*
  Instalación nueva de la trazabilidad de notas crédito electrónicas.
  Ejecutar únicamente cuando dbo.NotaCreditoElectronica no exista.
*/

SET NOCOUNT ON;
GO

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
GO

PRINT N'Tabla dbo.NotaCreditoElectronica creada.';
GO

