import { getPool, sql } from "../config/db.js";

function mapPais(row) {
  return {
    id: row["Id País"],
    codigo: row["Código País"] ?? "",
    nombre: row["Descripción País"] || row.País || "",
    orden: row["Orden País"] ?? null,
  };
}

function mapDepartamento(row) {
  return {
    id: row["Id Departamento"],
    codigo: row["Código Departamento"] ?? "",
    nombre: row.Departamento ?? "",
    idPais: row["Id País"],
  };
}

function mapCiudad(row) {
  return {
    id: row["Id Ciudad"],
    codigo: row["Código Ciudad"] ?? "",
    nombre: row.Ciudad ?? "",
    idDepartamento: row["Id Departamento"],
  };
}

export async function listarPaises() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      [Id País],
      [Código País],
      País,
      [Descripción País],
      [Orden País],
      [Id Estado]
    FROM [Face cnsta Pais]
    ORDER BY [Orden País], [Descripción País]
  `);

  return result.recordset.map(mapPais);
}

export async function listarDepartamentosPorPais(idPais) {
  const paisId = Number.parseInt(idPais, 10);
  if (Number.isNaN(paisId)) {
    return [];
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("idPais", sql.Int, paisId)
    .query(`
      SELECT
        [Id Departamento],
        [Código Departamento],
        Departamento,
        [Id País]
      FROM [Face cnsta Departamento]
      WHERE [Id País] = @idPais
      ORDER BY Departamento
    `);

  return result.recordset.map(mapDepartamento);
}

export async function listarCiudadesPorDepartamento(idDepartamento) {
  const departamentoId = Number.parseInt(idDepartamento, 10);
  if (Number.isNaN(departamentoId)) {
    return [];
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("idDepartamento", sql.Int, departamentoId)
    .query(`
      SELECT
        [Id Ciudad],
        Ciudad,
        [Código Ciudad],
        [Id Departamento]
      FROM [Face cnsta Ciudad]
      WHERE [Id Departamento] = @idDepartamento
      ORDER BY Ciudad
    `);

  return result.recordset.map(mapCiudad);
}

function mapUbicacion(row) {
  if (!row) return null;

  return {
    idCiudad: row.idCiudad != null ? String(row.idCiudad) : "",
    idDepartamento: row.idDepartamento != null ? String(row.idDepartamento) : "",
    idPais: row.idPais != null ? String(row.idPais) : "",
    ciudad: row.ciudad ?? "",
    departamento: row.departamento ?? "",
    pais: row.pais ?? "",
  };
}

export async function resolverUbicacionPorCiudad(idCiudad) {
  const ciudadId = Number.parseInt(idCiudad, 10);
  if (Number.isNaN(ciudadId)) {
    return null;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("idCiudad", sql.Int, ciudadId)
    .query(`
      SELECT
        c.[Id Ciudad] AS idCiudad,
        c.Ciudad AS ciudad,
        d.[Id Departamento] AS idDepartamento,
        d.Departamento AS departamento,
        p.[Id País] AS idPais,
        COALESCE(p.[Descripción País], p.País) AS pais
      FROM dbo.Ciudad AS c
      INNER JOIN dbo.Departamento AS d
        ON c.[Id Departamento] = d.[Id Departamento]
      INNER JOIN dbo.País AS p
        ON d.[Id País] = p.[Id País]
      WHERE c.[Id Ciudad] = @idCiudad
    `);

  return mapUbicacion(result.recordset[0]);
}

export async function obtenerUbicacionPorDocumento(documentoEntidad) {
  const documento = String(documentoEntidad ?? "").trim();
  if (!documento) {
    return null;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("documento", sql.NVarChar(50), documento)
    .query(`
      SELECT
        e.[Id Ciudad] AS idCiudad,
        c.Ciudad AS ciudad,
        d.[Id Departamento] AS idDepartamento,
        d.Departamento AS departamento,
        p.[Id País] AS idPais,
        COALESCE(p.[Descripción País], p.País) AS pais
      FROM dbo.EntidadII AS e
      LEFT JOIN dbo.Ciudad AS c
        ON e.[Id Ciudad] = c.[Id Ciudad]
      LEFT JOIN dbo.Departamento AS d
        ON c.[Id Departamento] = d.[Id Departamento]
      LEFT JOIN dbo.País AS p
        ON d.[Id País] = p.[Id País]
      WHERE e.[Documento Entidad] = @documento
    `);

  return mapUbicacion(result.recordset[0]);
}
