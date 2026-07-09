import fs from "fs/promises";
import path from "path";
import { cargarDatosXmlFactura } from "./facturaXmlData.service.js";
import { buildFacturaXml } from "./facturaXmlBuilder.service.js";
import {
  resolveXmlOutputDir,
  toRelativeXmlPath,
  xmlFileNameFactura,
} from "../../utils/xmlPaths.js";

export async function generarXmlFactura(numero, idEmpresaV, { guardarArchivo = true } = {}) {
  const data = await cargarDatosXmlFactura(numero, idEmpresaV);
  const xml = buildFacturaXml(data);
  const fileName = xmlFileNameFactura(data.factura.numF);
  let filePath = null;
  let relativePath = null;

  if (guardarArchivo) {
    const outputDir = resolveXmlOutputDir();
    await fs.mkdir(outputDir, { recursive: true });
    filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, xml, "utf8");
    relativePath = toRelativeXmlPath(filePath);
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
