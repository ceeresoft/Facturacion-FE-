import { getPool } from "../config/db.js";

function mapTipoDocumento(row) {
  return {
    id: row["Id Tipo de Documento"],
    codigo: row["Tipo de Documento"] ?? "",
    descripcion: row["Descripción Tipo de Documento"] ?? "",
    codigoDian: row.codigoDian ?? null,
    orden: row["Orden Tipo de Documento"] ?? null,
  };
}

export async function listarTiposDocumento() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      [Id Tipo de Documento],
      [Código Tipo de Documento],
      [Tipo de Documento],
      [Descripción Tipo de Documento],
      [Orden Tipo de Documento],
      [Id Estado],
      codigoDian
    FROM [Face Cnsta TipoDocumento]
    ORDER BY [Orden Tipo de Documento], [Descripción Tipo de Documento]
  `);

  return result.recordset.map(mapTipoDocumento);
}
