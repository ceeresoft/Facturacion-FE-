import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getModoFactura, getModoNotaCredito } from "../config/feModo.js";
import { getPublicAppConfig } from "../config/appPorts.js";

const router = Router();

router.get("/public", (_req, res) => {
  res.json({
    ok: true,
    ...getPublicAppConfig(),
  });
});

router.get("/fe-modo", requireAuth, (_req, res) => {
  res.json({
    ok: true,
    facturaModo: getModoFactura(),
    notaCreditoModo: getModoNotaCredito(),
  });
});

export default router;
