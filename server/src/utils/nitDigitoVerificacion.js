/**
 * Dígito de verificación NIT (Colombia / DIAN), algoritmo módulo 11.
 * Solo aplica cuando el tipo de documento DIAN es 31 (NIT).
 */

export const CODIGO_DIAN_NIT = 31;

const PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * Limpia el documento para EMI_2 / ENC_2: quita guiones finales (ej. 71668114-).
 */
export function normalizarDocumentoSinDigito(value) {
  return String(value ?? "")
    .trim()
    .replace(/-+$/, "");
}

export function calcularDigitoVerificacionNit(nitBase) {
  const digitos = normalizarDocumentoSinDigito(nitBase).replace(/\D/g, "");
  if (!digitos) return "";

  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    const digito = Number.parseInt(digitos[digitos.length - 1 - i], 10);
    const peso = PESOS_NIT[i];
    if (Number.isNaN(digito) || peso == null) break;
    suma += digito * peso;
  }

  const residuo = suma % 11;
  const dv = residuo < 2 ? residuo : 11 - residuo;
  return String(dv);
}

/**
 * Devuelve el DV existente en BD o lo calcula si es NIT y viene vacío.
 */
export function resolverDigitoVerificacionNit(
  tipoDocumentoDian,
  nitBase,
  digitoDesdeBd
) {
  const tipo = Number(tipoDocumentoDian);
  const dvBd = String(digitoDesdeBd ?? "").trim();

  if (tipo !== CODIGO_DIAN_NIT) {
    return dvBd;
  }

  if (dvBd) {
    return dvBd;
  }

  const base = normalizarDocumentoSinDigito(nitBase).replace(/\D/g, "");
  if (!base) {
    return "";
  }

  return calcularDigitoVerificacionNit(base);
}
