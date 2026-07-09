/**
 * Modo de operación FE por tipo de documento.
 *
 * Valores:
 *   - enviar    → genera XML y envía a Facturatech (flujo PHP completo)
 *   - solo_xml  → solo genera/guarda el XML, sin envío ni actualización en BD
 */

const MODOS_VALIDOS = new Set(["enviar", "solo_xml"]);

function parseModo(value, fallback = "enviar") {
  const modo = String(value ?? fallback).trim().toLowerCase();
  return MODOS_VALIDOS.has(modo) ? modo : fallback;
}

export function getModoFactura() {
  return parseModo(process.env.FE_FACTURA_MODO, "enviar");
}

export function getModoNotaCredito() {
  return parseModo(process.env.FE_NOTA_CREDITO_MODO, "enviar");
}

export function esSoloXmlFactura() {
  return getModoFactura() === "solo_xml";
}

export function esSoloXmlNotaCredito() {
  return getModoNotaCredito() === "solo_xml";
}
