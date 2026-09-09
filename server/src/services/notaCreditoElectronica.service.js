import { getPool, sql } from "../config/db.js";
import { FacturaError } from "./factura.service.js";

function texto(value) {
  return String(value ?? "").trim();
}

export async function registrarNotaCreditoGenerada(generado, idEmpresaV) {
  const idFactura = Number.parseInt(generado?.idFactura, 10);
  const empresaId = Number.parseInt(idEmpresaV, 10);
  const numeroFactura = texto(generado?.numeroFactura);
  const numeroNota = texto(generado?.numeroNotaCredito);
  const prefijoNota = texto(generado?.prefijoNC);

  if (
    !Number.isInteger(idFactura) ||
    !Number.isInteger(empresaId) ||
    !numeroFactura ||
    !numeroNota ||
    !prefijoNota
  ) {
    throw new FacturaError(
      "No se pudo crear la trazabilidad: faltan datos de la factura o nota crédito",
      500
    );
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("idFactura", sql.Int, idFactura)
    .input("idEmpresaV", sql.Int, empresaId)
    .input("numeroFactura", sql.NVarChar(50), numeroFactura)
    .input("prefijoFactura", sql.NVarChar(20), texto(generado?.prefijoFactura))
    .input("numeroNota", sql.NVarChar(50), numeroNota)
    .input("prefijoNota", sql.NVarChar(20), prefijoNota)
    .input("cufe", sql.NVarChar(200), texto(generado?.cufe))
    .input("archivoXml", sql.NVarChar(260), texto(generado?.relativePath))
    .query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;

      DECLARE @id BIGINT;
      DECLARE @estado NVARCHAR(40);

      SELECT
        @id = IdNotaCreditoElectronica,
        @estado = Estado
      FROM dbo.NotaCreditoElectronica WITH (UPDLOCK, HOLDLOCK)
      WHERE IdEmpresaV = @idEmpresaV
        AND PrefijoNotaCredito = @prefijoNota
        AND NumeroNotaCredito = @numeroNota;

      IF @estado IN (N'ENVIANDO', N'ENVIADA', N'ENVIADA_SIN_CONFIRMACION_BD')
      BEGIN
        ROLLBACK TRANSACTION;
        SELECT @id AS id, @estado AS estado, CAST(1 AS BIT) AS yaEnviada;
        RETURN;
      END;

      IF @id IS NULL
      BEGIN
        INSERT INTO dbo.NotaCreditoElectronica (
          [Id Factura],
          IdEmpresaV,
          NumeroFactura,
          PrefijoFactura,
          NumeroNotaCredito,
          PrefijoNotaCredito,
          CufeFacturaReferenciada,
          ArchivoXml,
          Estado
        )
        VALUES (
          @idFactura,
          @idEmpresaV,
          @numeroFactura,
          NULLIF(@prefijoFactura, N''),
          @numeroNota,
          @prefijoNota,
          NULLIF(@cufe, N''),
          NULLIF(@archivoXml, N''),
          N'GENERADA'
        );

        SET @id = SCOPE_IDENTITY();
      END
      ELSE
      BEGIN
        UPDATE dbo.NotaCreditoElectronica
        SET
          [Id Factura] = @idFactura,
          NumeroFactura = @numeroFactura,
          PrefijoFactura = NULLIF(@prefijoFactura, N''),
          CufeFacturaReferenciada = NULLIF(@cufe, N''),
          ArchivoXml = NULLIF(@archivoXml, N''),
          Estado = N'GENERADA',
          MensajeFacturatech = NULL,
          FechaActualizacion = SYSDATETIME()
        WHERE IdNotaCreditoElectronica = @id;
      END;

      COMMIT TRANSACTION;
      SELECT @id AS id, N'GENERADA' AS estado, CAST(0 AS BIT) AS yaEnviada;
    `);

  const row = result.recordset[0];
  if (row?.yaEnviada) {
    throw new FacturaError(
      `La nota crédito ${prefijoNota}${numeroNota} ya fue enviada o tiene un envío en curso; no se reenviará automáticamente`,
      409
    );
  }

  return Number(row?.id);
}

export async function marcarNotaCreditoElectronicaEnviando(idTrazabilidad) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.BigInt, idTrazabilidad)
    .query(`
      UPDATE dbo.NotaCreditoElectronica
      SET
        Estado = N'ENVIANDO',
        FechaActualizacion = SYSDATETIME()
      WHERE IdNotaCreditoElectronica = @id
        AND Estado = N'GENERADA'
    `);

  if (!result.rowsAffected[0]) {
    throw new FacturaError(
      "La nota crédito no está disponible para iniciar un nuevo envío",
      409
    );
  }
}

export async function marcarNotaCreditoElectronicaEnviada(
  idTrazabilidad,
  envio
) {
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.BigInt, idTrazabilidad)
    .input("codigo", sql.Int, envio?.code ?? null)
    .input("transaccionID", sql.NVarChar(200), texto(envio?.transaccionID))
    .input("mensaje", sql.NVarChar(sql.MAX), texto(envio?.error))
    .query(`
      UPDATE dbo.NotaCreditoElectronica
      SET
        Estado = N'ENVIADA',
        CodigoFacturatech = @codigo,
        TransaccionID = NULLIF(@transaccionID, N''),
        MensajeFacturatech = NULLIF(@mensaje, N''),
        FechaEnvio = SYSDATETIME(),
        FechaActualizacion = SYSDATETIME()
      WHERE IdNotaCreditoElectronica = @id
    `);
}

export async function marcarErrorNotaCreditoElectronica(
  idTrazabilidad,
  error
) {
  if (!idTrazabilidad) return;

  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.BigInt, idTrazabilidad)
    .input("codigo", sql.Int, error?.code ?? null)
    .input("transaccionID", sql.NVarChar(200), texto(error?.transaccionID))
    .input(
      "mensaje",
      sql.NVarChar(sql.MAX),
      texto(error?.message || error).slice(0, 4000)
    )
    .query(`
      UPDATE dbo.NotaCreditoElectronica
      SET
        Estado = N'ERROR_ENVIO',
        CodigoFacturatech = COALESCE(@codigo, CodigoFacturatech),
        TransaccionID = COALESCE(NULLIF(@transaccionID, N''), TransaccionID),
        MensajeFacturatech = @mensaje,
        FechaActualizacion = SYSDATETIME()
      WHERE IdNotaCreditoElectronica = @id
        AND Estado <> N'ENVIADA'
    `);
}
