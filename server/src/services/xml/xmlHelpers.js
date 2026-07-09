export function txt(value) {
  if (value == null) return "";
  return String(value);
}

/**
 * Código municipio DANE (5 dígitos: depto + ciudad).
 * Si la ciudad trae menos de 5 dígitos (ej. 001), antepone el departamento (ej. 05 → 05001).
 */
export function resolverCodigoMunicipioDian(codigoCiudad, codigoDepartamento) {
  const ciudad = String(codigoCiudad ?? "")
    .trim()
    .replace(/\D/g, "");
  const depto = String(codigoDepartamento ?? "")
    .trim()
    .replace(/\D/g, "");

  if (!ciudad) {
    return txt(codigoCiudad);
  }

  if (ciudad.length >= 5) {
    return ciudad;
  }

  if (!depto) {
    return ciudad;
  }

  const deptoPadded = depto.padStart(2, "0").slice(-2);
  const ciudadPadded = ciudad.padStart(3, "0").slice(-3);
  return `${deptoPadded}${ciudadPadded}`;
}

export function formatDateYmd(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return txt(value);
  return date.toISOString().slice(0, 10);
}

export function formatDateTimeIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return txt(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatTimeHms(value) {
  if (!value) return "00:00:00";
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  const raw = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}/.test(raw)) return raw.slice(0, 8);
  return raw || "00:00:00";
}

export function mapFormaPagoXml(idFormaPago) {
  const id = idFormaPago == null ? null : Number(idFormaPago);
  switch (id) {
    case 2:
      return { medioPagoF: 1, formadePagoFac: 10, nombre: "efectivo" };
    case 4:
      return { medioPagoF: 1, formadePagoFac: 49, nombre: "tarjeta de debito" };
    case 3:
      return { medioPagoF: 1, formadePagoFac: 20, nombre: "Cheque" };
    case 5:
      return { medioPagoF: 1, formadePagoFac: 48, nombre: "tarjeta de credito" };
    case null:
    case 6:
    case 7:
      return { medioPagoF: 2, formadePagoFac: 45, nombre: "Credito" };
    default:
      return { medioPagoF: 2, formadePagoFac: 45, nombre: "Credito" };
  }
}

export function appendFlat(parent, entries) {
  entries.forEach(([tag, value]) => {
    parent.ele(tag).txt(txt(value));
  });
}
