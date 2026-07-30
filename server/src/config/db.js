import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const requestTimeout = Number.parseInt(process.env.DB_REQUEST_TIMEOUT_MS || "60000", 10);
const connectionTimeout = Number.parseInt(
  process.env.DB_CONNECTION_TIMEOUT_MS || "30000",
  10
);

const dbConfig = {
  server: process.env.DB_SERVER || "DRLEON\\SQLEXPRESS",
  database: process.env.DB_NAME || "CeereSio",
  requestTimeout: Number.isFinite(requestTimeout) && requestTimeout > 0 ? requestTimeout : 60000,
  connectionTimeout:
    Number.isFinite(connectionTimeout) && connectionTimeout > 0
      ? connectionTimeout
      : 30000,
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
