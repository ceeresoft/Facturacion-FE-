import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  consultarResoluciones,
  consultarFacturasPorUsuario,
  consultaFacturaCompleta,
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

export { FacturaError };
export default router;
