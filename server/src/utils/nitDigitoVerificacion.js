/**
 * Dígito de verificación NIT (Colombia / DIAN), algoritmo módulo 11.
 * Solo aplica cuando el tipo de documento DIAN es 31 (NIT).
 */

export const CODIGO_DIAN_NIT = 31;

const PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

function limpiarTexto(value) {
  return String(value ?? "").trim();
}

function soloDigitos(value) {
  return limpiarTexto(value).replace(/\D/g, "");
}

/**
 * Limpia el documento: quita espacios y guiones finales (ej. 71668114-).
 */
export function normalizarDocumentoSinDigito(value) {
  return limpiarTexto(value).replace(/-+$/, "");
}

/**
 * Separa NIT base y DV según tipo DIAN y formatos habituales en BD.
 *
 * NIT (31): 900063460-1, 900063460-, 900063460, 9000634601+DV en columna aparte.
 * Otros tipos: documento completo sin quitar dígito de verificación (no aplica DV NIT).
 */
export function extraerComponentesDocumento(
  tipoDocumentoDian,
  documentoCompleto,
  documentoDesdeVista = "",
  digitoDesdeBd = ""
) {
  const tipo = Number(tipoDocumentoDian);
  const completo = limpiarTexto(documentoCompleto);
  const vista = limpiarTexto(documentoDesdeVista);
  const dvBd = limpiarTexto(digitoDesdeBd);

  if (tipo !== CODIGO_DIAN_NIT) {
    const raw = completo || vista;
    return {
      base: normalizarDocumentoSinDigito(raw),
      dv: "",
    };
  }

  const fuente = completo || vista;
  if (!fuente) {
    return { base: "", dv: dvBd };
  }

  const conGuionYDv = fuente.match(/^([\d.\s]+)-(\d)$/);
  if (conGuionYDv) {
    return {
      base: soloDigitos(conGuionYDv[1]),
      dv: conGuionYDv[2],
    };
  }

  const conGuionSinDv = fuente.match(/^([\d.\s]+)-$/);
  if (conGuionSinDv) {
    return {
      base: soloDigitos(conGuionSinDv[1]),
      dv: dvBd,
    };
  }

  let digitos = soloDigitos(fuente);
  const vistaDigitos = soloDigitos(vista);
  const completoDigitos = soloDigitos(completo);

  if (
    completoDigitos &&
    vistaDigitos &&
    completoDigitos.length > vistaDigitos.length &&
    completoDigitos.startsWith(vistaDigitos)
  ) {
    digitos = completoDigitos;
  }

  if (dvBd && digitos.length > 1 && digitos.endsWith(dvBd)) {
    const posibleBase = digitos.slice(0, -dvBd.length);
    if (posibleBase.length >= 6) {
      return { base: posibleBase, dv: dvBd };
    }
  }

  return { base: digitos, dv: dvBd };
}

/**
 * Documento para EMI_2 / ENC_2 / ADQ_2 sin dígito de verificación NIT.
 */
export function resolverDocumentoSinDigito(
  tipoDocumentoDian,
  documentoCompleto,
  documentoDesdeVista = "",
  digitoDesdeBd = ""
) {
  return extraerComponentesDocumento(
    tipoDocumentoDian,
    documentoCompleto,
    documentoDesdeVista,
    digitoDesdeBd
  ).base;
}

export function calcularDigitoVerificacionNit(nitBase) {
  const digitos = soloDigitos(nitBase);
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
 * DV para EMI_22: desde BD, guión NIT-DV, o cálculo DIAN si es NIT y falta.
 */
export function resolverDigitoVerificacionNit(
  tipoDocumentoDian,
  documentoCompleto,
  documentoDesdeVista = "",
  digitoDesdeBd = ""
) {
  const tipo = Number(tipoDocumentoDian);
  if (tipo !== CODIGO_DIAN_NIT) {
    return limpiarTexto(digitoDesdeBd);
  }

  const { base, dv } = extraerComponentesDocumento(
    tipoDocumentoDian,
    documentoCompleto,
    documentoDesdeVista,
    digitoDesdeBd
  );

  if (dv) {
    return dv;
  }

  if (base) {
    return calcularDigitoVerificacionNit(base);
  }

  return "";
}
