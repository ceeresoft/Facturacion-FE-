import { getModoFactura } from "../config/feModo.js";
import {
  getWorkerConfig,
  getWorkerDormantPollIntervalMs,
  isWorkerEnabled,
} from "../config/workerConfig.js";
import { isWorkerRuntimeEnabled } from "../config/workerRuntime.js";
import { listarFacturasPendientesEnvio } from "../services/factura.service.js";
import { enviarFacturaElectronica } from "../services/envioElectronico.service.js";
import { controlNssmWorkerService } from "../services/workerControl.service.js";
import {
  buildRetryKey,
  clearRetryAttempts,
  evaluateRetryLimit,
  formatRetryWait,
  recordFailedAttempt,
} from "./retryTracker.js";
import { writeWorkerHeartbeat } from "./workerHeartbeat.js";

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

function resolveWorkerMode() {
  const facturaModo = getModoFactura();
  const blocked = facturaModo === "solo_xml";
  const envEnabled = isWorkerEnabled();
  const runtimeEnabled = isWorkerRuntimeEnabled();
  const active = !blocked && envEnabled && runtimeEnabled;

  let reason = null;
  if (blocked) {
    reason = "solo_xml";
  } else if (!envEnabled) {
    reason = "env_disabled";
  } else if (!runtimeEnabled) {
    reason = "ui_disabled";
  }

  return { facturaModo, blocked, envEnabled, runtimeEnabled, active, reason };
}

async function enterDormantMode(reason) {
  const labels = {
    solo_xml: "FE_FACTURA_MODO=solo_xml",
    env_disabled: "WORKER_ENABLED=false",
    ui_disabled: "desactivado desde la aplicación",
  };

  logInfo(
    `Worker en reposo (${labels[reason] || reason}) — sin consultas a la base de datos`
  );

  writeWorkerHeartbeat({
    status: "dormant",
    reason,
    facturaModo: getModoFactura(),
    runtimeEnabled: isWorkerRuntimeEnabled(),
  });

  if (reason === "solo_xml") {
    const stop = await controlNssmWorkerService("stop");
    if (stop.ok) {
      logInfo("Servicio NSSM detenido automáticamente por modo solo_xml");
      process.exit(0);
    }
  }
}

async function procesarCiclo(config) {
  const pendientes = await listarFacturasPendientesEnvio({
    limit: config.maxPerCycle,
  });

  writeWorkerHeartbeat({
    status: "active",
    facturaModo: getModoFactura(),
    runtimeEnabled: true,
  });

  if (pendientes.length === 0) {
    logInfo("Sin facturas pendientes de envío");
    return;
  }

  logInfo(`Encontradas ${pendientes.length} factura(s) pendiente(s)`);

  for (const factura of pendientes) {
    const mode = resolveWorkerMode();
    if (!mode.active) {
      await enterDormantMode(mode.reason);
      return;
    }

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
  const dormantMs = getWorkerDormantPollIntervalMs();

  logInfo(
    `Iniciando worker auto-envío (interval=${config.pollIntervalMs}ms, dormant=${dormantMs}ms, max=${config.maxPerCycle}, retries=${config.maxRetriesPerWindow}/${Math.round(config.retryWindowMs / 60000)}min)`
  );

  let lastDormantReason = null;

  while (true) {
    const mode = resolveWorkerMode();

    if (!mode.active) {
      if (lastDormantReason !== mode.reason) {
        await enterDormantMode(mode.reason);
        lastDormantReason = mode.reason;
      } else {
        writeWorkerHeartbeat({
          status: "dormant",
          reason: mode.reason,
          facturaModo: mode.facturaModo,
          runtimeEnabled: mode.runtimeEnabled,
        });
      }
      await sleep(dormantMs);
      continue;
    }

    lastDormantReason = null;

    try {
      await procesarCiclo(config);
    } catch (error) {
      logError("Error inesperado en el ciclo del worker", error);
      writeWorkerHeartbeat({
        status: "error",
        message: error.message,
        facturaModo: mode.facturaModo,
        runtimeEnabled: mode.runtimeEnabled,
      });
    }

    await sleep(config.pollIntervalMs);
  }
}
