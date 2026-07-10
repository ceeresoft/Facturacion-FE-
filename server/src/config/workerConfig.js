import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../../.env") });

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBool(value, fallback = false) {
  if (value == null || String(value).trim() === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "si", "sí", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

export function isWorkerEnabled() {
  return parseBool(process.env.WORKER_ENABLED, true);
}

export function getWorkerPollIntervalMs() {
  return parsePositiveInt(process.env.WORKER_POLL_INTERVAL_MS, 60_000);
}

export function getWorkerMaxPerCycle() {
  return parsePositiveInt(process.env.WORKER_MAX_PER_CYCLE, 5);
}

export function getWorkerDelayBetweenMs() {
  return parsePositiveInt(process.env.WORKER_DELAY_BETWEEN_MS, 3_000);
}

export function getWorkerMaxRetriesPerWindow() {
  return parsePositiveInt(process.env.WORKER_MAX_RETRIES_PER_WINDOW, 2);
}

export function getWorkerRetryWindowMs() {
  return parsePositiveInt(process.env.WORKER_RETRY_WINDOW_MS, 15 * 60 * 1000);
}

export function getWorkerConfig() {
  return {
    enabled: isWorkerEnabled(),
    pollIntervalMs: getWorkerPollIntervalMs(),
    maxPerCycle: getWorkerMaxPerCycle(),
    delayBetweenMs: getWorkerDelayBetweenMs(),
    maxRetriesPerWindow: getWorkerMaxRetriesPerWindow(),
    retryWindowMs: getWorkerRetryWindowMs(),
  };
}
