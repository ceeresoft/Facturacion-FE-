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
import {
  resolveXmlOutputDir,
  xmlFileNameFactura,
  xmlFileNameNotaCredito,
} from "../utils/xmlPaths.js";
import { ejecutarPaso, mensajePaso } from "../utils/feStepError.js";

const WSDL_URL =
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

function getCredentials() {
  const username = process.env.FACTURATECH_USER;
  const password = process.env.FACTURATECH_PASSWORD;

  if (!username || !password) {
    throw new FacturatechError(
      "FACTURATECH_USER y FACTURATECH_PASSWORD no están configurados"
    );
  }

  return { username, password };
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

async function soapCall(action, bodyFields) {
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

  const response = await fetch(WSDL_URL, {
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
export async function obtenerCufeFactura(prefijo, folio) {
  const { username, password } = getCredentials();

  const result = await soapCall("FtechAction.getCUFEFile", {
    username,
    password,
    prefijo,
    folio,
  });

  const cufe = result.resourceData;
  if (!cufe) {
    throw new FacturatechError(
      result.error || "No se obtuvo CUFE desde Facturatech",
      result
    );
  }

  return cufe;
}

/**
 * Descarga el PDF de una factura firmada en Facturatech.
 * Equivalente a downloadPDFFile del WSDL.
 */
export async function obtenerPdfFactura(prefijo, folio) {
  const { username, password } = getCredentials();

  const result = await soapCall("FtechAction.downloadPDFFile", {
    username,
    password,
    prefijo,
    folio,
  });

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
export async function enviarXmlFacturatech(xmlContenido) {
  const { username, password } = getCredentials();
  const xmlBase64 = Buffer.from(xmlContenido, "utf8").toString("base64");

  const upload = await ejecutarPaso(
    "Paso 3.1: Subir XML (uploadInvoiceFile)",
    () =>
      soapCall("FtechAction.uploadInvoiceFile", {
        username,
        password,
        xmlBase64,
      })
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
      })
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
export async function enviarFacturaFacturatech(numeroFactura, xmlContenido) {
  let xml = xmlContenido;

  if (!xml) {
    const filePath = path.join(
      resolveXmlOutputDir(),
      xmlFileNameFactura(numeroFactura)
    );
    xml = await leerXmlDesdeArchivo(filePath);
  }

  return enviarXmlFacturatech(xml);
}

/**
 * Envía nota crédito desde face_{numeroNota}{prefijoNC}.xml
 * Equivalente a EnviarFacturaNC($NumeroNota, $prefijoNC).
 */
export async function enviarNotaCreditoFacturatech(
  numeroNota,
  prefijoNC,
  xmlContenido
) {
  let xml = xmlContenido;

  if (!xml) {
    const filePath = path.join(
      resolveXmlOutputDir(),
      xmlFileNameNotaCredito(numeroNota, prefijoNC)
    );
    xml = await leerXmlDesdeArchivo(filePath);
  }

  return enviarXmlFacturatech(xml);
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
