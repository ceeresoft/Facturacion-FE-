import dotenv from "dotenv";
import { getPool } from "../src/config/db.js";

dotenv.config();
const pool = await getPool();

const tests = [
  `SELECT TOP 3 NroFactura FROM [Face Cnsta Descuento Copago] WHERE IdEmpresaV = 12`,
  `SELECT TOP 1 NroFactura FROM [Face Cnsta Descuento Copago] WHERE RTRIM(CONVERT(NVARCHAR(50), NroFactura)) = '0803' AND IdEmpresaV = 12`,
  `SELECT TOP 1 NroFactura FROM [Face Cnsta Descuento Copago] WHERE RTRIM(NroFactura) = '0803' AND IdEmpresaV = 12`,
  `SELECT TOP 1 NroFactura FROM [Face Cnsta Descuento Copago] WHERE RTRIM(CONVERT(NVARCHAR(50), NroFactura)) = '0770' AND IdEmpresaV = 12`,
];

for (const q of tests) {
  try {
    const r = await pool.request().query(q);
    console.log("OK:", q.slice(0, 90), "->", r.recordset);
  } catch (e) {
    console.log("FAIL:", q.slice(0, 90), "->", e.message);
  }
}
