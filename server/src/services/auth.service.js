import jwt from "jsonwebtoken";
import { getPool, sql } from "../config/db.js";

export class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export async function validateCredentials(usuario, password) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("usuario", sql.NVarChar, usuario)
    .input("password", sql.NVarChar, password)
    .query(`
      SELECT
        NombreUsuario,
        passwordUsuario,
        NomUsuario,
        DocumentoUsuario
      FROM [Face Cnsta Login]
      WHERE NombreUsuario = @usuario
        AND passwordUsuario = @password
    `);

  const row = result.recordset[0];
  if (!row) {
    throw new AuthError("Credenciales inválidas");
  }

  return {
    nombreUsuario: row.NombreUsuario,
    nombre: row.NomUsuario,
    documento: row.DocumentoUsuario,
  };
}

export function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return jwt.sign(
    {
      sub: user.documento,
      nombreUsuario: user.nombreUsuario,
      nombre: user.nombre,
      documento: user.documento,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no está configurado");
  }

  return jwt.verify(token, secret);
}
