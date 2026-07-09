import { getPool, sql } from "../config/db.js";
import { esSoloXmlFactura, esSoloXmlNotaCredito } from "../config/feModo.js";
import { FacturaError } from "./factura.service.js";
import {
  delay,
  enviarFacturaFacturatech,
  enviarNotaCreditoFacturatech,
  FacturatechError,
} from "./facturatech.service.js";
import { generarXmlFactura } from "./xml/generarXmlFactura.service.js";
import { generarXmlNotaCredito } from "./xml/generarXmlNotaCredito.service.js";
import { ejecutarPaso, mensajePaso } from "../utils/feStepError.js";

const DELAY_ENVIO_MS = Number.parseInt(process.env.FACTURATECH_ENVIO_DELAY_MS || "2000", 10);

async function marcarFacturaEnviada(numeroFactura) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("estado", sql.Int, 1)
    .input("numero", sql.NVarChar, String(numeroFactura).trim())
    .query(`
      UPDATE dbo.Factura
      SET EstadoFacturaElectronica = @estado
      WHERE RTRIM([No Factura]) = RTRIM(@numero)
    `);

  if (!result.rowsAffected[0]) {
    throw new FacturaError("No se pudo actualizar el estado de la factura", 500);
  }
}

async function marcarNotaCreditoEnviada(numeroNotaCredito) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("estado", sql.Int, 1)
    .input("numero", sql.NVarChar, String(numeroNotaCredito).trim())
    .query(`
      UPDATE dbo.[Nota Crédito]
      SET EstadoFace = @estado
      WHERE RTRIM([Número Nota Crédito]) = RTRIM(@numero)
    `);

  if (!result.rowsAffected[0]) {
    throw new FacturaError("No se pudo actualizar el estado de la nota crédito", 500);
  }
}

function validarRespuestaEnvio(resultado, etiqueta) {
  if (resultado.code === 201) {
    return;
  }

  throw new FacturatechError(
    resultado.error || `Error al enviar ${etiqueta} a Facturatech`,
    resultado
  );
}

function mensajeXmlGuardado(generado) {
  return generado.relativePath || generado.fileName || "xml/";
}

function enriquecerErrorConXml(error, generado, etiquetaDoc) {
  const rutaXml = mensajeXmlGuardado(generado);
  if (!(error instanceof FacturatechError) || !rutaXml) {
    return error;
  }

  return new FacturatechError(
    `${error.message}\n\nEl XML de ${etiquetaDoc} ya fue guardado en: ${rutaXml}`,
    {
      code: error.code,
      transaccionID: error.transaccionID,
      raw: error.raw,
      statusCode: error.statusCode,
    }
  );
}

export async function enviarFacturaElectronica(numero, idEmpresaV) {
  const generado = await ejecutarPaso(
    "Paso 1: Generar XML de factura",
    () =>
      generarXmlFactura(numero, idEmpresaV, {
        guardarArchivo: true,
      })
  );

  const rutaXml = mensajeXmlGuardado(generado);

  if (esSoloXmlFactura()) {
    return {
      ...generado,
      modo: "solo_xml",
      enviado: false,
      pasos: ["Paso 1: XML generado", "Paso 2-4: omitidos (FE_FACTURA_MODO=solo_xml)"],
      message:
        `${mensajePaso("Paso 1: Generar XML", "Completado")}\n` +
        `Archivo: ${rutaXml}\n\n` +
        `${mensajePaso("Paso 2-4: Envío Facturatech", "Omitido por FE_FACTURA_MODO=solo_xml")}`,
    };
  }

  await ejecutarPaso("Paso 2: Espera antes del envío", () => delay(DELAY_ENVIO_MS));

  try {
    const envio = await ejecutarPaso("Paso 3: Enviar a Facturatech", () =>
      enviarFacturaFacturatech(generado.numeroFactura, generado.xml)
    );

    validarRespuestaEnvio(envio, "la factura");

    await ejecutarPaso("Paso 4: Actualizar estado en BD", () =>
      marcarFacturaEnviada(generado.numeroFactura)
    );

    return {
      ...generado,
      modo: "enviar",
      enviado: true,
      envio: {
        code: envio.code,
        transaccionID: envio.transaccionID,
      },
      pasos: [
        "Paso 1: XML generado",
        "Paso 2: Espera completada",
        "Paso 3: Enviado a Facturatech",
        "Paso 4: BD actualizada",
      ],
      message:
        `${mensajePaso("Paso 1", `XML guardado en ${rutaXml}`)}\n` +
        `${mensajePaso("Paso 3", `Facturatech code ${envio.code}, transaccionID ${envio.transaccionID}`)}\n` +
        `${mensajePaso("Paso 4", "EstadoFacturaElectronica actualizado")}\n\n` +
        `La factura número ${generado.numeroFactura} fue enviada correctamente.`,
    };
  } catch (error) {
    throw enriquecerErrorConXml(error, generado, "la factura");
  }
}

export async function enviarNotaCreditoElectronica(
  numeroFactura,
  numeroNotaCredito,
  idEmpresaV,
  { cufe } = {}
) {
  const generado = await ejecutarPaso(
    "Paso 1: Generar XML de nota crédito (BD + CUFE + archivo)",
    () =>
      generarXmlNotaCredito(numeroFactura, numeroNotaCredito, idEmpresaV, {
        guardarArchivo: true,
        cufe,
      })
  );

  const rutaXml = mensajeXmlGuardado(generado);

  if (esSoloXmlNotaCredito()) {
    return {
      ...generado,
      modo: "solo_xml",
      enviado: false,
      pasos: [
        "Paso 1: XML generado (incluye consulta CUFE si aplica)",
        "Paso 2-4: omitidos (FE_NOTA_CREDITO_MODO=solo_xml)",
      ],
      message:
        `${mensajePaso("Paso 1: Generar XML", "Completado")}\n` +
        `Archivo: ${rutaXml}\n\n` +
        `${mensajePaso("Paso 2-4: Envío Facturatech", "Omitido por FE_NOTA_CREDITO_MODO=solo_xml")}`,
    };
  }

  await ejecutarPaso("Paso 2: Espera antes del envío", () => delay(DELAY_ENVIO_MS));

  try {
    const envio = await ejecutarPaso("Paso 3: Enviar a Facturatech", () =>
      enviarNotaCreditoFacturatech(
        generado.numeroNotaCredito,
        generado.prefijoNC,
        generado.xml
      )
    );

    validarRespuestaEnvio(envio, "la nota crédito");

    await ejecutarPaso("Paso 4: Actualizar estado en BD", () =>
      marcarNotaCreditoEnviada(generado.numeroNotaCredito)
    );

    return {
      ...generado,
      modo: "enviar",
      enviado: true,
      envio: {
        code: envio.code,
        transaccionID: envio.transaccionID,
      },
      pasos: [
        "Paso 1: XML generado",
        "Paso 2: Espera completada",
        "Paso 3: Enviado a Facturatech",
        "Paso 4: BD actualizada",
      ],
      message:
        `${mensajePaso("Paso 1", `XML guardado en ${rutaXml}`)}\n` +
        `${mensajePaso("Paso 3", `Facturatech code ${envio.code}, transaccionID ${envio.transaccionID}`)}\n` +
        `${mensajePaso("Paso 4", "EstadoFace actualizado")}\n\n` +
        `La nota número ${generado.numeroNotaCredito} fue enviada correctamente.`,
    };
  } catch (error) {
    throw enriquecerErrorConXml(error, generado, "la nota crédito");
  }
}

export { FacturatechError };
