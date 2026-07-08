import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { cargarDatosXmlFactura } from "./facturaXmlData.service.js";
import { buildFacturaXml } from "./facturaXmlBuilder.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, "../../..");
const PROJECT_ROOT = path.join(SERVER_ROOT, "..");

function resolveXmlOutputDir() {
  if (process.env.XML_OUTPUT_DIR) {
    return path.isAbsolute(process.env.XML_OUTPUT_DIR)
      ? process.env.XML_OUTPUT_DIR
      : path.resolve(SERVER_ROOT, process.env.XML_OUTPUT_DIR);
  }
  return path.join(PROJECT_ROOT, "xml");
}

export async function generarXmlFactura(numero, idEmpresaV, { guardarArchivo = true } = {}) {
  const data = await cargarDatosXmlFactura(numero, idEmpresaV);
  const xml = buildFacturaXml(data);
  const fileName = `face_${data.factura.numF}.xml`;
  let filePath = null;
  let relativePath = null;

  if (guardarArchivo) {
    const outputDir = resolveXmlOutputDir();
    await fs.mkdir(outputDir, { recursive: true });
    filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, xml, "utf8");
    relativePath = path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
  }

  return {
    xml,
    fileName,
    filePath,
    relativePath,
    numeroFactura: data.factura.numF,
    prefijo: data.factura.prefijoF,
    tipoFactura: data.tipoFactura,
  };
}
