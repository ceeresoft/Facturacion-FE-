import { exec } from "child_process";
import { promisify } from "util";
import { getModoFactura } from "../config/feModo.js";
import { isWorkerEnabled, getWorkerPollIntervalMs } from "../config/workerConfig.js";
import {
  getWorkerRuntimeState,
  isWorkerRuntimeEnabled,
  setWorkerRuntimeEnabled,
} from "../config/workerRuntime.js";
import { readWorkerHeartbeat } from "../worker/workerHeartbeat.js";

const execAsync = promisify(exec);
const SERVICE_NAME = process.env.WORKER_NSSM_SERVICE_NAME || "FacturacionFE-Worker";

export async function getNssmServiceStatus() {
  try {
    const { stdout } = await execAsync(`nssm status ${SERVICE_NAME}`);
    return String(stdout).trim();
  } catch {
    return "unknown";
  }
}

export async function controlNssmWorkerService(action) {
  try {
    const { stdout } = await execAsync(`nssm ${action} ${SERVICE_NAME}`);
    return { ok: true, output: String(stdout).trim() };
  } catch (error) {
    return {
      ok: false,
      output: error?.message || `No se pudo ejecutar nssm ${action}`,
    };
  }
}

export function isWorkerBlockedByMode() {
  return getModoFactura() === "solo_xml";
}

export function canEnableWorkerFromUi() {
  return !isWorkerBlockedByMode();
}

export function isWorkerEffectivelyEnabled() {
  if (isWorkerBlockedByMode()) {
    return false;
  }
  if (!isWorkerEnabled()) {
    return false;
  }
  return isWorkerRuntimeEnabled();
}

function isHeartbeatFresh(heartbeat) {
  if (!heartbeat?.lastBeat) {
    return false;
  }
  const ageMs = Date.now() - new Date(heartbeat.lastBeat).getTime();
  const maxAge = Math.max(getWorkerPollIntervalMs() * 3, 180_000);
  return ageMs <= maxAge;
}

export async function getWorkerUiStatus() {
  const facturaModo = getModoFactura();
  const blocked = facturaModo === "solo_xml";
  const envEnabled = isWorkerEnabled();
  const runtime = getWorkerRuntimeState();
  const runtimeEnabled = runtime.enabled;
  const canToggle = !blocked;
  const effectivelyEnabled = isWorkerEffectivelyEnabled();
  const heartbeat = readWorkerHeartbeat();
  const heartbeatFresh = isHeartbeatFresh(heartbeat);
  const nssmStatus = await getNssmServiceStatus();

  let effectiveStatus = "offline";
  let statusLabel = "Sin proceso worker";

  if (blocked) {
    effectiveStatus = "blocked";
    statusLabel = "Bloqueado (FE_FACTURA_MODO=solo_xml)";
  } else if (!envEnabled) {
    effectiveStatus = "inactive";
    statusLabel = "Inactivo (WORKER_ENABLED=false en .env)";
  } else if (!runtimeEnabled) {
    effectiveStatus = "inactive";
    statusLabel = "Inactivo (desactivado desde la aplicación)";
  } else if (heartbeat?.status === "active" && heartbeatFresh) {
    effectiveStatus = "active";
    statusLabel = "Activo — enviando pendientes automáticamente";
  } else if (heartbeat?.status === "dormant" && heartbeatFresh) {
    effectiveStatus = "dormant";
    statusLabel = "En reposo (sin consultas a BD)";
  } else if (nssmStatus === "SERVICE_RUNNING") {
    effectiveStatus = "starting";
    statusLabel = "Iniciando…";
  } else {
    effectiveStatus = "offline";
    statusLabel = "Sin proceso worker en ejecución";
  }

  return {
    facturaModo,
    blocked,
    canToggle,
    envEnabled,
    runtimeEnabled,
    effectivelyEnabled,
    effectiveStatus,
    statusLabel,
    processAlive: heartbeatFresh,
    heartbeat,
    nssmStatus,
    runtime,
  };
}

export async function setWorkerUiEnabled(enabled, updatedBy = "api") {
  if (enabled && !canEnableWorkerFromUi()) {
    const error = new Error(
      "No se puede activar el worker con FE_FACTURA_MODO=solo_xml"
    );
    error.statusCode = 403;
    throw error;
  }

  const runtime = setWorkerRuntimeEnabled(enabled, updatedBy);

  let nssm = null;
  if (enabled) {
    nssm = await controlNssmWorkerService("start");
  } else {
    nssm = await controlNssmWorkerService("stop");
  }

  return {
    runtime,
    nssm,
    status: await getWorkerUiStatus(),
  };
}
