import { FacturaError } from "../services/factura.service.js";
import { FacturatechError } from "../services/facturatech.service.js";

export function mensajePaso(paso, detalle) {
  return `[${paso}] ${detalle}`;
}

export function relanzarConPaso(error, paso) {
  const detalle = error?.message || String(error);

  if (detalle.startsWith("[")) {
    throw error;
  }

  if (error instanceof FacturaError) {
    throw new FacturaError(mensajePaso(paso, detalle), error.statusCode);
  }

  if (error instanceof FacturatechError) {
    throw new FacturatechError(mensajePaso(paso, detalle), {
      code: error.code,
      transaccionID: error.transaccionID,
      raw: error.raw,
      statusCode: error.statusCode,
    });
  }

  throw new FacturaError(mensajePaso(paso, detalle), 500);
}

export async function ejecutarPaso(paso, fn) {
  try {
    return await fn();
  } catch (error) {
    relanzarConPaso(error, paso);
    throw error;
  }
}
