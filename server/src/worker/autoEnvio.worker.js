import { getModoFactura } from "../config/feModo.js";
import { getWorkerConfig } from "../config/workerConfig.js";
import { listarFacturasPendientesEnvio } from "../services/factura.service.js";
import { enviarFacturaElectronica } from "../services/envioElectronico.service.js";
import {
  buildRetryKey,
  clearRetryAttempts,
  evaluateRetryLimit,
  formatRetryWait,
  recordFailedAttempt,
} from "./retryTracker.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString();
}

function logInfo(message) {
  console.log(`[${timestamp()}] [worker] ${message}`);
}

function logError(message, error) {
  const detail = error?.message ? `: ${error.message}` : "";
  console.error(`[${timestamp()}] [worker] ERROR ${message}${detail}`);
  if (error?.stack) {
    console.error(error.stack);
  }
}

async function procesarCiclo(config) {
  if (getModoFactura() === "solo_xml") {
    logInfo(
      "Ciclo omitido: FE_FACTURA_MODO=solo_xml (el worker no envía en este modo)"
    );
    return;
  }

  const pendientes = await listarFacturasPendientesEnvio({
    limit: config.maxPerCycle,
  });

  if (pendientes.length === 0) {
    logInfo("Sin facturas pendientes de envío");
    return;
  }

  logInfo(`Encontradas ${pendientes.length} factura(s) pendiente(s)`);

  for (const factura of pendientes) {
    const etiqueta = `factura ${factura.numero} (empresa ${factura.idEmpresaV})`;
    const retryKey = buildRetryKey(factura.numero, factura.idEmpresaV);
    const retryLimit = evaluateRetryLimit(retryKey, {
      maxRetries: config.maxRetriesPerWindow,
      windowMs: config.retryWindowMs,
    });

    if (!retryLimit.allowed) {
      logInfo(
        `${etiqueta} omitida: límite de ${config.maxRetriesPerWindow} intento(s) en ` +
          `${Math.round(config.retryWindowMs / 60000)} min alcanzado. ` +
          `Reintento en ${formatRetryWait(retryLimit.retryAfterMs)}`
      );
      continue;
    }

    try {
      logInfo(`Enviando ${etiqueta}...`);
      const resultado = await enviarFacturaElectronica(
        factura.numero,
        factura.idEmpresaV
      );

      if (resultado.enviado) {
        clearRetryAttempts(retryKey);
        const txId = resultado.envio?.transaccionID ?? "—";
        logInfo(`${etiqueta} enviada. transaccionID=${txId}`);
      } else {
        logInfo(`${etiqueta} procesada en modo solo_xml (sin envío)`);
      }
    } catch (error) {
      recordFailedAttempt(retryKey, { windowMs: config.retryWindowMs });
      logError(`Fallo al enviar ${etiqueta}`, error);
    }

    if (config.delayBetweenMs > 0) {
      await sleep(config.delayBetweenMs);
    }
  }
}

export async function runAutoEnvioWorker() {
  const config = getWorkerConfig();

  logInfo(
    `Iniciando worker auto-envío (enabled=${config.enabled}, interval=${config.pollIntervalMs}ms, max=${config.maxPerCycle}, delay=${config.delayBetweenMs}ms, retries=${config.maxRetriesPerWindow}/${Math.round(config.retryWindowMs / 60000)}min)`
  );

  if (!config.enabled) {
    logInfo("WORKER_ENABLED=false — el proceso permanece activo sin ejecutar ciclos");
  }

  while (true) {
    if (config.enabled) {
      try {
        await procesarCiclo(config);
      } catch (error) {
        logError("Error inesperado en el ciclo del worker", error);
      }
    }

    await sleep(config.pollIntervalMs);
  }
}
