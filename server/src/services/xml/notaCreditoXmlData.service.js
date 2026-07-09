import { getPool, sql } from "../../config/db.js";
import { FacturaError } from "../factura.service.js";
import { cargarDatosXmlFactura } from "./facturaXmlData.service.js";
import { obtenerCufeFactura } from "../facturatech.service.js";
import { formatDateYmd, txt } from "./xmlHelpers.js";
import { ejecutarPaso, mensajePaso } from "../../utils/feStepError.js";

async function validarEmpresaFactura(pool, numeroFactura, empresaId) {
  const result = await pool
    .request()
    .input("numero", sql.NVarChar, numeroFactura)
    .query(`
      SELECT TOP 1
        cf.IdEmpresaV,
        ev.prefijoSIO,
        ev.resolucionSIO
      FROM [Face Cnsta Factura] AS cf
      LEFT JOIN face_ConsultaEmpresaV AS ev
        ON ev.IDempresaV = cf.IdEmpresaV
      WHERE RTRIM(cf.NroFactura) = RTRIM(@numero)
      ORDER BY cf.IdEmpresaV
    `);

  const row = result.recordset[0];
  if (!row?.IdEmpresaV) {
    throw new FacturaError(
      mensajePaso(
        "Paso 1.1: Cargar datos de la factura en BD",
        `No existe la factura ${numeroFactura} en Face`
      ),
      404
    );
  }

  const empresaReal = Number(row.IdEmpresaV);
  if (empresaReal !== empresaId) {
    const etiquetaReal = [row.prefijoSIO, row.resolucionSIO]
      .filter(Boolean)
      .join("")
      .trim();
    const detalle = etiquetaReal
      ? `La factura ${numeroFactura} pertenece a la resolución ${etiquetaReal} (IdEmpresaV=${empresaReal}), no a la seleccionada (IdEmpresaV=${empresaId}). Cambie el combo y vuelva a buscar.`
      : `La factura ${numeroFactura} pertenece a IdEmpresaV=${empresaReal}, no a la seleccionada (${empresaId}). Cambie la resolución y vuelva a buscar.`;

    throw new FacturaError(
      mensajePaso("Paso 1.1: Cargar datos de la factura en BD", detalle),
      400
    );
  }

  return empresaReal;
}

export async function cargarDatosXmlNotaCredito(
  numeroFactura,
  numeroNotaCredito,
  idEmpresaV,
  { cufe: cufeManual } = {}
) {
  const numeroFacturaLimpio = String(numeroFactura ?? "").trim();
  const numeroNotaLimpio = String(numeroNotaCredito ?? "").trim();
  const empresaId = Number.parseInt(idEmpresaV, 10);

  if (!numeroFacturaLimpio || !numeroNotaLimpio || Number.isNaN(empresaId)) {
    throw new FacturaError(
      "Número de factura, número de nota crédito e IdEmpresaV son requeridos"
    );
  }

  const pool = await getPool();

  const datosFactura = await ejecutarPaso(
    "Paso 1.1: Cargar datos de la factura en BD",
    async () => {
      await validarEmpresaFactura(pool, numeroFacturaLimpio, empresaId);
      return cargarDatosXmlFactura(numeroFacturaLimpio, empresaId);
    }
  );
  const facturaNcRow = await ejecutarPaso(
    "Paso 1.2: Consultar resolución de nota crédito",
    async () =>
      pool
        .request()
        .input("numero", sql.NVarChar, numeroFacturaLimpio)
        .input("idEmpresaV", sql.Int, empresaId)
        .query(`
      SELECT
        PrefijoNC,
        ResolucionNC,
        FechaResolucionNC,
        InicioResoNC,
        FinResoNc,
        FechafinalReso
      FROM [Face Cnsta Factura]
      WHERE RTRIM(NroFactura) = RTRIM(@numero)
        AND IdEmpresaV = @idEmpresaV
    `)
  );

  const ncMeta = facturaNcRow.recordset[0];
  if (!ncMeta?.PrefijoNC || !ncMeta?.ResolucionNC) {
    throw new FacturaError(
      mensajePaso(
        "Paso 1.2: Consultar resolución de nota crédito",
        "La factura no tiene PrefijoNC / ResolucionNC configurados"
      ),
      400
    );
  }

  const configRow = await ejecutarPaso(
    "Paso 1.3: Consultar configuración Face",
    async () =>
      pool
        .request()
        .input("idEmpresaV", sql.Int, empresaId)
        .query(`
      SELECT IdresolucionNotaCredito, VersionGraficaFacturaNC
      FROM ConfiguracionFace
      WHERE IdEmpresaV = @idEmpresaV
    `)
  );

  let cufe = txt(cufeManual);
  if (!cufe) {
    cufe = await ejecutarPaso(
      "Paso 1.4: Consultar CUFE en Facturatech (getCUFEFile)",
      () =>
        obtenerCufeFactura(
          datosFactura.factura.prefijoF,
          datosFactura.factura.numF
        )
    );
  }

  return {
    ...datosFactura,
    notaCredito: {
      numNC: numeroNotaLimpio,
      prefijoNC: txt(ncMeta.PrefijoNC),
      resolucionNC: txt(ncMeta.ResolucionNC),
      fechaResolNC: formatDateYmd(ncMeta.FechaResolucionNC),
      inicioResNC: txt(ncMeta.InicioResoNC),
      finResNC: txt(ncMeta.FinResoNc),
      fechaFinResoNC: formatDateYmd(ncMeta.FechafinalReso),
      cufe,
      concepto: "Anulación de factura electrónica",
      codigoConcepto: "2",
    },
    configNC: {
      idResolucionNotaCredito: configRow.recordset[0]?.IdresolucionNotaCredito ?? "",
      plantillaVersionGraficaNC:
        configRow.recordset[0]?.VersionGraficaFacturaNC ?? "",
    },
  };
}
