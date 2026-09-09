/**
 * Integración SOAP con Facturatech (wbsFactura.php).
 *
 * - obtenerCufeFactura      → getCUFEFile (CUFE de factura referenciada en NC)
 * - obtenerPdfFactura       → downloadPDFFile (PDF firmado)
 * - enviarXmlFacturatech      → uploadInvoiceFile + documentStatusFile
 * - enviarFacturaFacturatech  → lee face_{numero}.xml y envía
 * - enviarNotaCreditoFacturatech → lee face_{nota}{prefijoNC}.xml y envía
 */

import fs from "fs/promises";
import path from "path";
import { getPool, sql } from "../config/db.js";
import {
  resolveXmlOutputDir,
  xmlFileNameFactura,
  xmlFileNameNotaCredito,
} from "../utils/xmlPaths.js";
import { ejecutarPaso, mensajePaso } from "../utils/feStepError.js";

const DEFAULT_WSDL_URL =
  process.env.FACTURATECH_WSDL_URL ||
  "https://ws.facturatech.co/v2/pro/index.php";

export class FacturatechError extends Error {
  constructor(message, { code, transaccionID, raw, statusCode = 400 } = {}) {
    super(message);
    this.name = "FacturatechError";
    this.statusCode = statusCode;
    this.code = code ?? null;
    this.transaccionID = transaccionID ?? null;
    this.raw = raw ?? null;
  }
}

function getEnvCredentials() {
  const username = process.env.FACTURATECH_USER;
  const password = process.env.FACTURATECH_PASSWORD;

  return username && password
    ? { username, password, wsdlUrl: DEFAULT_WSDL_URL, source: "env" }
    : null;
}

async function getCredentials(idEmpresaV) {
  const empresaId = Number.parseInt(idEmpresaV, 10);

  if (Number.isInteger(empresaId) && empresaId > 0) {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("idEmpresaV", sql.Int, empresaId)
        .query(`
          SELECT TOP 1
            c.Usuario,
            c.Contrasena,
            c.[URL SOAP] AS UrlSoap,
            c.[Id Facturador] AS IdFacturador
          FROM dbo.EmpresaV AS ev
          INNER JOIN dbo.CredencialesWSDLFacturaTech AS c
            ON RTRIM(c.[Documento Empresa]) = RTRIM(ev.[Documento Empresa])
          WHERE ev.[Id EmpresaV] = @idEmpresaV
          ORDER BY c.[Id Credenciales WSDL] DESC
        `);

      const row = result.recordset[0];
      const username = String(row?.Usuario ?? "").trim();
      const password = String(row?.Contrasena ?? "").trim();
      const wsdlUrl = String(row?.UrlSoap ?? "").trim() || DEFAULT_WSDL_URL;

      if (username && password) {
        return {
          username,
          password,
          wsdlUrl,
          idFacturador: row.IdFacturador ?? null,
          source: "database",
        };
      }
    } catch (error) {
      const envCredentials = getEnvCredentials();
      if (envCredentials) return envCredentials;

      throw new FacturatechError(
        `No se pudieron consultar las credenciales de Facturatech para IdEmpresaV=${empresaId}: ${error.message}`,
        { statusCode: 500 }
      );
    }
  }

  const envCredentials = getEnvCredentials();
  if (envCredentials) return envCredentials;

  throw new FacturatechError(
    Number.isInteger(empresaId) && empresaId > 0
      ? `No hay credenciales válidas en CredencialesWSDLFacturaTech para IdEmpresaV=${empresaId}`
      : "IdEmpresaV requerido para consultar las credenciales de Facturatech"
  );
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseSoapField(body, fieldName) {
  const match = body.match(
    new RegExp(`<${fieldName}[^>]*>([^<]*)</${fieldName}>`, "i")
  );
  return match?.[1]?.trim() ?? null;
}

function parseSoapResponse(body) {
  const codeRaw = parseSoapField(body, "code");
  return {
    transaccionID: parseSoapField(body, "transaccionID"),
    code: codeRaw != null ? Number.parseInt(codeRaw, 10) : null,
    error:
      parseSoapField(body, "error") ||
      parseSoapField(body, "msg") ||
      parseSoapField(body, "message"),
    resourceData: parseSoapField(body, "resourceData"),
    raw: body,
  };
}

async function soapCall(action, bodyFields, wsdlUrl = DEFAULT_WSDL_URL) {
  const fields = Object.entries(bodyFields)
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join("\n      ");

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP-ENV:Body>
    <${action}>
      ${fields}
    </${action}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

  const response = await fetch(wsdlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: action,
    },
    body: envelope,
  });

  const body = await response.text();
  if (!response.ok) {
    throw new FacturatechError(`Facturatech respondió HTTP ${response.status}`, {
      raw: body,
    });
  }

  return parseSoapResponse(body);
}

/**
 * Busca la factura en Facturatech y devuelve su CUFE.
 * Equivalente a EnviarNotaCredito() en wbsFactura.php.
 */
export async function obtenerCufeFactura(prefijo, folio, idEmpresaV) {
  const { username, password, wsdlUrl } = await getCredentials(idEmpresaV);
  const folioOriginal = String(folio ?? "").trim();
  const folioSinCeros =
    /^\d+$/.test(folioOriginal)
      ? folioOriginal.replace(/^0+(?=\d)/, "")
      : folioOriginal;
  const folios = [...new Set([folioOriginal, folioSinCeros].filter(Boolean))];
  let ultimoError = null;

  for (const folioCandidato of folios) {
    try {
      const result = await soapCall(
        "FtechAction.getCUFEFile",
        {
          username,
          password,
          prefijo,
          folio: folioCandidato,
        },
        wsdlUrl
      );

      if (result.resourceData) {
        return result.resourceData;
      }

      ultimoError = new FacturatechError(
        result.error ||
          `No se obtuvo CUFE desde Facturatech para el folio ${folioCandidato}`,
        result
      );
    } catch (error) {
      ultimoError = error;
    }
  }

  const intentos = folios.join(" y ");
  throw new FacturatechError(
    `No se obtuvo CUFE consultando los folios ${intentos}. ${ultimoError?.message || ""}`.trim(),
    {
      code: ultimoError?.code,
      transaccionID: ultimoError?.transaccionID,
      raw: ultimoError?.raw,
      statusCode: ultimoError?.statusCode,
    }
  );
}

/**
 * Descarga el PDF de una factura firmada en Facturatech.
 * Equivalente a downloadPDFFile del WSDL.
 */
export async function obtenerPdfFactura(prefijo, folio, idEmpresaV) {
  const { username, password, wsdlUrl } = await getCredentials(idEmpresaV);

  const result = await soapCall("FtechAction.downloadPDFFile", {
    username,
    password,
    prefijo,
    folio,
  }, wsdlUrl);

  const pdfBase64 = result.resourceData;
  if (!pdfBase64) {
    throw new FacturatechError(
      result.error || "No se obtuvo PDF desde Facturatech",
      result
    );
  }

  return Buffer.from(pdfBase64, "base64");
}

/**
 * Sube un XML a Facturatech y consulta el estado del documento.
 * Equivalente al núcleo de EnviarFactura() / EnviarFacturaNC().
 */
export async function enviarXmlFacturatech(xmlContenido, idEmpresaV) {
  const { username, password, wsdlUrl } = await getCredentials(idEmpresaV);
  const xmlBase64 = Buffer.from(xmlContenido, "utf8").toString("base64");

  const upload = await ejecutarPaso(
    "Paso 3.1: Subir XML (uploadInvoiceFile)",
    () =>
      soapCall("FtechAction.uploadInvoiceFile", {
        username,
        password,
        xmlBase64,
      }, wsdlUrl)
  );

  if (!upload.transaccionID) {
    throw new FacturatechError(
      mensajePaso(
        "Paso 3.1: Subir XML (uploadInvoiceFile)",
        upload.error || "Facturatech no devolvió transaccionID"
      ),
      upload
    );
  }

  const status = await ejecutarPaso(
    "Paso 3.2: Consultar estado (documentStatusFile)",
    () =>
      soapCall("FtechAction.documentStatusFile", {
        username,
        password,
        transaccionID: upload.transaccionID,
      }, wsdlUrl)
  );

  return {
    code: upload.code,
    error: upload.error || status.error,
    transaccionID: upload.transaccionID,
    upload,
    status,
  };
}

async function leerXmlDesdeArchivo(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    throw new FacturatechError(`No se encontró el archivo XML: ${filePath}`);
  }
}

/**
 * Envía factura electrónica desde face_{numero}.xml
 * Equivalente a EnviarFactura($NumeroFactura).
 */
export async function enviarFacturaFacturatech(
  numeroFactura,
  xmlContenido,
  idEmpresaV
) {
  let xml = xmlContenido;

  if (!xml) {
    const filePath = path.join(
      resolveXmlOutputDir(),
      xmlFileNameFactura(numeroFactura)
    );
    xml = await leerXmlDesdeArchivo(filePath);
  }

  return enviarXmlFacturatech(xml, idEmpresaV);
}

/**
 * Envía nota crédito desde face_{numeroNota}{prefijoNC}.xml
 * Equivalente a EnviarFacturaNC($NumeroNota, $prefijoNC).
 */
export async function enviarNotaCreditoFacturatech(
  numeroNota,
  prefijoNC,
  xmlContenido,
  idEmpresaV
) {
  let xml = xmlContenido;

  if (!xml) {
    const filePath = path.join(
      resolveXmlOutputDir(),
      xmlFileNameNotaCredito(numeroNota, prefijoNC)
    );
    xml = await leerXmlDesdeArchivo(filePath);
  }

  return enviarXmlFacturatech(xml, idEmpresaV);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
