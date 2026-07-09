import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, "../../.env") });

const DEFAULT_API_PORT = 3005;
const DEFAULT_FRONTEND_PORT = 8080;
const DEFAULT_HOST = "localhost";

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getApiPort() {
  return parsePort(process.env.PORT, DEFAULT_API_PORT);
}

export function getFrontendPort() {
  return parsePort(process.env.FRONTEND_PORT, DEFAULT_FRONTEND_PORT);
}

export function getApiHost() {
  return (process.env.API_HOST || DEFAULT_HOST).trim();
}

export function getFrontendHost() {
  return (process.env.FRONTEND_HOST || DEFAULT_HOST).trim();
}

export function getApiBaseUrl() {
  const explicit = process.env.API_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return `http://${getApiHost()}:${getApiPort()}`;
}

export function getFrontendUrl() {
  const explicit = process.env.CORS_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return `http://${getFrontendHost()}:${getFrontendPort()}`;
}

export function getPublicAppConfig() {
  return {
    apiBaseUrl: getApiBaseUrl(),
    apiPort: getApiPort(),
    frontendUrl: getFrontendUrl(),
    frontendPort: getFrontendPort(),
  };
}
