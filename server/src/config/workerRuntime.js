import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isWorkerEnabled } from "./workerConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_PATH = path.join(__dirname, "../../config/worker-runtime.json");

const DEFAULT_RUNTIME = {
  enabled: false,
  updatedAt: null,
  updatedBy: null,
};

function ensureRuntimeFile() {
  if (fs.existsSync(RUNTIME_PATH)) {
    return;
  }
  const initial = {
    ...DEFAULT_RUNTIME,
    enabled: isWorkerEnabled(),
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
  fs.mkdirSync(path.dirname(RUNTIME_PATH), { recursive: true });
  fs.writeFileSync(RUNTIME_PATH, JSON.stringify(initial, null, 2), "utf8");
}

function readRuntimeFile() {
  ensureRuntimeFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(RUNTIME_PATH, "utf8"));
    return {
      ...DEFAULT_RUNTIME,
      ...parsed,
      enabled: Boolean(parsed?.enabled),
    };
  } catch {
    return { ...DEFAULT_RUNTIME };
  }
}

export function getWorkerRuntimeState() {
  return readRuntimeFile();
}

export function isWorkerRuntimeEnabled() {
  return readRuntimeFile().enabled;
}

export function setWorkerRuntimeEnabled(enabled, updatedBy = "api") {
  const next = {
    enabled: Boolean(enabled),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  fs.mkdirSync(path.dirname(RUNTIME_PATH), { recursive: true });
  fs.writeFileSync(RUNTIME_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getWorkerRuntimePath() {
  return RUNTIME_PATH;
}
