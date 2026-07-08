import { getPool, sql } from "../config/db.js";
import { resolveDetailTable } from "./itemRouter.service.js";
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
