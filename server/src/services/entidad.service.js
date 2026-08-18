import { getPool, sql } from "../config/db.js";
import { resolveEmailConFallback } from "../utils/format.js";

export class EntidadError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "EntidadError";
    this.statusCode = statusCode;
  }
}

function asText(value) {
  if (value == null) return "";
  return String(value).trim();
}

function buildNombreCompleto(primerNombre, segundoNombre, primerApellido, segundoApellido) {
  return [primerNombre, segundoNombre, primerApellido, segundoApellido]
    .map(asText)
    .filter(Boolean)
    .join(" ");
}

async function obtenerEntidadBasica(pool, documentoEntidad) {
  const result = await pool
    .request()
    .input("documento", sql.NVarChar(50), documentoEntidad)
    .query(`
      SELECT
        en.[Documento Entidad],
        en.[Id Tipo de Documento],
        en.[Primer Nombre Entidad],
        en.[Segundo Nombre Entidad],
        en.[Primer Apellido Entidad],
        en.[Segundo Apellido Entidad],
        en.[Nombre Completo Entidad],
        td.[Descripción Tipo de Documento],
        e.[Dirección EntidadII],
        e.[E-mail Nro 1 EntidadII],
        e.[Teléfono No 1 EntidadII],
        e.[Teléfono Celular EntidadII],
        e.[Id Ciudad],
        c.Ciudad,
        c.[Id Departamento],
        d.Departamento,
        d.[Id País],
        p.[Descripción País],
        p.País
      FROM dbo.Entidad AS en
      LEFT JOIN dbo.[Tipo de Documento] AS td
        ON en.[Id Tipo de Documento] = td.[Id Tipo de Documento]
      LEFT JOIN dbo.EntidadII AS e
        ON en.[Documento Entidad] = e.[Documento Entidad]
      LEFT JOIN dbo.Ciudad AS c
        ON e.[Id Ciudad] = c.[Id Ciudad]
      LEFT JOIN dbo.Departamento AS d
        ON c.[Id Departamento] = d.[Id Departamento]
      LEFT JOIN dbo.País AS p
        ON d.[Id País] = p.[Id País]
      WHERE en.[Documento Entidad] = @documento
    `);

  return result.recordset[0] ?? null;
}

function mapEntidadActualizada(row, emailEmpresaFallback = "") {
  if (!row) return null;

  const primerNombre = asText(row["Primer Nombre Entidad"]);
  const segundoNombre = asText(row["Segundo Nombre Entidad"]);
  const primerApellido = asText(row["Primer Apellido Entidad"]);
  const segundoApellido = asText(row["Segundo Apellido Entidad"]);

  return {
    documentoEntidad: asText(row["Documento Entidad"]),
    idTipoDocumento:
      row["Id Tipo de Documento"] != null
        ? String(row["Id Tipo de Documento"])
        : "",
    tipoDocumento: asText(row["Descripción Tipo de Documento"]),
    identificacion: asText(row["Documento Entidad"]),
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    nombres: [primerNombre, segundoNombre].filter(Boolean).join(" ").trim(),
    apellidos: [primerApellido, segundoApellido].filter(Boolean).join(" ").trim(),
    nombreCompleto: asText(row["Nombre Completo Entidad"]),
    email: resolveEmailConFallback(
      row["E-mail Nro 1 EntidadII"],
      emailEmpresaFallback
    ),
    telefono:
      asText(row["Teléfono No 1 EntidadII"]) ||
      asText(row["Teléfono Celular EntidadII"]),
    direccion: asText(row["Dirección EntidadII"]),
    idPais: row["Id País"] != null ? String(row["Id País"]) : "",
    idDepartamento:
      row["Id Departamento"] != null ? String(row["Id Departamento"]) : "",
    idCiudad: row["Id Ciudad"] != null ? String(row["Id Ciudad"]) : "",
    pais: asText(row["Descripción País"] || row.País),
    departamento: asText(row.Departamento),
    ciudad: asText(row.Ciudad),
  };
}

export async function actualizarEntidadResponsable(documentoEntidad, datos) {
  // Actualiza Entidad/EntidadII del responsable de pago (Documento Responsable), no del paciente.
  const documento = asText(documentoEntidad);
  if (!documento) {
    throw new EntidadError("Documento de entidad requerido");
  }

  const idTipoDocumento = Number.parseInt(datos.idTipoDocumento, 10);
  const primerNombre = asText(datos.primerNombre);
  const segundoNombre = asText(datos.segundoNombre);
  const primerApellido = asText(datos.primerApellido);
  const segundoApellido = asText(datos.segundoApellido);
  const email = asText(datos.email);
  const telefono = asText(datos.telefono);
  const direccion = asText(datos.direccion);
  const idCiudad = Number.parseInt(datos.idCiudad, 10);

  if (Number.isNaN(idTipoDocumento)) {
    throw new EntidadError("Tipo de documento inválido");
  }

  if (Number.isNaN(idCiudad)) {
    throw new EntidadError("Ciudad inválida");
  }

  if (!primerNombre || !primerApellido) {
    throw new EntidadError("Primer nombre y primer apellido son obligatorios");
  }

  const nombreCompleto = buildNombreCompleto(
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido
  );

  const pool = await getPool();

  const existe = await obtenerEntidadBasica(pool, documento);
  if (!existe) {
    throw new EntidadError("Entidad no encontrada", 404);
  }

  const updateEntidad = await pool
    .request()
    .input("documento", sql.NVarChar(50), documento)
    .input("idTipoDocumento", sql.Int, idTipoDocumento)
    .input("primerNombre", sql.NVarChar(100), primerNombre)
    .input("segundoNombre", sql.NVarChar(100), segundoNombre || null)
    .input("primerApellido", sql.NVarChar(100), primerApellido)
    .input("segundoApellido", sql.NVarChar(100), segundoApellido || null)
    .input("nombreCompleto", sql.NVarChar(200), nombreCompleto || null)
    .query(`
      UPDATE dbo.Entidad
      SET
        [Id Tipo de Documento] = @idTipoDocumento,
        [Primer Nombre Entidad] = @primerNombre,
        [Segundo Nombre Entidad] = @segundoNombre,
        [Primer Apellido Entidad] = @primerApellido,
        [Segundo Apellido Entidad] = @segundoApellido,
        [Nombre Completo Entidad] = @nombreCompleto
      WHERE [Documento Entidad] = @documento
    `);

  if (!updateEntidad.rowsAffected[0]) {
    throw new EntidadError("No se pudo actualizar la entidad", 500);
  }

  const updateEntidadII = await pool
    .request()
    .input("documento", sql.NVarChar(50), documento)
    .input("direccion", sql.NVarChar(255), direccion || null)
    .input("email", sql.NVarChar(50), email || null)
    .input("telefono", sql.NVarChar(50), telefono || null)
    .input("idCiudad", sql.Int, idCiudad)
    .query(`
      UPDATE dbo.EntidadII
      SET
        [Dirección EntidadII] = @direccion,
        [E-mail Nro 1 EntidadII] = @email,
        [Teléfono No 1 EntidadII] = @telefono,
        [Id Ciudad] = @idCiudad
      WHERE [Documento Entidad] = @documento
    `);

  if (!updateEntidadII.rowsAffected[0]) {
    throw new EntidadError(
      "No existe registro en EntidadII para esta entidad",
      404
    );
  }

  const actualizada = await obtenerEntidadBasica(pool, documento);
  return mapEntidadActualizada(actualizada);
}
