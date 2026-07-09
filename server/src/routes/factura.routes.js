import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  consultarResoluciones,
  consultarFacturasPorUsuario,
  consultarFacturasAnuladasParaNotaCredito,
  consultarFacturasElectronicasPorUsuario,
  consultaFacturaCompleta,
  obtenerCufeFacturaElectronica,
  obtenerPdfFacturaElectronica,
  FacturaError,
} from "../services/factura.service.js";

const router = Router();

router.get("/empresas", requireAuth, async (_req, res, next) => {
  try {
    const empresas = await consultarResoluciones();
    res.json({ ok: true, empresas });
  } catch (error) {
    next(error);
  }
});

router.get("/empresas/:idEmpresaV/facturas", requireAuth, async (req, res, next) => {
  try {
    const idEmpresaV = Number.parseInt(req.params.idEmpresaV, 10);
    if (Number.isNaN(idEmpresaV)) {
      return res.status(400).json({ ok: false, message: "Id de empresa inválido" });
    }

    const facturas = await consultarFacturasPorUsuario(
      req.user.documento,
      idEmpresaV
    );
    res.json({ ok: true, facturas });
  } catch (error) {
    next(error);
  }
});

router.get("/empresas/:idEmpresaV/facturas/anuladas", requireAuth, async (req, res, next) => {
  try {
    const idEmpresaV = Number.parseInt(req.params.idEmpresaV, 10);
    if (Number.isNaN(idEmpresaV)) {
      return res.status(400).json({ ok: false, message: "Id de empresa inválido" });
    }

    const facturas = await consultarFacturasAnuladasParaNotaCredito(
      req.user.documento,
      idEmpresaV
    );
    res.json({ ok: true, facturas });
  } catch (error) {
    next(error);
  }
});

router.get("/empresas/:idEmpresaV/facturas/electronicas", requireAuth, async (req, res, next) => {
  try {
    const idEmpresaV = Number.parseInt(req.params.idEmpresaV, 10);
    if (Number.isNaN(idEmpresaV)) {
      return res.status(400).json({ ok: false, message: "Id de empresa inválido" });
    }

    const facturas = await consultarFacturasElectronicasPorUsuario(
      req.user.documento,
      idEmpresaV
    );
    res.json({ ok: true, facturas });
  } catch (error) {
    next(error);
  }
});

router.get("/facturas/:numero/pdf", requireAuth, async (req, res, next) => {
  try {
    const { empresaId, disposition } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    const resultado = await obtenerPdfFacturaElectronica(
      req.params.numero,
      idEmpresaV,
      req.user.documento
    );

    const modo =
      String(disposition ?? "").toLowerCase() === "attachment"
        ? "attachment"
        : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${modo}; filename="${resultado.fileName}"`
    );
    res.send(resultado.buffer);
  } catch (error) {
    next(error);
  }
});

router.get("/facturas/:numero/cufe", requireAuth, async (req, res, next) => {
  try {
    const { empresaId } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    const resultado = await obtenerCufeFacturaElectronica(
      req.params.numero,
      idEmpresaV
    );

    res.json({ ok: true, ...resultado });
  } catch (error) {
    next(error);
  }
});

router.get("/facturas/:numero", requireAuth, async (req, res, next) => {
  try {
    const { empresaId } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    const data = await consultaFacturaCompleta(req.params.numero, idEmpresaV);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

router.post("/facturas/:numero/generar-xml", requireAuth, async (req, res, next) => {
  try {
    const { empresaId } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    const { generarXmlFactura } = await import(
      "../services/xml/generarXmlFactura.service.js"
    );
    const resultado = await generarXmlFactura(req.params.numero, idEmpresaV, {
      guardarArchivo: true,
    });

    res.json({
      ok: true,
      message: `XML guardado en ${resultado.relativePath || resultado.fileName}`,
      fileName: resultado.fileName,
      relativePath: resultado.relativePath,
      tipoFactura: resultado.tipoFactura,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/facturas/:numero/enviar", requireAuth, async (req, res, next) => {
  try {
    const { empresaId } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    console.log(
      `[FE] Generar/enviar factura=${req.params.numero} empresa=${idEmpresaV}`
    );

    const { enviarFacturaElectronica } = await import(
      "../services/envioElectronico.service.js"
    );
    const resultado = await enviarFacturaElectronica(req.params.numero, idEmpresaV);

    res.json({
      ok: true,
      message: resultado.message,
      fileName: resultado.fileName,
      relativePath: resultado.relativePath,
      tipoFactura: resultado.tipoFactura,
      modo: resultado.modo,
      enviado: resultado.enviado,
      transaccionID: resultado.envio?.transaccionID ?? null,
      code: resultado.envio?.code ?? null,
    });
  } catch (error) {
    next(error);
  }
});

export { FacturaError };
export default router;
