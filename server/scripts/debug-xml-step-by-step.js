import dotenv from "dotenv";
import { getPool, sql } from "../src/config/db.js";
import { resolveDetailTableForXml } from "../src/services/xml/resolveDetailTableXml.js";

dotenv.config();

const numero = process.argv[2] || "0803";
const empresaId = Number(process.argv[3] || 12);

const pool = await getPool();
const params = [
  { name: "numero", type: sql.NVarChar, value: numero },
  { name: "idEmpresaV", type: sql.Int, value: empresaId },
];

const NUMERO_FACTURA_WHERE = `RTRIM(CONVERT(NVARCHAR(50), NoFactura)) = RTRIM(@numero)`;
const NO_FACTURA_COL_WHERE = `RTRIM(CONVERT(NVARCHAR(50), [No Factura])) = RTRIM(@numero)`;

async function step(name, query, inputs = params) {
  const request = pool.request();
  inputs.forEach(({ name: n, type, value }) => request.input(n, type, value));
  try {
    const result = await request.query(query);
    console.log(`OK  ${name} (${result.recordset.length} rows)`);
    return result.recordset;
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    throw error;
  }
}

console.log(`Factura ${numero} empresa ${empresaId}\n`);

const prepagada = await step(
  "1 prepagada",
  `SELECT TipoFactura FROM [Face Cnsta Salud Prepagada]
   WHERE ${NUMERO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`
);
const tipoFactura = prepagada[0]?.TipoFactura || "SS06";
console.log(`   tipoFactura=${tipoFactura}`);

if (tipoFactura === "SS01") {
  await step(
    "2 recaudo",
    `SELECT * FROM [Face Cnsta Salud Recaudo Prepagada]
     WHERE ${NUMERO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`
  );
}

await step(
  "3 factura",
  `SELECT * FROM [Face Cnsta Factura]
   WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`
);

await step(
  "4 config",
  `SELECT IdResolucionFactura FROM ConfiguracionFace WHERE IdEmpresaV = @idEmpresaV`,
  [{ name: "idEmpresaV", type: sql.Int, value: empresaId }]
);

await step(
  "5 empresa",
  `SELECT * FROM [Face Cnsta FacturaE Empresa]
   WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`
);

await step(
  "6 entidad",
  `SELECT * FROM [Face Cnsta FacturaE Entidad]
   WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`
);

const guiasRows = await step(
  "7 guias",
  `SELECT * FROM [Face Cnsta TipoDeFactura]
   WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`
);
const guiasRow = guiasRows[0] ?? {};
const detailTable = resolveDetailTableForXml(guiasRow);
console.log(`   detailTable=${detailTable} guias=${JSON.stringify(guiasRow)}`);

await step(
  "8 items",
  `SELECT * FROM ${detailTable}
   WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`
);

const esCopago =
  Number(guiasRow.GuiaFactura) === 0 && Number(guiasRow.GuiaFacturaNormal) === 0;
console.log(`   esCopago=${esCopago}`);

const impuestosQuery = esCopago
  ? `SELECT * FROM [Face Total base impuestos porcentaje FacturaNormal] WHERE ${NO_FACTURA_COL_WHERE}`
  : `SELECT * FROM [Face Total base impuestos porcentaje] WHERE ${NO_FACTURA_COL_WHERE}`;

await step("9 impuestos", impuestosQuery, [
  { name: "numero", type: sql.NVarChar, value: numero },
]);

const baseQuery = esCopago
  ? `SELECT * FROM [Face Cnsta Total Base Imponible FacturaNormal] WHERE ${NO_FACTURA_COL_WHERE}`
  : `SELECT * FROM [Face Cnsta Total Base Imponible] WHERE ${NO_FACTURA_COL_WHERE}`;

await step("10 base imponible", baseQuery, [
  { name: "numero", type: sql.NVarChar, value: numero },
]);

await step(
  "11 descuento copago",
  `SELECT * FROM [Face Cnsta Descuento Copago]
   WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`
);

await step(
  "12 observaciones",
  `SELECT ObservacionesFactura FROM [Face Cnsta ObservacionesFacturas]
   WHERE IdEmpresaV = @idEmpresaV AND ${NUMERO_FACTURA_WHERE}`
);

console.log("\nTodas OK");
