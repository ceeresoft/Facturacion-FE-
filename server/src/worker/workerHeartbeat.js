import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEARTBEAT_PATH = path.join(__dirname, "../../logs/worker-heartbeat.json");

export function writeWorkerHeartbeat(payload) {
  const data = {
    pid: process.pid,
    lastBeat: new Date().toISOString(),
    ...payload,
  };
  fs.mkdirSync(path.dirname(HEARTBEAT_PATH), { recursive: true });
  fs.writeFileSync(HEARTBEAT_PATH, JSON.stringify(data, null, 2), "utf8");
}

export function readWorkerHeartbeat() {
  try {
    if (!fs.existsSync(HEARTBEAT_PATH)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(HEARTBEAT_PATH, "utf8"));
  } catch {
    return null;
  }
}

export function getHeartbeatPath() {
  return HEARTBEAT_PATH;
}
