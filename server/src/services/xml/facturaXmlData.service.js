import { getPool, sql } from "../../config/db.js";
import { FacturaError } from "../factura.service.js";
import { resolveEmailConFallback } from "../../utils/format.js";
import { resolveDetailTableForXml } from "./resolveDetailTableXml.js";
import {
  formatDateYmd,
  formatDateTimeIso,
  formatTimeHms,
  mapFormaPagoXml,
  resolverCodigoMunicipioDian,
  folioSinCerosIzquierda,
  txt,
} from "./xmlHelpers.js";
import {
  resolverDigitoVerificacionNit,
  resolverDocumentoSinDigito,
} from "../../utils/nitDigitoVerificacion.js";

const NUMERO_FACTURA_WHERE = `RTRIM(CONVERT(NVARCHAR(50), NoFactura)) = RTRIM(@numero)`;

const NO_FACTURA_COL_WHERE = `RTRIM(CONVERT(NVARCHAR(50), [No Factura])) = RTRIM(@numero)`;

const NRO_FACTURA_WHERE = `RTRIM(CONVERT(NVARCHAR(50), NroFactura)) = RTRIM(@numero)`;

const DETAIL_TABLES = new Set([
  "[Face Cnsta FacturaCopago]",
  "[Face Cnsta FacturaAnticiposVariosItems]",
  "[Face Cnsta FacturaParticular]",
  "[Face Cnsta FacturaSaldos]",
  "[Face Cnsta FacturaEII]",
]);

async function queryRows(pool, query, inputs = []) {
  const request = pool.request();
  inputs.forEach(({ name, type, value }) => {
    request.input(name, type, value);
  });
  const result = await request.query(query);
  return result.recordset;
}

async function queryOne(pool, query, inputs = []) {
  const rows = await queryRows(pool, query, inputs);
  return rows[0] ?? null;
}

function normalizeEntidadXml(row, emailEmpresaFallback = "") {
  if (!row) return null;

  const email = resolveEmailConFallback(row.EmailEntidad, emailEmpresaFallback);

  let regimen = row.regimenEntidad;
  if (regimen === "1" || regimen == null) regimen = "0";

  const tipoDocE = asNumber(row.codigoDian ?? row.IdTipoDocumentoEntidad);
  const tipoPersona = tipoDocE === 31 ? "1" : "2";
  const responsableIva = tipoDocE === 31 ? "48" : "ZZ";

  const telefonoE = row.Telefono1Entidad;
  const telefono2 = row.Telefono2Entidad;
  const telefonoCelular = row.TelefonoCelularEntidad;
  const telefonoEntidad = [telefonoE, telefono2, telefonoCelular]
    .filter((t) => t != null && String(t).trim())
    .join(" ");

  const documentoEntidadCompleto = txt(row.DocumentoEntidad);
  const documentoEntidadVista = txt(row.documentoNit);
  const nitBaseEntidad = resolverDocumentoSinDigito(
    tipoDocE,
    documentoEntidadCompleto,
    documentoEntidadVista,
    row.digitoVerificacion
  );
  const departE = txt(row.CodigoDepartamentoEntidad);
  const codigoCiudad = resolverCodigoMunicipioDian(
    row.CodigoCiudad,
    departE
  );

  return {
    docE: row.DocumentoEntidad,
    tipoDocE,
    documentoNit: row.documentoNit,
    digitoVerificacion: resolverDigitoVerificacionNit(
      tipoDocE,
      documentoEntidadCompleto,
      documentoEntidadVista,
      row.digitoVerificacion
    ),
    pNomE: row.PrimerNombreEntidad ?? "",
    sNomE: row.SegundoNombreEntidad ?? "",
    pApeE: row.PrimerApellidoEntidad ?? "",
    sApeE: row.SegundoApellidoEntidad ?? "",
    ciudadE: row.NombreCiudadEntidad ?? "",
    codigoCiudad,
    departE,
    nombreDepartamentoEnt: row.NombreDepartamentoEntidad ?? "",
    paisE: row.codigoPais ?? row.PaisEntidad ?? "CO",
    nombrePaisEnt: row.PaisEntidad ?? "",
    codigoPaisEnt: "CO",
    direccionE: row.DireccionEntidad ?? "",
    emailE: String(email).trim(),
    telefonoEntidad,
    regimenE: String(regimen),
    codActividadEco: row.ActividadEconomicaEntidad ?? "0",
    tipoPersona,
    responsableIva,
  };
}

function asNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Mapeo código DIAN → abreviación MinSalud (Tabla 10 a / complemento salud). */
const CODIGO_DIAN_A_MINSALUD = {
  11: "RC",
  12: "TI",
  13: "CC",
  21: "TE",
  22: "CE",
  41: "PA",
  42: "CD",
  47: "PE",
};

const EMISOR_DOCUMENTO_MINSALUD = {
  CC: "Registraduría Nacional del Estado Civil",
  TI: "Registraduría Nacional del Estado Civil",
  RC: "Registraduría Nacional del Estado Civil",
  CE: "Migración Colombia",
  PA: "Cancillería / autoridad emisora del pasaporte",
  PE: "Migración Colombia",
  CD: "Ministerio de Relaciones Exteriores",
  SC: "Migración Colombia",
};

function normalizePacienteBeneficiarioXml(row) {
  if (!row) return null;

  const tipoDocDian = asNumber(row.codigoDian ?? row.IdTipoDocumentoEntidad);
  const documento = txt(row.DocumentoEntidad).replace(/\s+/g, "");
  const codigoMinSalud =
    CODIGO_DIAN_A_MINSALUD[tipoDocDian] ||
    txt(row.AbreviaturaTipoDocumento).toUpperCase() ||
    "SI";
  const departE = txt(row.CodigoDepartamentoEntidad);
  const codigoCiudad = resolverCodigoMunicipioDian(row.CodigoCiudad, departE);

  return {
    documento,
    tipoDocDian,
    schemeId: tipoDocDian > 0 ? String(tipoDocDian) : "91",
    codigoMinSalud,
    emisorDocumento:
      EMISOR_DOCUMENTO_MINSALUD[codigoMinSalud] ||
      "Registraduría Nacional del Estado Civil",
    primerNombre: txt(row.PrimerNombreEntidad),
    segundoNombre: txt(row.SegundoNombreEntidad),
    primerApellido: txt(row.PrimerApellidoEntidad),
    segundoApellido: txt(row.SegundoApellidoEntidad),
    direccion: txt(row.DireccionEntidad),
    codigoCiudad,
    nombreCiudad: txt(row.NombreCiudadEntidad),
    codigoPais: "CO",
    nombrePais: txt(row.PaisEntidad) || "Colombia",
  };
}

async function cargarPacienteBeneficiario(pool, numero, empresaId) {
  return queryOne(
    pool,
    `SELECT TOP 1
      en.[Documento Entidad] AS DocumentoEntidad,
      en.[Primer Nombre Entidad] AS PrimerNombreEntidad,
      en.[Segundo Nombre Entidad] AS SegundoNombreEntidad,
      en.[Primer Apellido Entidad] AS PrimerApellidoEntidad,
      en.[Segundo Apellido Entidad] AS SegundoApellidoEntidad,
      e.[Dirección EntidadII] AS DireccionEntidad,
      c.[Código Ciudad] AS CodigoCiudad,
      UPPER(c.Ciudad) AS NombreCiudadEntidad,
      d.[Código Departamento] AS CodigoDepartamentoEntidad,
      td.[Id Tipo de Documento] AS IdTipoDocumentoEntidad,
      td.codigoDian,
      td.[Tipo de Documento] AS AbreviaturaTipoDocumento,
      UPPER(p.[Descripción País]) AS PaisEntidad
    FROM dbo.Factura AS f
    INNER JOIN dbo.Entidad AS en
      ON RTRIM(f.[Documento Paciente]) = RTRIM(en.[Documento Entidad])
    INNER JOIN dbo.[Tipo de Documento] AS td
      ON td.[Id Tipo de Documento] = en.[Id Tipo de Documento]
    LEFT JOIN dbo.EntidadII AS e
      ON en.[Documento Entidad] = e.[Documento Entidad]
    LEFT JOIN dbo.Ciudad AS c
      ON e.[Id Ciudad] = c.[Id Ciudad]
    LEFT JOIN dbo.Departamento AS d
      ON c.[Id Departamento] = d.[Id Departamento]
    LEFT JOIN dbo.País AS p
      ON d.[Id País] = p.[Id País]
    WHERE RTRIM(f.[No Factura]) = RTRIM(@numero)
      AND f.[Id EmpresaV] = @idEmpresaV`,
    [
      { name: "numero", type: sql.NVarChar, value: numero },
      { name: "idEmpresaV", type: sql.Int, value: empresaId },
    ]
  );
}

export async function cargarDatosXmlFactura(numero, idEmpresaV) {
  const numeroLimpio = String(numero ?? "").trim();
  const empresaId = Number.parseInt(idEmpresaV, 10);

  if (!numeroLimpio || Number.isNaN(empresaId)) {
    throw new FacturaError("Número de factura e IdEmpresaV son requeridos");
  }

  const pool = await getPool();
  const params = [
    { name: "numero", type: sql.NVarChar, value: numeroLimpio },
    { name: "idEmpresaV", type: sql.Int, value: empresaId },
  ];

  let tipoFactura = "SS06";
  const prepagada = await queryOne(
    pool,
    `SELECT TipoFactura FROM [Face Cnsta Salud Prepagada]
     WHERE ${NUMERO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`,
    params
  );
  if (prepagada?.TipoFactura) {
    tipoFactura = txt(prepagada.TipoFactura);
  }

  let recaudoRows = [];
  let totalAnticipos = 0;
  if (tipoFactura === "SS01") {
    recaudoRows = await queryRows(
      pool,
      `SELECT * FROM [Face Cnsta Salud Recaudo Prepagada]
       WHERE ${NUMERO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`,
      params
    );
    totalAnticipos = recaudoRows.reduce((sum, row) => {
      const valor = row.ValorCopago;
      return valor != null ? sum + Number(valor) : sum;
    }, 0);
  }

  const facturaRow = await queryOne(
    pool,
    `SELECT * FROM [Face Cnsta Factura]
     WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`,
    params
  );

  if (!facturaRow) {
    throw new FacturaError("Factura no encontrada", 404);
  }

  const formaPago = mapFormaPagoXml(facturaRow.IdFormadePago);
  const fechaFactura = facturaRow.FechaFactura;
  const fechaVencimiento = facturaRow.FechaVencimientoFactura;

  let idFactura = Number(facturaRow.IdFactura);
  if (!Number.isInteger(idFactura) || idFactura <= 0) {
    const idRow = await queryOne(
      pool,
      `SELECT [Id Factura] AS IdFactura FROM dbo.Factura
       WHERE RTRIM([No Factura]) = RTRIM(@numero) AND [Id EmpresaV] = @idEmpresaV`,
      params
    );
    idFactura = Number(idRow?.IdFactura);
  }
  if (!Number.isInteger(idFactura) || idFactura <= 0) {
    throw new FacturaError("La factura no tiene IdFactura válido en BD", 500);
  }

  const factura = {
    idFactura,
    numF: folioSinCerosIzquierda(facturaRow.NroFactura),
    prefijoF: txt(facturaRow.PrefijoFactura),
    fechaF: formatDateYmd(fechaFactura),
    fechaF2: formatDateTimeIso(fechaFactura),
    horaF: formatTimeHms(facturaRow.horaFactura ?? fechaFactura),
    horaCreacion: formatTimeHms(fechaFactura),
    ivaF: Number(facturaRow.TotalIvaFactura) || 0,
    subF: Number(facturaRow.SubTotalFactura) || 0,
    totF: Number(facturaRow.TotalFactura) || 0,
    reteFuente: Number(facturaRow.ReteFuenteFactura) || 0,
    reteIva: Number(facturaRow.ReteIvaFactura) || 0,
    reteOtros: Number(facturaRow.ReteOtrosFactura) || 0,
    descuentos: Number(facturaRow.DescuentoFactura) || 0,
    descuentoGeneral: Number(facturaRow.DescuentoGeneral) || 0,
    porcentajeDescuento: facturaRow.PorcentajeDescuentoFactura ?? 0,
    porceReteFuente: Number(facturaRow.PorcentajeReteFuente) || 0,
    porceReteIva: Number(facturaRow.PorcentajeReteIva) || 0,
    porceReteIca: Number(facturaRow.PorcentajeReteIca) || 0,
    totalBrutoImpDesc: Number(facturaRow.TotalBrutoImpDesc) || 0,
    totalBrutoDesc: Number(facturaRow.TotalBrutoDesc) || 0,
    fechaVencimiento: formatDateYmd(fechaVencimiento),
    fechaVencimiento2: formatDateTimeIso(fechaVencimiento),
    codigoPrestador: txt(facturaRow.CodigoEmpresa).slice(0, -2),
    idEmpresaV: facturaRow.IdEmpresaV,
    formaPago,
  };

  const configRow = await queryOne(
    pool,
    `SELECT IdResolucionFactura, VersionGraficaFactura
     FROM ConfiguracionFace
     WHERE IdEmpresaV = @idEmpresaV`,
    [{ name: "idEmpresaV", type: sql.Int, value: empresaId }]
  );

  const empresaRow = await queryOne(
    pool,
    `SELECT * FROM [Face Cnsta FacturaE Empresa]
     WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`,
    params
  );

  if (!empresaRow) {
    throw new FacturaError("Datos de empresa emisora no encontrados", 404);
  }

  const documentoCompletoEmpresa = txt(empresaRow.IdEmpresa);
  const documentoVistaEmpresa = txt(empresaRow.DocumentoSinDigito);
  const digitoDesdeBdEmpresa =
    empresaRow.digitoVerificacionEmpresa ?? empresaRow.digitoVerificacion;

  const documentoSinDigito = resolverDocumentoSinDigito(
    empresaRow.IdTipoDocumentoEmpresa,
    documentoCompletoEmpresa,
    documentoVistaEmpresa,
    digitoDesdeBdEmpresa
  );

  const emailEmpresa = txt(empresaRow.EmailEmpresa);

  const empresa = {
    emailEmpresa,
    documentoSinDigito,
    tipoDocumentoEmpresa: empresaRow.IdTipoDocumentoEmpresa,
    nombreEmpresa: txt(empresaRow.NombreEmpresa),
    direccionEmpresa: txt(empresaRow.DireccionEmpresa),
    codigoDepartamentoEmpresa: txt(empresaRow.codigoDepartamentoEmpresa),
    nombreCiudadEmpresa: txt(empresaRow.CiudadEmpresa),
    codigoPaisEmp: "CO",
    nombreDepartamentoEmpresa: txt(empresaRow.DepartamentoEmpresa),
    digitoVerificacionEm: resolverDigitoVerificacionNit(
      empresaRow.IdTipoDocumentoEmpresa,
      documentoCompletoEmpresa,
      documentoVistaEmpresa,
      digitoDesdeBdEmpresa
    ),
    codigoCiudadEmp: resolverCodigoMunicipioDian(
      empresaRow.codigoCiudadEmpresa,
      empresaRow.codigoDepartamentoEmpresa
    ),
    resolucionEmpresa: txt(empresaRow.resolucionEmpresa),
    fechaIniReso: formatDateYmd(empresaRow.fechaIniResolucionEmpresa),
    fechaFinalReso: formatDateYmd(empresaRow.fechaFinalResolucionEmpresa),
    codigoTipoEmp: txt(empresaRow.codigoTipoEmpresa),
    nombrePaisEmp: txt(empresaRow.PaisEmpresaEmi),
    numeroInicioReso: txt(empresaRow.NumeroInicioResolucion),
    numeroFinReso: txt(empresaRow.NumeroFinResolucion),
    telefonoEmp: txt(empresaRow.TelefonoEmpresa),
  };

  const entidad = normalizeEntidadXml(
    await queryOne(
      pool,
      `SELECT * FROM [Face Cnsta FacturaE Entidad]
       WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`,
      params
    ),
    emailEmpresa
  );

  if (!entidad) {
    throw new FacturaError("Datos del responsable/entidad no encontrados", 404);
  }

  const guiasRow = await queryOne(
    pool,
    `SELECT * FROM [Face Cnsta TipoDeFactura]
     WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`,
    params
  );

  const detailTable = resolveDetailTableForXml(guiasRow ?? {});
  if (!DETAIL_TABLES.has(detailTable)) {
    throw new FacturaError("Tabla de detalle XML no válida", 500);
  }

  const items = await queryRows(
    pool,
    `SELECT * FROM ${detailTable}
     WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`,
    params
  );

  const esCopago = asNumber(guiasRow?.GuiaFactura) === 0 && asNumber(guiasRow?.GuiaFacturaNormal) === 0;

  const impuestosQuery = esCopago
    ? `SELECT * FROM [Face Total base impuestos porcentaje FacturaNormal]
       WHERE ${NO_FACTURA_COL_WHERE}`
    : `SELECT * FROM [Face Total base impuestos porcentaje]
       WHERE ${NO_FACTURA_COL_WHERE}`;

  const baseImponibleQuery = esCopago
    ? `SELECT * FROM [Face Cnsta Total Base Imponible FacturaNormal]
       WHERE ${NO_FACTURA_COL_WHERE}`
    : `SELECT * FROM [Face Cnsta Total Base Imponible]
       WHERE ${NO_FACTURA_COL_WHERE}`;

  const impuestos = await queryRows(pool, impuestosQuery, [
    { name: "numero", type: sql.NVarChar, value: numeroLimpio },
  ]);

  const baseImponible = await queryRows(pool, baseImponibleQuery, [
    { name: "numero", type: sql.NVarChar, value: numeroLimpio },
  ]);

  // La vista puede tener filas con fechas inválidas; los valores no se usan aún en el XML.
  let descuentoCopago = null;
  if (esCopago) {
    try {
      descuentoCopago = await queryOne(
        pool,
        `SELECT * FROM [Face Cnsta Descuento Copago]
         WHERE ${NRO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`,
        params
      );
    } catch (error) {
      console.warn(
        `Descuento copago omitido para factura ${numeroLimpio}:`,
        error.message
      );
    }
  }

  const observacionRow = await queryOne(
    pool,
    `SELECT ObservacionesFactura FROM [Face Cnsta ObservacionesFacturas]
     WHERE IdEmpresaV = @idEmpresaV AND ${NUMERO_FACTURA_WHERE}`,
    params
  );

  let paciente = null;
  if (tipoFactura === "SS07") {
    const pacienteRow = await cargarPacienteBeneficiario(
      pool,
      numeroLimpio,
      empresaId
    );
    paciente = normalizePacienteBeneficiarioXml(pacienteRow);
    if (!paciente?.documento) {
      throw new FacturaError(
        "SS07 (SS-Recaudo) requiere datos del paciente en Factura.[Documento Paciente] para el bloque USS/IDR/RAD",
        400
      );
    }
  }

  return {
    tipoFactura,
    factura,
    empresa,
    entidad,
    paciente,
    items,
    impuestos,
    baseImponible,
    descuentoCopago,
    observaciones: txt(observacionRow?.ObservacionesFactura),
    config: {
      idResolucionFactura: configRow?.IdResolucionFactura ?? "",
      plantillaVersionGrafica: configRow?.VersionGraficaFactura ?? "",
    },
    recaudoRows,
    totalAnticipos,
  };
}
