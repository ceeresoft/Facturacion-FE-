import { getPool, sql } from "../config/db.js";

export class EmpresaError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "EmpresaError";
    this.statusCode = statusCode;
  }
}

const EMPRESA_VIEW_SELECT = `
  SELECT
    [Id Empresa],
    [Documento Empresa],
    [Id Tipo de Documento],
    [Tipo de Documento],
    [Descripción Tipo de Documento],
    [Nombre Comercial Empresa],
    [Razon Social Empresa],
    [Dirección EmpresaIII],
    [Teléfono No 1 EmpresaIII],
    [Teléfono No 2 EmpresaIII],
    [Teléfono No 3 EmpresaIII],
    [E-mail 1 EmpresaIII],
    [E-mail 2 EmpresaIII]
  FROM [face Cnsta Empresa]
`;

function asText(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeEmpresaCatalogo(row) {
  const razonSocial = asText(row["Razon Social Empresa"]);
  const nombreComercial = asText(row["Nombre Comercial Empresa"]);

  return {
    id: String(row["Id Empresa"] ?? ""),
    nombre: razonSocial || nombreComercial,
    nombreComercial,
    razonSocial,
    documento: asText(row["Documento Empresa"]),
    tipoDocumento:
      asText(row["Descripción Tipo de Documento"]) ||
      asText(row["Tipo de Documento"]),
    idTipoDocumento: row["Id Tipo de Documento"],
    direccion: asText(row["Dirección EmpresaIII"]),
    telefono: asText(row["Teléfono No 1 EmpresaIII"]),
    telefono2: asText(row["Teléfono No 2 EmpresaIII"]),
    telefono3: asText(row["Teléfono No 3 EmpresaIII"]),
    email: asText(row["E-mail 1 EmpresaIII"]),
    email2: asText(row["E-mail 2 EmpresaIII"]),
  };
}

async function obtenerEmpresaDesdeVista(pool, idEmpresa) {
  const result = await pool
    .request()
    .input("idEmpresa", sql.Int, idEmpresa)
    .query(`${EMPRESA_VIEW_SELECT} WHERE [Id Empresa] = @idEmpresa`);

  const row = result.recordset[0];
  return row ? normalizeEmpresaCatalogo(row) : null;
}

export async function listarEmpresasCatalogo() {
  const pool = await getPool();
  const result = await pool.request().query(`
    ${EMPRESA_VIEW_SELECT}
    ORDER BY [Razon Social Empresa], [Nombre Comercial Empresa]
  `);

  return result.recordset.map(normalizeEmpresaCatalogo);
}

export async function actualizarEmpresaContacto(idEmpresa, datos) {
  const id = Number.parseInt(idEmpresa, 10);
  if (Number.isNaN(id)) {
    throw new EmpresaError("Id de empresa inválido");
  }

  const direccion = asText(datos.direccion);
  const telefono = asText(datos.telefono);
  const telefono2 = asText(datos.telefono2);
  const email = asText(datos.email);
  const email2 = asText(datos.email2);

  if (!direccion || !telefono) {
    throw new EmpresaError("Dirección y teléfono principal son obligatorios");
  }

  const pool = await getPool();

  const empresaResult = await pool
    .request()
    .input("idEmpresa", sql.Int, id)
    .query(`
      SELECT [Documento Empresa]
      FROM dbo.Empresa
      WHERE [Id Empresa] = @idEmpresa
    `);

  const documento = empresaResult.recordset[0]?.["Documento Empresa"];
  if (!documento) {
    throw new EmpresaError("Empresa no encontrada", 404);
  }

  const updateResult = await pool
    .request()
    .input("documento", sql.NVarChar(50), documento)
    .input("direccion", sql.NVarChar(255), direccion)
    .input("telefono1", sql.NVarChar(50), telefono)
    .input("telefono2", sql.NVarChar(50), telefono2 || null)
    .input("email1", sql.NVarChar(50), email || null)
    .input("email2", sql.NVarChar(50), email2 || null)
    .query(`
      UPDATE dbo.EmpresaIII
      SET
        [Dirección EmpresaIII] = @direccion,
        [Teléfono No 1 EmpresaIII] = @telefono1,
        [Teléfono No 2 EmpresaIII] = @telefono2,
        [E-mail 1 EmpresaIII] = @email1,
        [E-mail 2 EmpresaIII] = @email2
      WHERE [Documento Empresa] = @documento
    `);

  if (!updateResult.rowsAffected[0]) {
    throw new EmpresaError(
      "No existe registro en EmpresaIII para esta empresa",
      404
    );
  }

  const empresa = await obtenerEmpresaDesdeVista(pool, id);
  if (!empresa) {
    throw new EmpresaError("No se pudo consultar la empresa actualizada", 500);
  }

  return empresa;
}
