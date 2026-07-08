import dotenv from "dotenv";
import { getPool, sql } from "../src/config/db.js";

dotenv.config();

const NUMERO_FACTURA_WHERE = `RTRIM(CONVERT(NVARCHAR(50), NoFactura)) = RTRIM(@numero)`;
const NO_FACTURA_COL_WHERE = `RTRIM(CONVERT(NVARCHAR(50), [No Factura])) = RTRIM(@numero)`;

async function tryStep(name, fn) {
  try {
    await fn();
    console.log(`OK  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    throw error;
  }
}

const pool = await getPool();
const sample = await pool.request().query(`
  SELECT TOP 1 RTRIM(NroFactura) AS numero, IdEmpresaV AS empresaId
  FROM [Face Cnsta Factura]
  ORDER BY FechaFactura DESC
`);

const row = sample.recordset[0];
if (!row) {
  console.error("No hay facturas en la BD");
  process.exit(1);
}

const numero = String(row.numero).trim();
const empresaId = Number(row.empresaId);
console.log(`Probando factura=${numero} empresaId=${empresaId}\n`);

const params = [
  { name: "numero", type: sql.NVarChar, value: numero },
  { name: "idEmpresaV", type: sql.Int, value: empresaId },
];

async function q(query, inputs = params) {
  const request = pool.request();
  inputs.forEach(({ name, type, value }) => request.input(name, type, value));
  await request.query(query);
}

await tryStep("prepagada", () =>
  q(`SELECT TipoFactura FROM [Face Cnsta Salud Prepagada]
     WHERE ${NUMERO_FACTURA_WHERE} AND IdEmpresaV = @idEmpresaV`)
);

await tryStep("factura", () =>
  q(`SELECT TOP 1 NroFactura FROM [Face Cnsta Factura]
     WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`)
);

await tryStep("empresa", () =>
  q(`SELECT TOP 1 NroFactura FROM [Face Cnsta FacturaE Empresa]
     WHERE RTRIM(NroFactura) = RTRIM(@numero) AND IdEmpresaV = @idEmpresaV`)
);

await tryStep("impuestos", () =>
  q(
    `SELECT TOP 1 * FROM [Face Total base impuestos porcentaje]
     WHERE ${NO_FACTURA_COL_WHERE}`,
    [{ name: "numero", type: sql.NVarChar, value: numero }]
  )
);

await tryStep("base imponible", () =>
  q(
    `SELECT TOP 1 * FROM [Face Cnsta Total Base Imponible]
     WHERE ${NO_FACTURA_COL_WHERE}`,
    [{ name: "numero", type: sql.NVarChar, value: numero }]
  )
);

await tryStep("observaciones", () =>
  q(`SELECT TOP 1 ObservacionesFactura FROM [Face Cnsta ObservacionesFacturas]
     WHERE IdEmpresaV = @idEmpresaV AND ${NUMERO_FACTURA_WHERE}`)
);

console.log("\nTodas las consultas pasaron.");
process.exit(0);
