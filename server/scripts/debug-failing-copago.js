import dotenv from "dotenv";
import { cargarDatosXmlFactura } from "../src/services/xml/facturaXmlData.service.js";
import { getPool, sql } from "../src/config/db.js";
import { resolveDetailTableForXml } from "../src/services/xml/resolveDetailTableXml.js";

dotenv.config();

const numero = process.argv[2];
const empresaId = Number(process.argv[3]);

const pool = await getPool();
const params = [
  { name: "numero", type: sql.NVarChar, value: numero },
  { name: "idEmpresaV", type: sql.Int, value: empresaId },
];
const NRO_FACTURA_WHERE = `RTRIM(CONVERT(NVARCHAR(50), NroFactura)) = RTRIM(@numero)`;
const NO_FACTURA_COL_WHERE = `RTRIM(CONVERT(NVARCHAR(50), [No Factura])) = RTRIM(@numero)`;

async function step(name, query, inputs = params) {
  const request = pool.request();
  inputs.forEach(({ name: n, type, value }) => request.input(n, type, value));
  try {
    await request.query(query);
    console.log(`OK  ${name}`);
    return true;
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    return false;
  }
}

const guiasRows = await pool.request()
  .input("numero", sql.NVarChar, numero)
  .input("idEmpresaV", sql.Int, empresaId)
  .query(`SELECT * FROM [Face Cnsta TipoDeFactura] WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`);

const guiasRow = guiasRows.recordset[0] ?? {};
const esCopago = Number(guiasRow.GuiaFactura) === 0 && Number(guiasRow.GuiaFacturaNormal) === 0;
const detailTable = resolveDetailTableForXml(guiasRow);

console.log(`Factura ${numero} esCopago=${esCopago} table=${detailTable}\n`);

const steps = [
  ["items", `SELECT * FROM ${detailTable} WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`],
  ["impuestos normal", `SELECT * FROM [Face Total base impuestos porcentaje] WHERE ${NO_FACTURA_COL_WHERE}`, [{ name: "numero", type: sql.NVarChar, value: numero }]],
  ["impuestos copago", `SELECT * FROM [Face Total base impuestos porcentaje FacturaNormal] WHERE ${NO_FACTURA_COL_WHERE}`, [{ name: "numero", type: sql.NVarChar, value: numero }]],
  ["base normal", `SELECT * FROM [Face Cnsta Total Base Imponible] WHERE ${NO_FACTURA_COL_WHERE}`, [{ name: "numero", type: sql.NVarChar, value: numero }]],
  ["base copago", `SELECT * FROM [Face Cnsta Total Base Imponible FacturaNormal] WHERE ${NO_FACTURA_COL_WHERE}`, [{ name: "numero", type: sql.NVarChar, value: numero }]],
  ["descuento copago", `SELECT * FROM [Face Cnsta Descuento Copago] WHERE ${NRO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`],
  ["observaciones", `SELECT ObservacionesFactura FROM [Face Cnsta ObservacionesFacturas] WHERE IdEmpresaV = @idEmpresaV AND RTRIM(CONVERT(NVARCHAR(50), NoFactura)) = RTRIM(@numero)`],
];

for (const [name, query, inputs] of steps) {
  await step(name, query, inputs ?? params);
}

try {
  await cargarDatosXmlFactura(numero, empresaId);
  console.log("\nOK cargarDatosXmlFactura completo");
} catch (e) {
  console.error("\nFAIL cargarDatosXmlFactura:", e.message);
}
