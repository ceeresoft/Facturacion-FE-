import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listarEmpresasCatalogo,
  actualizarEmpresaContacto,
  EmpresaError,
} from "../services/empresa.services.js";

const router = Router();

router.get("/empresas/catalogo", requireAuth, async (_req, res, next) => {
  try {
    const empresas = await listarEmpresasCatalogo();
    res.json({ ok: true, empresas });
  } catch (error) {
    next(error);
  }
});

router.put("/empresas/catalogo/:idEmpresa", requireAuth, async (req, res, next) => {
  try {
    const empresa = await actualizarEmpresaContacto(req.params.idEmpresa, req.body);
    res.json({ ok: true, empresa });
  } catch (error) {
    next(error);
  }
});

export { EmpresaError };
export default router;
