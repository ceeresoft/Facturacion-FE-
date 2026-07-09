import { getPool, sql } from "../config/db.js";
import { resolveDetailTable } from "./itemRouter.service.js";
import { obtenerPdfFactura, obtenerCufeFactura, FacturatechError } from "./facturatech.service.js";
import {
  formatFechaDisplay,
  mapMedioPago,
  mapItemRow,
} from "../utils/format.js";

export class FacturaError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "FacturaError";
    this.statusCode = statusCode;
  }
}

const DETAIL_TABLES = new Set([
  "[Face Cnsta FacturaCopago]",
  "[Face Cnsta FacturaAnticiposVariosItems]",
  "[Face Cnsta FacturaParticular]",
  "[Face Cnsta FacturaSaldos]",
  "[Face Cnsta FacturaEII]",
]);

function normalizeEntidad(row) {
  if (!row) return null;

  let segundoNombre = row.SegundoNombreEntidad ?? "";
  if (segundoNombre == null) segundoNombre = "";

  let regimen = row.regimenEntidad ?? "";
  if (regimen == null) regimen = "0";

  let email = row.EmailEntidad ?? "";
  if (email == null || String(email).trim() === "") {
    email = "facturasdentotal@gmail.com";
  }

  let telefono = row.Telefono1Entidad;
  const telefono2 = row.Telefono2Entidad;
  const telefonoCelular = row.Telefono2Entidad;

  if (telefono == null) {
    telefono = telefono2;
    if (telefono == null && telefono2 == null) {
      telefono = telefonoCelular;
    }
  }

  const nombres = [row.PrimerNombreEntidad, segundoNombre]
    .filter(Boolean)
    .join(" ")
    .trim();
  const apellidos = [row.PrimerApellidoEntidad, row.SegundoApellidoEntidad]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    tipoDocumento:
      row.DescripcionDocumentoEntidad ?? String(row.IdTipoDocumentoEntidad ?? ""),
    identificacion: String(row.DocumentoEntidad ?? ""),
    nombres,
    apellidos,
    nombreCompleto: row.NombreCompletoEntidad ?? "",
    email: String(email).trim(),
    departamento: row.NombreDepartamentoEntidad ?? "",
    ciudad: row.NombreCiudadEntidad ?? "",
    direccion: row.DireccionEntidad ?? "",
    barrio: row.BarrioCiudad ?? "",
    telefono: telefono != null ? String(telefono) : "",
    regimen: String(regimen),
  };
}

function normalizeEmpresa(row) {
  if (!row) return null;

  return {
    tipoDocumento:
      row.DescripcionTipoDocumentoEmpresa ??
      String(row.IdTipoDocumentoEmpresa ?? ""),
    documento: String(row.IdEmpresa ?? ""),
    razonSocial: row.NombreEmpresa ?? "",
    direccion: row.DireccionEmpresa ?? "",
    telefono: "",
    telefono2: "",
    departamento: row.DepartamentoEmpresa ?? "",
    ciudad: row.CiudadEmpresa ?? "",
    barrio: row.BarrioEmpresa ?? "",
    email: row.EmailEmpresa ?? "",
    regimen: row.RegimenEmpresa != null ? String(row.RegimenEmpresa) : "",
  };
}

function normalizeFacturaHeader(row) {
  return {
    numeroFactura: String(row.NroFactura ?? "").trim(),
    fecha: formatFechaDisplay(row.FechaFactura),
    subtotal: Number(row.SubTotalFactura) || 0,
    iva: Number(row.TotalIvaFactura) || 0,
    descuento: Number(row.DescuentoFactura) || 0,
    retencionFuente: Number(row.ReteFuenteFactura) || 0,
    retencionIva: Number(row.ReteIvaFactura) || 0,
    otrasRetenciones: Number(row.ReteOtrosFactura) || 0,
    total: Number(row.TotalFactura) || 0,
    medioPago: mapMedioPago(row.IdFormadePago),
    estado: row.DescripEstadoFactura ?? String(row.EstadoFactura ?? ""),
    estadoCodigo: row.EstadoFactura,
    estadoElectronica: row.EstadoFacturaElectronica,
    prefijo: row.PrefijoFactura ?? "",
    prefijoNC: row.PrefijoNC ?? "",
    resolucion: row.ResolucionFactura ?? "",
    condicionPago: row.IdCondicionPagoFactura,
    banco: row.Banco ?? "",
    numeroCuenta: row.NumeroCuentaCredito ?? "",
    numeroComprobante: row.NumeroComprobanteCredito ?? "",
    porcentajeDescuento: row.PorcentajeDescuentoFactura,
    idEmpresaV: row.IdEmpresaV,
  };
}

export async function consultarResoluciones() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT IDempresaV, prefijoSIO, resolucionSIO, EstadoEmpresaV
    FROM face_ConsultaEmpresaV
  `);

  return result.recordset.map((row) => ({
    id: row.IDempresaV,
    prefijo: row.prefijoSIO ?? "",
    resolucion: row.resolucionSIO ?? "",
    label: `${row.prefijoSIO ?? ""}${row.resolucionSIO ?? ""}`,
    estadoEmpresa: row.EstadoEmpresaV,
    inactiva: Number(row.EstadoEmpresaV) === 5,
  }));
}

export async function consultarFacturasPorUsuario(documentoUsuario, idEmpresaV) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("documento", sql.NVarChar, documentoUsuario)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT NoFactura, [Fecha Factura]
      FROM face_facturaPorUsuario
      WHERE [Documento Usuario] = @documento
        AND IdEmpresaV = @idEmpresaV
      ORDER BY [Fecha Factura] DESC
    `);

  return result.recordset.map((row) => ({
    numero: String(row.NoFactura ?? "").trim(),
    fecha: row["Fecha Factura"]
      ? formatFechaDisplay(row["Fecha Factura"])
      : null,
  }));
}

/**
 * Facturas anuladas ya enviadas electrónicamente (para nota crédito).
 * No incluye pendientes por enviar (EstadoFacturaElectronica IS NULL).
 */
export async function consultarFacturasAnuladasParaNotaCredito(
  documentoUsuario,
  idEmpresaV
) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("documento", sql.NVarChar, documentoUsuario)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT
        f.[No Factura] AS NoFactura,
        f.[Fecha Factura]
      FROM dbo.Factura AS f
      WHERE f.[Documento Usuario] = @documento
        AND f.[Id EmpresaV] = @idEmpresaV
        AND f.EstadoFacturaElectronica = 1
        AND f.[Id Estado] = 5
      ORDER BY f.[Fecha Factura] DESC
    `);

  return result.recordset.map((row) => ({
    numero: String(row.NoFactura ?? "").trim(),
    fecha: row["Fecha Factura"]
      ? formatFechaDisplay(row["Fecha Factura"])
      : null,
  }));
}

export async function consultarFacturasElectronicasPorUsuario(
  documentoUsuario,
  idEmpresaV
) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("documento", sql.NVarChar, documentoUsuario)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT
        fu.NoFactura AS numero,
        fu.[Fecha Factura] AS fecha,
        cf.PrefijoFactura AS prefijo
      FROM face_facturaPorUsuario AS fu
      INNER JOIN [Face Cnsta Factura] AS cf
        ON RTRIM(cf.NroFactura) = RTRIM(fu.NoFactura)
        AND cf.IdEmpresaV = fu.IdEmpresaV
      WHERE fu.[Documento Usuario] = @documento
        AND fu.IdEmpresaV = @idEmpresaV
        AND fu.EstadoFacturaElectronica = 1
      ORDER BY fu.[Fecha Factura] DESC
    `);

  return result.recordset.map((row) => ({
    numero: String(row.numero ?? "").trim(),
    prefijo: String(row.prefijo ?? "").trim(),
    fecha: row.fecha ? formatFechaDisplay(row.fecha) : null,
  }));
}

async function assertFacturaElectronicaAccesible(
  pool,
  numero,
  idEmpresaV,
  documentoUsuario
) {
  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numero)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .input("documento", sql.NVarChar, documentoUsuario)
    .query(`
      SELECT cf.PrefijoFactura, cf.NroFactura
      FROM face_facturaPorUsuario AS fu
      INNER JOIN [Face Cnsta Factura] AS cf
        ON RTRIM(cf.NroFactura) = RTRIM(fu.NoFactura)
        AND cf.IdEmpresaV = fu.IdEmpresaV
      WHERE RTRIM(fu.NoFactura) = RTRIM(@numero)
        AND fu.IdEmpresaV = @idEmpresaV
        AND fu.[Documento Usuario] = @documento
        AND fu.EstadoFacturaElectronica = 1
    `);

  const row = result.recordset[0];
  if (!row) {
    throw new FacturaError(
      "Factura electrónica no encontrada o no enviada (EstadoFacturaElectronica debe ser 1)",
      404
    );
  }

  return {
    prefijo: String(row.PrefijoFactura ?? "").trim(),
    numero: String(row.NroFactura ?? "").trim(),
  };
}

export async function obtenerPdfFacturaElectronica(
  numero,
  idEmpresaV,
  documentoUsuario
) {
  const numeroLimpio = String(numero ?? "").trim();
  if (!numeroLimpio) {
    throw new FacturaError("Número de factura requerido");
  }

  const pool = await getPool();
  const factura = await assertFacturaElectronicaAccesible(
    pool,
    numeroLimpio,
    idEmpresaV,
    documentoUsuario
  );

  if (!factura.prefijo) {
    throw new FacturaError("La factura no tiene prefijo configurado", 400);
  }

  try {
    const pdfBuffer = await obtenerPdfFactura(factura.prefijo, factura.numero);
    return {
      buffer: pdfBuffer,
      fileName: `factura_${factura.prefijo}${factura.numero}.pdf`,
      prefijo: factura.prefijo,
      numero: factura.numero,
    };
  } catch (error) {
    if (error instanceof FacturatechError) {
      throw error;
    }
    throw new FacturaError(
      `No se pudo descargar el PDF desde Facturatech: ${error.message}`,
      502
    );
  }
}

async function consultaFacturaHeader(pool, numero, idEmpresaV) {
  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numero)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT *
      FROM [Face Cnsta Factura]
      WHERE RTRIM(NroFactura) = RTRIM(@numero)
        AND IdEmpresaV = @idEmpresaV
    `);

  return result.recordset[0] ?? null;
}

async function consultaEmpresaRow(pool, numero, idEmpresaV) {
  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numero)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT *
      FROM [Face Cnsta FacturaE Empresa]
      WHERE RTRIM(NroFactura) = RTRIM(@numero)
        AND IdEmpresaV = @idEmpresaV
    `);

  return result.recordset[0] ?? null;
}

async function consultaEntidadRow(pool, numero, idEmpresaV) {
  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numero)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT *
      FROM [Face Cnsta FacturaE Entidad]
      WHERE RTRIM([NroFactura]) = RTRIM(@numero)
        AND IdEmpresaV = @idEmpresaV
    `);

  return result.recordset[0] ?? null;
}

async function consultaGuiasRow(pool, numero, idEmpresaV) {
  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numero)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT *
      FROM [Face Cnsta TipoDeFactura]
      WHERE RTRIM(NroFactura) = RTRIM(@numero)
        AND IdEmpresaV = @idEmpresaV
    `);

  return result.recordset[0] ?? null;
}

async function consultaDetalleItems(pool, numero, idEmpresaV) {
  const guiasRow = await consultaGuiasRow(pool, numero, idEmpresaV);
  const detailTable = resolveDetailTable(guiasRow ?? {});

  if (!DETAIL_TABLES.has(detailTable)) {
    throw new FacturaError("Tabla de detalle no válida", 500);
  }

  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numero)
    .input("idEmpresaV", sql.Int, idEmpresaV)
    .query(`
      SELECT *
      FROM ${detailTable}
      WHERE RTRIM(NroFactura) = RTRIM(@numero)
        AND IdEmpresaV = @idEmpresaV
    `);

  return result.recordset.map(mapItemRow);
}

export async function obtenerCufeFacturaElectronica(numero, idEmpresaV) {
  const numeroLimpio = String(numero ?? "").trim();
  const empresaId = Number.parseInt(idEmpresaV, 10);

  if (!numeroLimpio || Number.isNaN(empresaId)) {
    throw new FacturaError("Número de factura e IdEmpresaV son requeridos");
  }

  const pool = await getPool();
  const header = await consultaFacturaHeader(pool, numeroLimpio, empresaId);

  if (!header) {
    throw new FacturaError("Factura no encontrada", 404);
  }

  const prefijo = String(header.PrefijoFactura ?? "").trim();
  if (!prefijo) {
    throw new FacturaError("La factura no tiene prefijo configurado", 400);
  }

  const cufe = await obtenerCufeFactura(prefijo, numeroLimpio);
  return {
    numeroFactura: numeroLimpio,
    prefijo,
    cufe,
  };
}

export async function consultaFacturaCompleta(numero, idEmpresaV) {
  const numeroLimpio = String(numero ?? "").trim();
  if (!numeroLimpio) {
    throw new FacturaError("Número de factura requerido");
  }

  const pool = await getPool();
  const header = await consultaFacturaHeader(pool, numeroLimpio, idEmpresaV);

  if (!header) {
    throw new FacturaError("Factura no encontrada", 404);
  }

  const [empresaRow, entidadRow, items] = await Promise.all([
    consultaEmpresaRow(pool, numeroLimpio, idEmpresaV),
    consultaEntidadRow(pool, numeroLimpio, idEmpresaV),
    consultaDetalleItems(pool, numeroLimpio, idEmpresaV),
  ]);

  return {
    empresa: normalizeEmpresa(empresaRow),
    usuario: normalizeEntidad(entidadRow),
    factura: normalizeFacturaHeader(header),
    items,
  };
}
