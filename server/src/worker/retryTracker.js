import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "../../logs/worker-retry-state.json");

/** @type {Record<string, number[]>} */
let attemptsByKey = loadState();

function loadState() {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveState() {
  const dir = path.dirname(STATE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(attemptsByKey, null, 2), "utf8");
}

export function buildRetryKey(numero, idEmpresaV) {
  return `${String(numero).trim()}:${Number(idEmpresaV)}`;
}

function pruneAttempts(timestamps, windowMs, now = Date.now()) {
  const cutoff = now - windowMs;
  return timestamps.filter((ts) => ts >= cutoff);
}

/**
 * @returns {{ allowed: boolean, attemptsInWindow: number, retryAfterMs: number | null }}
 */
export function evaluateRetryLimit(key, { maxRetries, windowMs }) {
  const now = Date.now();
  const recent = pruneAttempts(attemptsByKey[key] ?? [], windowMs, now);

  if (recent.length >= maxRetries) {
    const oldest = Math.min(...recent);
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    return {
      allowed: false,
      attemptsInWindow: recent.length,
      retryAfterMs,
    };
  }

  return {
    allowed: true,
    attemptsInWindow: recent.length,
    retryAfterMs: null,
  };
}

export function recordFailedAttempt(key, { windowMs }) {
  const now = Date.now();
  const recent = pruneAttempts(attemptsByKey[key] ?? [], windowMs, now);
  recent.push(now);
  attemptsByKey[key] = recent;
  saveState();
}

export function clearRetryAttempts(key) {
  if (!attemptsByKey[key]) {
    return;
  }
  delete attemptsByKey[key];
  saveState();
}

export function formatRetryWait(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
