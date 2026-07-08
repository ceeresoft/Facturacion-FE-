/*
  sqlcripts.sql — respaldo de CREATE (vistas/tablas) usados por Facturacion-FE.
  Extraídos desde la base (CeereSio) el 2026-07-08.
  Copia de las definiciones guardadas a partir del inventario del proyecto.

  Resumen inventario:
    - EXISTEN: 24 objetos
    - NO EXISTEN en esta base:
        [Face Cnsta FacturaParticular]
        [Face Cnsta FacturaSaldos]
      (el código las usa según guías de tipo de factura; si no existen,
       esas ramas de detalle fallarán hasta crearlas o ajustar el router)

  NOTA: las tablas se scriptaron desde columnas + PK (sin FKs ni índices extra).
  Las vistas son la definición real del motor (OBJECT_DEFINITION).
*/

------------------------------------------------------------------------------
-- 1) Face Cnsta Login
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta Login]
AS
SELECT
  dbo.Contraseña.[Nombre de Usuario] AS NombreUsuario,
  dbo.Contraseña.Contraseña AS passwordUsuario,
  dbo.Entidad.[Nombre Completo Entidad] AS NomUsuario,
  dbo.Contraseña.[Documento Entidad] AS DocumentoUsuario
FROM dbo.Contraseña
INNER JOIN dbo.Entidad
  ON dbo.Contraseña.[Documento Entidad] = dbo.Entidad.[Documento Entidad]
GO

------------------------------------------------------------------------------
-- 2) face Cnsta Empresa
------------------------------------------------------------------------------
CREATE VIEW [dbo].[face Cnsta Empresa]
AS
SELECT
  dbo.Empresa.[Id Empresa],
  dbo.Empresa.[Documento Empresa],
  dbo.Empresa.[Id Tipo de Documento],
  dbo.[Tipo de Documento].[Tipo de Documento],
  dbo.[Tipo de Documento].[Descripción Tipo de Documento],
  dbo.Empresa.[Nombre Comercial Empresa],
  dbo.Empresa.[Razon Social Empresa],
  dbo.EmpresaIII.[Dirección EmpresaIII],
  dbo.EmpresaIII.[Teléfono No 1 EmpresaIII],
  dbo.EmpresaIII.[Teléfono No 2 EmpresaIII],
  dbo.EmpresaIII.[Teléfono No 3 EmpresaIII],
  dbo.EmpresaIII.[E-mail 1 EmpresaIII],
  dbo.EmpresaIII.[E-mail 2 EmpresaIII]
FROM dbo.Empresa
INNER JOIN dbo.[Tipo de Documento]
  ON dbo.Empresa.[Id Tipo de Documento] = dbo.[Tipo de Documento].[Id Tipo de Documento]
INNER JOIN dbo.EmpresaII
  ON dbo.Empresa.[Documento Empresa] = dbo.EmpresaII.[Documento Empresa]
INNER JOIN dbo.EmpresaIII
  ON dbo.Empresa.[Documento Empresa] = dbo.EmpresaIII.[Documento Empresa]
GO

------------------------------------------------------------------------------
-- 3) Empresa
------------------------------------------------------------------------------
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
GO

------------------------------------------------------------------------------
-- 4) EmpresaII
------------------------------------------------------------------------------
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
GO

------------------------------------------------------------------------------
-- 5) EmpresaIII
------------------------------------------------------------------------------
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
GO

------------------------------------------------------------------------------
-- 6) Tipo de Documento
------------------------------------------------------------------------------
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
GO

------------------------------------------------------------------------------
-- 7) face_ConsultaEmpresaV
------------------------------------------------------------------------------
CREATE VIEW [dbo].[face_ConsultaEmpresaV]
AS
SELECT
  [Id EmpresaV] AS IDempresaV,
  [Resolución Facturación EmpresaV] AS resolucionSIO,
  [Prefijo Resolución Facturación EmpresaV] AS prefijoSIO,
  [Id Estado] AS EstadoEmpresaV
FROM dbo.EmpresaV
WHERE ([Id Estado] = 7)
  AND ([Resolución Facturación EmpresaV] IS NOT NULL)
GO

------------------------------------------------------------------------------
-- 8) face_facturaPorUsuario
------------------------------------------------------------------------------
CREATE VIEW [dbo].[face_facturaPorUsuario]
AS
SELECT
  [No Factura] AS NoFactura,
  [Id EmpresaV] AS IdEmpresaV,
  [Documento Usuario],
  EstadoFacturaElectronica,
  [Id Estado],
  [Fecha Factura]
FROM dbo.Factura
WHERE (EstadoFacturaElectronica IS NULL)
   OR (EstadoFacturaElectronica = 1) AND ([Id Estado] = 5)
   OR (EstadoFacturaElectronica = 2) AND ([Id Estado] = 5)
   OR (EstadoFacturaElectronica = 3) AND ([Id Estado] = 5)
GO

------------------------------------------------------------------------------
-- 9) Face Cnsta Factura
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta Factura]
AS
SELECT DISTINCT
  f.[Id EmpresaV] AS IdEmpresaV,
  f.[No Factura] AS NroFactura,
  f.[Fecha Factura] AS FechaFactura,
  f.[Fecha Digitación Factura] AS FechaDigitacionFactura,
  f.[Iva Factura] AS TotalIvaFactura,
  f.[Valor Acumulado Factura] AS SubTotalFactura,
  f.[Total Factura] - f.[Retención Iva Factura] - f.[Retención Otros Factura] - f.[Retención en la Fuente Factura] AS TotalFactura,
  f.[Id Condición de Pago Factura] AS IdCondicionPagoFactura,
  rcII.[Id Forma de Pago] AS IdFormadePago,
  fp.[Forma de Pago] AS FormaDePago,
  b.Banco,
  rcII.[Número Cuenta Recibo de CajaII] AS NumeroCuentaCredito,
  rcII.[Número Comprobante Recibo de CajaII] AS NumeroComprobanteCredito,
  f.[Descuentos Factura] AS DescuentoFactura,
  f.[Descuento Adicional % Factura] AS PorcentajeDescuentoFactura,
  emV.[Resolución Facturación EmpresaV] AS ResolucionFactura,
  emV.[Prefijo Resolución Facturación EmpresaV] AS PrefijoFactura,
  f.[Id Estado] AS EstadoFactura,
  emV.[Id Estado] AS [EstadoEmpresa.V],
  e.Estado AS DescripEstadoFactura,
  f.EstadoFacturaElectronica,
  f.[Valor En Letras Factura] AS valorLetrasFactura,
  f.[Documento Usuario] AS DocumentoUsuarioFactura,
  f.[Id Terminal] AS IdTerminal,
  f.[Fecha Vencimiento Factura] AS FechaVencimientoFactura,
  f.[Observaciones Factura] AS ObservacionesFactura,
  f.[Retención en la Fuente Factura] AS ReteFuenteFactura,
  f.[Retención Iva Factura] AS ReteIvaFactura,
  f.[Retención Otros Factura] AS ReteOtrosFactura,
  f.[Descuento Adicional $ Factura] AS DescuentoGeneral,
  f.[Valor Acumulado Factura] - f.[Descuentos Factura] AS TotalBrutoDesc,
  f.[Valor Acumulado Factura] - f.[Descuentos Factura] + f.[Iva Factura] AS TotalBrutoImpDesc,
  f.[Retención Iva Factura] / (f.[Valor Acumulado Factura] - f.[Descuentos Factura]) * 100 AS PorcentajeReteIva,
  f.[Retención en la Fuente Factura] / (f.[Valor Acumulado Factura] - f.[Descuentos Factura]) * 100 AS PorcentajeReteFuente,
  f.[Retención Otros Factura] / (f.[Valor Acumulado Factura] - f.[Descuentos Factura]) * 100 AS PorcentajeReteIca,
  CONVERT(varchar, f.[Fecha Factura], 8) AS horaFactura,
  emV.FinResoNc,
  emV.FechafinalReso,
  emV.InicioResoNC,
  emV.FechaResolucionNC,
  emV.ResolucionNC,
  emV.PrefijoNC,
  dbo.Empresa.[Código Empresa] AS CodigoEmpresa
FROM dbo.Empresa
INNER JOIN dbo.Estado AS e
INNER JOIN dbo.Factura AS f
INNER JOIN dbo.EmpresaV AS emV
  ON f.[Id EmpresaV] = emV.[Id EmpresaV]
  ON e.[Id Estado] = f.[Id Estado]
  ON dbo.Empresa.[Documento Empresa] = emV.[Documento Empresa]
LEFT OUTER JOIN dbo.[Forma de Pago] AS fp
INNER JOIN dbo.[Recibo de CajaII] AS rcII
INNER JOIN dbo.[Recibo de Caja] AS rc
  ON rcII.[Id Recibo de Caja] = rc.[Id Recibo de Caja]
INNER JOIN dbo.Banco AS b
  ON b.[Id Banco] = rcII.[Id Banco]
  ON fp.[Id Forma de Pago] = rcII.[Id Forma de Pago]
  ON f.[Id Factura] = rc.[Id Factura]
WHERE (emV.[Id Estado] = 7)
GO

------------------------------------------------------------------------------
-- 10) Face Cnsta FacturaE Empresa
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta FacturaE Empresa]
AS
SELECT
  dbo.Empresa.[Documento Empresa] AS IdEmpresa,
  dbo.Empresa.[Código Empresa] AS CodPrestador,
  dbo.Factura.[No Factura] AS NroFactura,
  dbo.Empresa.[Id Tipo de Documento],
  UPPER(dbo.Empresa.[Razon Social Empresa]) AS NombreEmpresa,
  dbo.Departamento.Departamento AS DepartamentoEmpresa,
  UPPER(dbo.Ciudad.Ciudad) AS CiudadEmpresa,
  dbo.EmpresaIII.[Dirección EmpresaIII] AS DireccionEmpresa,
  dbo.EmpresaII.[Id Régimen Tributario] AS RegimenEmpresa,
  dbo.[Tipo de Documento].[Descripción Tipo de Documento] AS DescripcionTipoDocumentoEmpresa,
  dbo.EmpresaIII.[E-mail 1 EmpresaIII] AS EmailEmpresa,
  dbo.EmpresaV.[Id EmpresaV] AS IdEmpresaV,
  dbo.[Tipo de Documento].codigoDian AS IdTipoDocumentoEmpresa,
  dbo.Departamento.[Código Departamento] AS codigoDepartamentoEmpresa,
  dbo.País.[Código País] AS codigoPaisEmpresa,
  SUBSTRING(dbo.Empresa.[Documento Empresa], 11, 12) AS digitoVerificacionEmpresa,
  dbo.Ciudad.[Código Ciudad] AS codigoCiudadEmpresa,
  dbo.EmpresaV.[Resolución Facturación EmpresaV] AS resolucionEmpresa,
  dbo.EmpresaV.[Fecha Resolución Facturación EmpresaV] AS fechaIniResolucionEmpresa,
  dbo.EmpresaV.[Fecha Final Resolucion Facturacion Empresa] AS fechaFinalResolucionEmpresa,
  dbo.EmpresaV.Barrio AS BarrioEmpresa,
  SUBSTRING(dbo.Empresa.[Documento Empresa], 0, 10) AS DocumentoSinDigito,
  dbo.[Tipo Empresa].[Código Tipo Empresa] AS codigoTipoEmpresa,
  UPPER(dbo.País.[Descripción País]) AS PaisEmpresaEmi,
  dbo.EmpresaV.[Nro Inicio Resolución Facturación EmpresaV] AS NumeroInicioResolucion,
  dbo.EmpresaV.[Nro Fin Resolución Facturación EmpresaV] AS NumeroFinResolucion,
  dbo.EmpresaIII.[Teléfono No 1 EmpresaIII] AS TelefonoEmpresa,
  dbo.Factura.[Nro de Items Factura] AS NroItemsFactura,
  dbo.Factura.[Cantidad de Artículos Factura] AS CantidadArticulosFactura
FROM dbo.Empresa
INNER JOIN dbo.EmpresaIII
  ON dbo.Empresa.[Documento Empresa] = dbo.EmpresaIII.[Documento Empresa]
INNER JOIN dbo.Ciudad
  ON dbo.Empresa.[Id Ciudad] = dbo.Ciudad.[Id Ciudad]
 AND dbo.EmpresaIII.[Id Ciudad] = dbo.Ciudad.[Id Ciudad]
INNER JOIN dbo.Departamento
  ON dbo.Ciudad.[Id Departamento] = dbo.Departamento.[Id Departamento]
INNER JOIN dbo.Factura
  ON dbo.Empresa.[Documento Empresa] = dbo.Factura.[Documento Empresa]
INNER JOIN dbo.EmpresaII
  ON dbo.Empresa.[Documento Empresa] = dbo.EmpresaII.[Documento Empresa]
INNER JOIN dbo.[Tipo de Documento]
  ON dbo.Empresa.[Id Tipo de Documento] = dbo.[Tipo de Documento].[Id Tipo de Documento]
INNER JOIN dbo.EmpresaV
  ON dbo.Empresa.[Documento Empresa] = dbo.EmpresaV.[Documento Empresa]
 AND dbo.Factura.[Id EmpresaV] = dbo.EmpresaV.[Id EmpresaV]
INNER JOIN dbo.País
  ON dbo.Departamento.[Id País] = dbo.País.[Id País]
INNER JOIN dbo.[Tipo Empresa]
  ON dbo.EmpresaII.[Id Tipo Empresa] = dbo.[Tipo Empresa].[Id Tipo Empresa]
GO

------------------------------------------------------------------------------
-- 11) Face Cnsta FacturaE Entidad
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta FacturaE Entidad]
AS
SELECT DISTINCT
  en.[Documento Entidad] AS DocumentoEntidad,
  en.[Primer Apellido Entidad] AS PrimerApellidoEntidad,
  en.[Segundo Apellido Entidad] AS SegundoApellidoEntidad,
  en.[Primer Nombre Entidad] AS PrimerNombreEntidad,
  en.[Segundo Nombre Entidad] AS SegundoNombreEntidad,
  en.[Nombre Completo Entidad] AS NombreCompletoEntidad,
  e.[Dirección EntidadII] AS DireccionEntidad,
  c.[Código Ciudad] AS CodigoCiudad,
  UPPER(c.Ciudad) AS NombreCiudadEntidad,
  d.[Código Departamento] AS CodigoDepartamentoEntidad,
  d.Departamento AS NombreDepartamentoEntidad,
  d.[Id País] AS codigoPais,
  b.Barrio AS BarrioCiudad,
  td.[Id Tipo de Documento] AS IdTipoDocumentoEntidad,
  td.[Descripción Tipo de Documento] AS DescripcionDocumentoEntidad,
  e.[E-mail Nro 1 EntidadII] AS EmailEntidad,
  exx.[Autorretenedor EntidadXX] AS AutoRetenedor,
  exx.[Gran Contribuyente EntidadXX] AS GranContribuyente,
  exx.[Id Régimen Tributario] AS regimenEntidad,
  ae.[Código Actividad Económica] AS ActividadEconomicaEntidad,
  f.[No Factura] AS NroFactura,
  dbo.EmpresaV.[Id EmpresaV] AS IdEmpresaV,
  e.[Teléfono No 1 EntidadII] AS Telefono1Entidad,
  e.[Teléfono No 2 EntidadII] AS Telefono2Entidad,
  e.[Teléfono Celular EntidadII] AS TelefonoCelularEntidad,
  td.codigoDian,
  SUBSTRING(en.[Documento Entidad], 11, 12) AS digitoVerificacion,
  SUBSTRING(en.[Documento Entidad], 0, 10) AS documentoNit,
  dbo.País.[Código País] AS CodigoPaisEntidad,
  UPPER(dbo.País.[Descripción País]) AS PaisEntidad,
  f.[Id Factura] AS IdFactura
FROM dbo.EmpresaV
INNER JOIN dbo.[Tipo de Documento] AS td
INNER JOIN dbo.Factura AS f
INNER JOIN dbo.Entidad AS en
  ON f.[Documento Responsable] = en.[Documento Entidad]
  ON td.[Id Tipo de Documento] = en.[Id Tipo de Documento]
INNER JOIN dbo.Ciudad AS c
INNER JOIN dbo.EntidadII AS e
INNER JOIN dbo.Barrio AS b
  ON e.[Id Barrio] = b.[Id Barrio]
  ON c.[Id Ciudad] = e.[Id Ciudad]
INNER JOIN dbo.Departamento AS d
  ON d.[Id Departamento] = c.[Id Departamento]
  ON en.[Documento Entidad] = e.[Documento Entidad]
  ON dbo.EmpresaV.[Id EmpresaV] = f.[Id EmpresaV]
INNER JOIN dbo.País
  ON d.[Id País] = dbo.País.[Id País]
LEFT OUTER JOIN dbo.[Actividad Económica] AS ae
INNER JOIN dbo.EntidadXX AS exx
  ON ae.[Id Actividad Económica] = exx.[Id Actividad Económica]
  ON e.[Documento Entidad] = exx.[Documento Entidad]
GO

------------------------------------------------------------------------------
-- 12) Face Cnsta TipoDeFactura
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta TipoDeFactura]
AS
SELECT DISTINCT
  CHARINDEX('Atención', dbo.FacturaII.[Descripción FacturaII]) AS GuiaFactura,
  dbo.FacturaII.[Descripción FacturaII] AS DescripcionCopago,
  dbo.Factura.[No Factura] AS NroFactura,
  dbo.Factura.[Id EmpresaV] AS IdEmpresaV,
  dbo.FacturaII.[Id FacturaII] AS IdFacturaItem,
  CHARINDEX('Cuota', dbo.FacturaII.[Descripción FacturaII]) AS GuiaFacturaNormal,
  CHARINDEX('de Saldo', dbo.FacturaII.[Descripción FacturaII]) AS GuiaSaldos,
  SUBSTRING(
    SUBSTRING(dbo.FacturaII.[Descripción FacturaII], CHARINDEX('de Saldo No ', dbo.FacturaII.[Descripción FacturaII]), 20),
    CHARINDEX('No ', SUBSTRING(dbo.FacturaII.[Descripción FacturaII], CHARINDEX('de Saldo No ', dbo.FacturaII.[Descripción FacturaII]) - 3, 20)),
    20
  ) AS NumeroSaldo,
  ISNULL(dbo.[Face Cnsta NumeroItems].CantidadItem, 1) AS GuiaCantidadPresupuesto,
  CHARINDEX('Abono', dbo.FacturaII.[Descripción FacturaII]) AS GuiaAbono,
  dbo.[Face Cnsta GuiaCuotaInicial].[Id Plan de Tratamiento],
  dbo.[Face Cnsta GuiaCuotaInicial].GuiaCuotaInicial,
  dbo.[Face Cnsta GuiaCuotasNoAnticipos].GuiaCuotasNoAnticipos
FROM dbo.Factura
INNER JOIN dbo.FacturaII
  ON dbo.Factura.[Id Factura] = dbo.FacturaII.[Id Factura]
LEFT OUTER JOIN dbo.[Face Cnsta GuiaCuotasNoAnticipos]
  ON dbo.Factura.[No Factura] = dbo.[Face Cnsta GuiaCuotasNoAnticipos].[No Factura]
LEFT OUTER JOIN dbo.[Face Cnsta GuiaCuotaInicial]
  ON dbo.FacturaII.[Id Plan de Tratamiento] = dbo.[Face Cnsta GuiaCuotaInicial].[Id Plan de Tratamiento]
LEFT OUTER JOIN dbo.[Face Cnsta NumeroItems]
  ON dbo.FacturaII.[Id Plan de Tratamiento] = dbo.[Face Cnsta NumeroItems].[Id Plan de Tratamiento]
GO

------------------------------------------------------------------------------
-- 13) Face Cnsta FacturaCopago
------------------------------------------------------------------------------
CREATE VIEW dbo.[Face Cnsta FacturaCopago]
AS
SELECT
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII] - dbo.FacturaII.[Descuento $ FacturaII], 0) AS ValorTotalItem,
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII], 0) AS BaseItemDescuento,
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII] - dbo.FacturaII.[Descuento $ FacturaII], 0) AS BaseItemIva,
  ROUND(dbo.FacturaII.[Valor Iva $ FacturaII], 0) AS ValorIvaItem,
  ROUND(dbo.FacturaII.[Valor FacturaII], 0) AS ValorItem,
  dbo.FacturaII.[Valor Iva % FacturaII] AS PorcentajeIvaItem,
  dbo.FacturaII.[Cantidad FacturaII] AS CantidadItem,
  dbo.FacturaII.[Descripción FacturaII] AS DescripcionItem,
  dbo.FacturaII.[Id FacturaII] AS IdFacturaItem,
  dbo.Factura.[No Factura] AS NroFactura,
  dbo.FacturaII.[Descuento $ FacturaII] AS ValorDescuentoItem,
  dbo.FacturaII.[Código Objeto] AS codigoObjetoItem,
  dbo.Factura.[Id EmpresaV] AS IdEmpresaV,
  dbo.EmpresaV.[Id Estado] AS IdEstadoEmpresaV,
  dbo.FacturaII.[Descuento % FacturaII] AS PorcentajeDescuentoItem,
  dbo.Entidad.[Documento Entidad] AS DocumentoPacienteEPS,
  dbo.Entidad.[Nombre Completo Entidad] AS NombrePacienteEPS
FROM dbo.FacturaII
INNER JOIN dbo.Factura
  ON dbo.FacturaII.[Id Factura] = dbo.Factura.[Id Factura]
INNER JOIN dbo.EmpresaV
  ON dbo.Factura.[Id EmpresaV] = dbo.EmpresaV.[Id EmpresaV]
INNER JOIN dbo.Entidad
  ON dbo.Factura.[Documento Paciente] = dbo.Entidad.[Documento Entidad]
INNER JOIN dbo.[Plan de Tratamiento]
  ON dbo.Entidad.[Documento Entidad] = dbo.[Plan de Tratamiento].[Documento Paciente]
 AND dbo.FacturaII.[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
WHERE (dbo.EmpresaV.[Id Estado] = 7)
GO

------------------------------------------------------------------------------
-- 14) Face Cnsta FacturaAnticiposVariosItems
------------------------------------------------------------------------------
CREATE VIEW dbo.[Face Cnsta FacturaAnticiposVariosItems]
AS
SELECT
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII] - dbo.FacturaII.[Descuento $ FacturaII], 0) AS ValorTotalItem,
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII], 0) AS BaseItemDescuento,
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII] - dbo.FacturaII.[Descuento $ FacturaII], 0) AS Expr1,
  dbo.FacturaII.[Valor Iva $ FacturaII] AS ValorIvaItem,
  dbo.FacturaII.[Valor FacturaII] AS ValorItem,
  dbo.FacturaII.[Valor Iva % FacturaII] AS PorcentajeIvaItem,
  dbo.FacturaII.[Cantidad FacturaII] AS CantidadItem,
  dbo.FacturaII.[Descripción FacturaII] AS DescripcionItemOld,
  dbo.FacturaII.[Id FacturaII] AS IdFacturaItem,
  dbo.Factura.[No Factura] AS NroFactura,
  dbo.FacturaII.[Descuento $ FacturaII] AS ValorDescuentoItem,
  dbo.FacturaII.[Código Objeto] AS codigoObjetoItem,
  dbo.Factura.[Id EmpresaV] AS IdEmpresaV,
  dbo.EmpresaV.[Id Estado] AS IdEstadoEmpresaV,
  dbo.FacturaII.[Descuento % FacturaII] AS PorcentajeDescuentoItem,
  dbo.Entidad.[Nombre Completo Entidad] AS Vendedor,
  dbo.[Plan de Tratamiento].[Documento Paciente] AS DocumentoPacienteEPS,
  Entidad_1.[Nombre Completo Entidad] AS NombrePacienteEPS,
  dbo.Objeto.[Descripción Objeto] AS DescripcionItem,
  SUM(dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items]) AS ValorConCopago,
  dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
FROM dbo.FacturaII
INNER JOIN dbo.Factura
  ON dbo.FacturaII.[Id Factura] = dbo.Factura.[Id Factura]
INNER JOIN dbo.EmpresaV
  ON dbo.Factura.[Id EmpresaV] = dbo.EmpresaV.[Id EmpresaV]
INNER JOIN dbo.Entidad
  ON dbo.Factura.[Documento Paciente] = dbo.Entidad.[Documento Entidad]
INNER JOIN dbo.[Plan de Tratamiento]
  ON dbo.FacturaII.[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
INNER JOIN dbo.Entidad AS Entidad_1
  ON dbo.[Plan de Tratamiento].[Documento Paciente] = Entidad_1.[Documento Entidad]
INNER JOIN dbo.Objeto
  ON dbo.FacturaII.[Código Objeto] = dbo.Objeto.[Código Objeto]
INNER JOIN dbo.[Plan de Tratamiento Items]
  ON dbo.[Plan de Tratamiento].[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento Items].[Id Plan de Tratamiento]
GROUP BY
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII] - dbo.FacturaII.[Descuento $ FacturaII], 0),
  ROUND(dbo.FacturaII.[Valor FacturaII] * dbo.FacturaII.[Cantidad FacturaII], 0),
  dbo.FacturaII.[Valor Iva $ FacturaII],
  dbo.FacturaII.[Valor FacturaII],
  dbo.FacturaII.[Valor Iva % FacturaII],
  dbo.FacturaII.[Cantidad FacturaII],
  dbo.FacturaII.[Descripción FacturaII],
  dbo.FacturaII.[Id FacturaII],
  dbo.Factura.[No Factura],
  dbo.FacturaII.[Descuento $ FacturaII],
  dbo.FacturaII.[Código Objeto],
  dbo.Factura.[Id EmpresaV],
  dbo.EmpresaV.[Id Estado],
  dbo.FacturaII.[Descuento % FacturaII],
  dbo.Entidad.[Nombre Completo Entidad],
  dbo.[Plan de Tratamiento].[Documento Paciente],
  Entidad_1.[Nombre Completo Entidad],
  dbo.Objeto.[Descripción Objeto],
  dbo.[Plan de Tratamiento].[Nro Plan de Tratamiento],
  dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
HAVING (dbo.EmpresaV.[Id Estado] = 7)
GO

------------------------------------------------------------------------------
-- 15) Face Cnsta FacturaParticular  *** NO EXISTE EN ESTA BASE ***
------------------------------------------------------------------------------
-- CREATE VIEW [dbo].[Face Cnsta FacturaParticular] AS ...
-- Pendiente: no está en CeereSio. El router de ítems la elige cuando
-- GuiaFactura=0 AND GuiaFacturaNormal IN (5,13) AND GuiaSaldos=0 AND GuiaCantidadPresupuesto=1

------------------------------------------------------------------------------
-- 16) Face Cnsta FacturaSaldos  *** NO EXISTE EN ESTA BASE ***
------------------------------------------------------------------------------
-- CREATE VIEW [dbo].[Face Cnsta FacturaSaldos] AS ...
-- Pendiente: no está en CeereSio. El router la elige cuando GuiaSaldos <> 0

------------------------------------------------------------------------------
-- 17) Face Cnsta FacturaEII
------------------------------------------------------------------------------
CREATE VIEW dbo.[Face Cnsta FacturaEII]
AS
SELECT
  ROUND((dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] - dbo.[Plan de Tratamiento Items].[Descuento $ Plan de Tratamiento Items]) * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items], 0) AS ValorTotalItemOld,
  ROUND(dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items], 0) AS BaseItemDescuento,
  ROUND((dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] - dbo.[Plan de Tratamiento Items].[Descuento $ Plan de Tratamiento Items]) * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items], 0) AS BaseItemIva,
  ROUND(((dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] - dbo.[Plan de Tratamiento Items].[Descuento $ Plan de Tratamiento Items]) * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items]) * (dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] / 100), 0) AS ValorIvaItem,
  dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] AS ValorItem,
  dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] AS PorcentajeIvaItem,
  dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items] AS CantidadItem,
  dbo.Objeto.[Descripción Objeto] AS DescripcionItemOld,
  dbo.Subcapítulo.Subcapítulo AS DescripcionItem,
  dbo.FacturaII.[Id FacturaII] AS IdFacturaItem,
  dbo.Factura.[No Factura] AS NroFactura,
  dbo.[Plan de Tratamiento Items].[Descuento $ Plan de Tratamiento Items] AS ValorDescuento,
  dbo.[Plan de Tratamiento Items].[Código Objeto] AS codigoObjetoItem,
  dbo.Factura.[Id EmpresaV] AS IdEmpresaV,
  dbo.EmpresaV.[Id Estado] AS IdEstadoEmpresaV,
  dbo.Entidad.[Nombre Completo Entidad] AS NombrePacienteEPS,
  dbo.[Plan de Tratamiento].[Documento Paciente] AS DocumentoPacienteEPS,
  dbo.[Plan de Tratamiento].[Nro Plan de Tratamiento],
  dbo.FacturaII.[Descripción FacturaII],
  ROUND((dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items] - CASE WHEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] > 0 THEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] ELSE 0 END) + dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * (dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] / 100), 0) AS ValorTotalMenosCopagoIva,
  ROUND(dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items] - CASE WHEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] > 0 THEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] ELSE 0 END, 0) AS ValorTotalItem,
  CASE WHEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] > 0 THEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] ELSE 0 END / (dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items] + dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] * (dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] / 100)) * 100 AS PorcentajeCopago,
  dbo.[Face Cnsta NumeroItems].CantidadItem AS CantidadDeItems,
  CASE WHEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] > 0 THEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] ELSE 0 END AS ValorDescuentoItem,
  CASE WHEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] > 0 THEN dbo.[Face Cnsta Cuotas].[Capital Faltante Cuotas Pactadas Inicial Tratamiento] ELSE 1 END AS Total
FROM dbo.FacturaII
INNER JOIN dbo.Factura
  ON dbo.FacturaII.[Id Factura] = dbo.Factura.[Id Factura]
INNER JOIN dbo.EmpresaV
  ON dbo.Factura.[Id EmpresaV] = dbo.EmpresaV.[Id EmpresaV]
INNER JOIN dbo.[Plan de Tratamiento]
  ON dbo.FacturaII.[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
INNER JOIN dbo.Entidad
  ON dbo.[Plan de Tratamiento].[Documento Paciente] = dbo.Entidad.[Documento Entidad]
INNER JOIN dbo.[Plan de Tratamiento Items]
  ON dbo.[Plan de Tratamiento].[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento Items].[Id Plan de Tratamiento]
INNER JOIN dbo.Objeto
  ON dbo.[Plan de Tratamiento Items].[Código Objeto] = dbo.Objeto.[Código Objeto]
INNER JOIN dbo.[Plan de Tratamiento Tratamientos]
  ON dbo.[Plan de Tratamiento].[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento Tratamientos].[Id Plan de Tratamiento]
INNER JOIN dbo.[Face Cnsta NumeroItems]
  ON dbo.[Plan de Tratamiento Items].[Id Plan de Tratamiento] = dbo.[Face Cnsta NumeroItems].[Id Plan de Tratamiento]
INNER JOIN dbo.Subcapítulo
  ON dbo.Objeto.[Id Subcapítulo] = dbo.Subcapítulo.[Id Subcapítulo]
LEFT OUTER JOIN dbo.[Face Cnsta Cuotas]
  ON dbo.[Plan de Tratamiento Tratamientos].[Id Plan de Tratamiento Tratamientos] = dbo.[Face Cnsta Cuotas].[Id Plan de Tratamiento Tratamientos]
WHERE (dbo.EmpresaV.[Id Estado] = 7)
GO

------------------------------------------------------------------------------
-- 18) Face Cnsta Salud Prepagada
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta Salud Prepagada]
AS
SELECT DISTINCT TOP (100) PERCENT
  fc.[Id Factura] AS IdFactura,
  fc.[No Factura] AS NoFactura,
  fc.[Id EmpresaV] AS IdEmpresaV,
  fc.[Fecha Factura] AS FechaFactura,
  CASE WHEN SUM(ctp.[Valor de Cuota Cuotas Pactadas Tratamiento]) IS NULL THEN 0 ELSE SUM(ctp.[Valor de Cuota Cuotas Pactadas Tratamiento]) END AS [Cobro a EPS],
  CASE WHEN SUM(cpit.[Valor de Cuota Cuotas Pactadas Inicial Tratamiento]) IS NULL THEN 0 ELSE SUM(cpit.[Valor de Cuota Cuotas Pactadas Inicial Tratamiento]) END AS Copagos,
  CASE
    WHEN fc.[Documento Responsable] <> pl.[Documento Responsable] THEN 'SS07'
    WHEN SUM(cpit.[Valor de Cuota Cuotas Pactadas Inicial Tratamiento]) IS NULL THEN 'SS06'
    ELSE 'SS01'
  END AS TipoFactura
FROM dbo.[Plan de Tratamiento Tratamientos] AS pl
INNER JOIN dbo.Factura AS fc
INNER JOIN dbo.FacturaII AS fii
  ON fc.[Id Factura] = fii.[Id Factura]
  ON pl.[Id Plan de Tratamiento] = fii.[Id Plan de Tratamiento]
LEFT OUTER JOIN dbo.[Cuotas Pactadas Tratamiento] AS ctp
  ON pl.[Id Plan de Tratamiento Tratamientos] = ctp.[Id Plan de Tratamiento Tratamientos]
LEFT OUTER JOIN dbo.[Cuotas Pactadas Inicial Tratamiento] AS cpit
  ON pl.[Id Plan de Tratamiento Tratamientos] = cpit.[Id Plan de Tratamiento Tratamientos]
GROUP BY
  fc.[Id Factura],
  fc.[No Factura],
  fc.[Id EmpresaV],
  fc.[Fecha Factura],
  fc.[Documento Responsable],
  pl.[Documento Responsable]
GO

------------------------------------------------------------------------------
-- 19) Face Cnsta Salud Recaudo Prepagada
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta Salud Recaudo Prepagada]
AS
SELECT TOP (100) PERCENT
  Fii.[Id FacturaII] AS IdFacturaii,
  f.[Id Factura] AS IdFactura,
  f.[No Factura] AS NoFactura,
  f.[Id EmpresaV] AS IdEmpresaV,
  f.[Fecha Factura] AS FechaFactura,
  PL.[Id Plan de Tratamiento] AS IdPlandeTratamiento,
  PL.[Id Plan de Tratamiento Tratamientos] AS IdPlandeTratamientoTratamientos,
  CPIT.[Valor de Cuota Cuotas Pactadas Inicial Tratamiento] AS ValorCopago,
  CPT.[Valor de Cuota Cuotas Pactadas Tratamiento] AS ValorEntidadPrepagada,
  Fii.[Valor FacturaII] AS ValorFacturaII,
  CPIT.[Valor de Cuota Cuotas Pactadas Inicial Tratamiento] / (CPIT.[Valor de Cuota Cuotas Pactadas Inicial Tratamiento] + CPT.[Valor de Cuota Cuotas Pactadas Tratamiento]) AS porcentajeCopago,
  PT.[Fecha Creación Plan de Tratamiento] AS FechaCreacionTratamiento,
  Paciente.[Documento Entidad] AS DocumentoPaciente,
  Paciente.[Primer Nombre Entidad] + ' ' + Paciente.[Segundo Nombre Entidad] + ' ' + Paciente.[Primer Apellido Entidad] + ' ' + Paciente.[Segundo Apellido Entidad] AS NombrePaciente,
  Fii.[Descripción FacturaII] AS DescripcionFacturaII
FROM dbo.Entidad AS Paciente
INNER JOIN dbo.[Plan de Tratamiento] AS PT
  ON Paciente.[Documento Entidad] = PT.[Documento Paciente]
RIGHT OUTER JOIN dbo.Factura AS f
INNER JOIN dbo.FacturaII AS Fii
  ON Fii.[Id Factura] = f.[Id Factura]
INNER JOIN dbo.[Plan de Tratamiento Tratamientos] AS PL
  ON PL.[Id Plan de Tratamiento] = Fii.[Id Plan de Tratamiento]
  ON PT.[Id Plan de Tratamiento] = PL.[Id Plan de Tratamiento]
LEFT OUTER JOIN dbo.[Cuotas Pactadas Inicial Tratamiento] AS CPIT
  ON CPIT.[Id Plan de Tratamiento Tratamientos] = PL.[Id Plan de Tratamiento Tratamientos]
LEFT OUTER JOIN dbo.[Cuotas Pactadas Tratamiento] AS CPT
  ON CPT.[Id Plan de Tratamiento Tratamientos] = PL.[Id Plan de Tratamiento Tratamientos]
GO

------------------------------------------------------------------------------
-- 20) ConfiguracionFace
------------------------------------------------------------------------------
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
GO

------------------------------------------------------------------------------
-- 21) Face Total base impuestos porcentaje
------------------------------------------------------------------------------
CREATE VIEW dbo.[Face Total base impuestos porcentaje]
AS
SELECT
  ROUND(SUM((dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] - dbo.[Plan de Tratamiento Items].[Descuento $ Plan de Tratamiento Items]) * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items]), 0) AS base,
  ROUND(SUM((dbo.[Plan de Tratamiento Items].[Valor Plan de Tratamiento Items] - dbo.[Plan de Tratamiento Items].[Descuento $ Plan de Tratamiento Items]) * dbo.[Plan de Tratamiento Items].[Cantidad Plan de Tratamiento Items]) * (dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] / 100), 0) AS ValorIva,
  dbo.Factura.[No Factura],
  dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] AS [Valor Iva % FacturaII]
FROM dbo.[Plan de Tratamiento Items]
INNER JOIN dbo.[Plan de Tratamiento]
  ON dbo.[Plan de Tratamiento Items].[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
LEFT OUTER JOIN dbo.Factura
INNER JOIN dbo.FacturaII
  ON dbo.Factura.[Id Factura] = dbo.FacturaII.[Id Factura]
INNER JOIN dbo.EmpresaV
  ON dbo.Factura.[Id EmpresaV] = dbo.EmpresaV.[Id EmpresaV]
  ON dbo.[Plan de Tratamiento].[Id Plan de Tratamiento] = dbo.FacturaII.[Id Plan de Tratamiento]
GROUP BY
  dbo.Factura.[No Factura],
  dbo.EmpresaV.[Id Estado],
  dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items]
HAVING (dbo.EmpresaV.[Id Estado] = 7)
   AND (dbo.[Plan de Tratamiento Items].[Valor Iva % Plan de Tratamiento Items] <> 0)
GO

------------------------------------------------------------------------------
-- 22) Face Total base impuestos porcentaje FacturaNormal
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Total base impuestos porcentaje FacturaNormal]
AS
SELECT
  ROUND(SUM((ROUND(dbo.FacturaII.[Valor FacturaII], 0) - dbo.FacturaII.[Descuento $ FacturaII]) * dbo.FacturaII.[Cantidad FacturaII]), 0) AS base,
  dbo.Factura.[No Factura],
  ROUND(SUM((dbo.FacturaII.[Valor FacturaII] - dbo.FacturaII.[Descuento $ FacturaII]) * dbo.FacturaII.[Cantidad FacturaII]) * (dbo.FacturaII.[Valor Iva % FacturaII] / 100), 0) AS ValorIva,
  dbo.FacturaII.[Valor Iva % FacturaII]
FROM dbo.Factura
INNER JOIN dbo.FacturaII
  ON dbo.Factura.[Id Factura] = dbo.FacturaII.[Id Factura]
INNER JOIN dbo.EmpresaV
  ON dbo.Factura.[Id EmpresaV] = dbo.EmpresaV.[Id EmpresaV]
GROUP BY
  dbo.Factura.[No Factura],
  dbo.FacturaII.[Valor Iva % FacturaII],
  dbo.EmpresaV.[Id Estado]
HAVING (dbo.EmpresaV.[Id Estado] = 7)
   AND (dbo.FacturaII.[Valor Iva % FacturaII] <> 0)
GO

------------------------------------------------------------------------------
-- 23) Face Cnsta Total Base Imponible
------------------------------------------------------------------------------
CREATE VIEW dbo.[Face Cnsta Total Base Imponible]
AS
SELECT
  [No Factura],
  SUM(base) AS TotalBaseImponible
FROM dbo.[Face Total base impuestos porcentaje]
GROUP BY [No Factura]
GO

------------------------------------------------------------------------------
-- 24) Face Cnsta Total Base Imponible FacturaNormal
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta Total Base Imponible FacturaNormal]
AS
SELECT
  [No Factura],
  base AS TotalBaseImponible
FROM dbo.[Face Total base impuestos porcentaje FacturaNormal]
GO

------------------------------------------------------------------------------
-- 25) Face Cnsta Descuento Copago
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta Descuento Copago]
AS
SELECT
  dbo.[Plan de Tratamiento].[Nro Plan de Tratamiento],
  dbo.Factura.[No Factura] AS NroFactura,
  dbo.Factura.[Id EmpresaV] AS IdEmpresaV,
  dbo.[Plan de Tratamiento].[Descuento Adicional $ Plan de Tratamiento] AS DescuentoPresu,
  dbo.[Plan de Tratamiento].[Descuento Adicional % Plan de Tratamiento],
  dbo.[Cnsta CR Plan de Tratamiento Total].[Total Tratamiento] AS TotalPresu,
  dbo.[Plan de Tratamiento].[Descuento Adicional $ Plan de Tratamiento] / dbo.[Cnsta CR Plan de Tratamiento Total].[Total Tratamiento] * 100 AS PorcentajeDctoPresu
FROM dbo.Factura
INNER JOIN dbo.FacturaII
  ON dbo.Factura.[Id Factura] = dbo.FacturaII.[Id Factura]
INNER JOIN dbo.[Plan de Tratamiento]
  ON dbo.FacturaII.[Id Plan de Tratamiento] = dbo.[Plan de Tratamiento].[Id Plan de Tratamiento]
INNER JOIN dbo.[Cnsta CR Plan de Tratamiento Total]
  ON dbo.[Plan de Tratamiento].[Id Plan de Tratamiento] = dbo.[Cnsta CR Plan de Tratamiento Total].[Id Plan de Tratamiento]
GO

------------------------------------------------------------------------------
-- 26) Face Cnsta ObservacionesFacturas
------------------------------------------------------------------------------
CREATE VIEW [dbo].[Face Cnsta ObservacionesFacturas]
AS
SELECT TOP (100) PERCENT
  [Id Factura] AS IdFactura,
  [Id EmpresaV] AS IdEmpresaV,
  [No Factura] AS NoFactura,
  [Fecha Factura] AS FechaFactura,
  [Observaciones Factura] AS ObservacionesFactura
FROM dbo.Factura
ORDER BY IdFactura DESC
GO
