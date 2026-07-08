import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER || "DRLEON\\SQLEXPRESS",
  database: process.env.DB_NAME || "CeereSio",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

if (process.env.DB_USER) {
  dbConfig.user = process.env.DB_USER;
  dbConfig.password = process.env.DB_PASSWORD;
}

let pool = null;

export async function getPool() {
  if (!pool) {
    pool = await sql.connect(dbConfig);
  }
  return pool;
}

export async function testConnection() {
  const connection = await getPool();
  const result = await connection.request().query("SELECT 1 AS ok");
  return result.recordset[0]?.ok === 1;
}

export { sql };
