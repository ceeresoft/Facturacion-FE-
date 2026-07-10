import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getModoFactura, getModoNotaCredito } from "../config/feModo.js";
import { getPublicAppConfig } from "../config/appPorts.js";
import {
  getWorkerUiStatus,
  setWorkerUiEnabled,
} from "../services/workerControl.service.js";

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

router.get("/worker", requireAuth, async (_req, res, next) => {
  try {
    const status = await getWorkerUiStatus();
    res.json({ ok: true, ...status });
  } catch (error) {
    next(error);
  }
});

router.put("/worker", requireAuth, async (req, res, next) => {
  try {
    const enabled = Boolean(req.body?.enabled);
    const user = req.user?.nombreUsuario || req.user?.usuario || "api";
    const result = await setWorkerUiEnabled(enabled, user);
    res.json({
      ok: true,
      message: enabled
        ? "Worker activado"
        : "Worker desactivado",
      ...result.status,
      nssm: result.nssm,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
