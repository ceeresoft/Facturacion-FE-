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
const SC_EXE = process.env.SC_EXE || "C:\\Windows\\System32\\sc.exe";
const NSSM_EXE = process.env.NSSM_EXE?.trim() || "";

function mapScState(stdout) {
  const text = String(stdout);
  if (/STATE\s+:\s+\d+\s+RUNNING/i.test(text)) return "SERVICE_RUNNING";
  if (/STATE\s+:\s+\d+\s+STOPPED/i.test(text)) return "SERVICE_STOPPED";
  if (/STATE\s+:\s+\d+\s+START_PENDING/i.test(text)) return "SERVICE_START_PENDING";
  if (/STATE\s+:\s+\d+\s+STOP_PENDING/i.test(text)) return "SERVICE_STOP_PENDING";
  return text.trim() || "unknown";
}

function isBenignScError(action, error) {
  const message = String(error?.message || error?.stderr || error?.stdout || "");
  if (action === "start" && /1056|already running|ya se est[aá] ejecutando/i.test(message)) {
    return true;
  }
  if (action === "stop" && /1062|has not been started|no se ha iniciado/i.test(message)) {
    return true;
  }
  return false;
}

async function runSc(action) {
  const quotedSc = `"${SC_EXE}"`;
  const quotedService = `"${SERVICE_NAME}"`;
  const command =
    action === "query"
      ? `${quotedSc} query ${quotedService}`
      : `${quotedSc} ${action} ${quotedService}`;
  const { stdout, stderr } = await execAsync(command);
  return String(stdout || stderr || "").trim();
}

async function runNssm(action) {
  if (!NSSM_EXE) {
    throw new Error("NSSM_EXE no configurado");
  }
  const quotedNssm = `"${NSSM_EXE}"`;
  const quotedService = `"${SERVICE_NAME}"`;
  const command =
    action === "query"
      ? `${quotedNssm} status ${quotedService}`
      : `${quotedNssm} ${action} ${quotedService}`;
  const { stdout, stderr } = await execAsync(command);
  return String(stdout || stderr || "").trim();
}

export async function getNssmServiceStatus() {
  try {
    const output = await runSc("query");
    return mapScState(output);
  } catch {
    if (!NSSM_EXE) return "unknown";
    try {
      return (await runNssm("query")).trim() || "unknown";
    } catch {
      return "unknown";
    }
  }
}

export async function controlNssmWorkerService(action) {
  try {
    const output = await runSc(action);
    return { ok: true, output };
  } catch (error) {
    if (isBenignScError(action, error)) {
      return { ok: true, output: String(error?.message || error).trim() };
    }

    if (NSSM_EXE) {
      try {
        const output = await runNssm(action);
        return { ok: true, output };
      } catch (nssmError) {
        return {
          ok: false,
          output: nssmError?.message || `No se pudo controlar el servicio ${SERVICE_NAME}`,
        };
      }
    }

    return {
      ok: false,
      output: error?.message || `No se pudo ejecutar sc ${action}`,
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
