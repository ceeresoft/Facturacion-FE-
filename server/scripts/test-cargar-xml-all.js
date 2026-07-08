import dotenv from "dotenv";
import { cargarDatosXmlFactura } from "../src/services/xml/facturaXmlData.service.js";

dotenv.config();

const facturas = process.argv.slice(2);
if (facturas.length === 0) {
  const { getPool } = await import("../src/config/db.js");
  const pool = await getPool();
  const sample = await pool.request().query(`
    SELECT TOP 50 RTRIM(NroFactura) AS numero, IdEmpresaV AS empresaId
    FROM [Face Cnsta Factura]
    ORDER BY FechaFactura DESC
  `);
  for (const row of sample.recordset) {
    const numero = String(row.numero).trim();
    const empresaId = row.empresaId;
    try {
      await cargarDatosXmlFactura(numero, empresaId);
      console.log(`OK  ${numero} (empresa ${empresaId})`);
    } catch (error) {
      console.error(`FAIL ${numero} (empresa ${empresaId}):`, error.message);
    }
  }
  process.exit(0);
}

for (const arg of facturas) {
  const [numero, empresaId] = arg.split(",");
  try {
    await cargarDatosXmlFactura(numero, empresaId);
    console.log(`OK  ${numero} (empresa ${empresaId})`);
  } catch (error) {
    console.error(`FAIL ${numero} (empresa ${empresaId}):`, error.message);
    console.error(error);
    process.exit(1);
  }
}
