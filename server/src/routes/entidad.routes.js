import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  actualizarEntidadResponsable,
  EntidadError,
} from "../services/entidad.service.js";

const router = Router();

router.put("/entidades/:documento", requireAuth, async (req, res, next) => {
  try {
    const entidad = await actualizarEntidadResponsable(
      req.params.documento,
      req.body
    );
    res.json({ ok: true, entidad });
  } catch (error) {
    next(error);
  }
});

export { EntidadError };
export default router;
