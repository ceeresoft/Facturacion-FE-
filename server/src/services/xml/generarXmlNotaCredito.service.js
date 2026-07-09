import fs from "fs/promises";
import path from "path";
import { cargarDatosXmlNotaCredito } from "./notaCreditoXmlData.service.js";
import { buildNotaCreditoXml } from "./notaCreditoXmlBuilder.service.js";
import {
  resolveXmlOutputDir,
  toRelativeXmlPath,
  xmlFileNameNotaCredito,
} from "../../utils/xmlPaths.js";

export async function generarXmlNotaCredito(
  numeroFactura,
  numeroNotaCredito,
  idEmpresaV,
  { guardarArchivo = true, cufe } = {}
) {
  const data = await cargarDatosXmlNotaCredito(
    numeroFactura,
    numeroNotaCredito,
    idEmpresaV,
    { cufe }
  );
  const xml = buildNotaCreditoXml(data);
  const fileName = xmlFileNameNotaCredito(
    data.notaCredito.numNC,
    data.notaCredito.prefijoNC
  );
  let filePath = null;
  let relativePath = null;

  if (guardarArchivo) {
    const outputDir = resolveXmlOutputDir();
    await fs.mkdir(outputDir, { recursive: true });
    filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, xml, "utf8");
    relativePath = toRelativeXmlPath(filePath);
    console.log(
      `[NC XML] Guardado: ${relativePath} (factura ${data.factura.numF}, nota ${data.notaCredito.numNC})`
    );
  }

  return {
    xml,
    fileName,
    filePath,
    relativePath,
    numeroFactura: data.factura.numF,
    numeroNotaCredito: data.notaCredito.numNC,
    prefijoNC: data.notaCredito.prefijoNC,
    prefijoFactura: data.factura.prefijoF,
    cufe: data.notaCredito.cufe,
  };
}
