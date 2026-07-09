import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, "../..");
const PROJECT_ROOT = path.join(SERVER_ROOT, "..");

export function resolveXmlOutputDir() {
  if (process.env.XML_OUTPUT_DIR) {
    return path.isAbsolute(process.env.XML_OUTPUT_DIR)
      ? process.env.XML_OUTPUT_DIR
      : path.resolve(SERVER_ROOT, process.env.XML_OUTPUT_DIR);
  }
  return path.join(PROJECT_ROOT, "xml");
}

export function xmlFileNameFactura(numeroFactura) {
  return `face_${String(numeroFactura).trim()}.xml`;
}

export function xmlFileNameNotaCredito(numeroNota, prefijoNC) {
  return `face_${String(numeroNota).trim()}${String(prefijoNC).trim()}.xml`;
}

export function toRelativeXmlPath(absolutePath) {
  return path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join("/");
}
