import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { FacturaError } from "../services/factura.service.js";

const router = Router();

router.post("/notas-credito/:numeroNota/generar-xml", requireAuth, async (req, res, next) => {
  try {
    const { empresaId, numeroFactura } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    if (!numeroFactura) {
      return res.status(400).json({
        ok: false,
        message: "El parámetro numeroFactura es requerido",
      });
    }

    const { generarXmlNotaCredito } = await import(
      "../services/xml/generarXmlNotaCredito.service.js"
    );

    const resultado = await generarXmlNotaCredito(
      String(numeroFactura).trim(),
      String(req.params.numeroNota).trim(),
      idEmpresaV,
      {
        guardarArchivo: true,
        cufe: req.body?.cufe,
      }
    );

    res.json({
      ok: true,
      message: `XML de nota crédito guardado en ${resultado.relativePath || resultado.fileName}`,
      fileName: resultado.fileName,
      relativePath: resultado.relativePath,
      numeroFactura: resultado.numeroFactura,
      numeroNotaCredito: resultado.numeroNotaCredito,
      prefijoNC: resultado.prefijoNC,
      cufe: resultado.cufe,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/notas-credito/:numeroNota/enviar", requireAuth, async (req, res, next) => {
  try {
    const { empresaId, numeroFactura } = req.query;
    const idEmpresaV = Number.parseInt(empresaId, 10);

    if (!empresaId || Number.isNaN(idEmpresaV)) {
      return res
        .status(400)
        .json({ ok: false, message: "El parámetro empresaId es requerido" });
    }

    if (!numeroFactura) {
      return res.status(400).json({
        ok: false,
        message: "El parámetro numeroFactura es requerido",
      });
    }

    console.log(
      `[NC] Generar/enviar: nota=${req.params.numeroNota} factura=${numeroFactura} empresa=${idEmpresaV}`
    );

    const { enviarNotaCreditoElectronica } = await import(
      "../services/envioElectronico.service.js"
    );

    const resultado = await enviarNotaCreditoElectronica(
      String(numeroFactura).trim(),
      String(req.params.numeroNota).trim(),
      idEmpresaV,
      { cufe: req.body?.cufe }
    );

    res.json({
      ok: true,
      message: resultado.message,
      fileName: resultado.fileName,
      relativePath: resultado.relativePath,
      numeroFactura: resultado.numeroFactura,
      numeroNotaCredito: resultado.numeroNotaCredito,
      prefijoNC: resultado.prefijoNC,
      cufe: resultado.cufe,
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
