import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getModoFactura, getModoNotaCredito } from "../config/feModo.js";
import { getPublicAppConfig } from "../config/appPorts.js";
import {
  getWorkerUiStatus,
  setWorkerUiEnabled,
} from "../services/workerControl.service.js";
import { listarTiposDocumento } from "../services/tipoDocumento.service.js";
import {
  listarPaises,
  listarDepartamentosPorPais,
  listarCiudadesPorDepartamento,
  resolverUbicacionPorCiudad,
} from "../services/ubicacion.service.js";

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

router.get("/tipos-documento", requireAuth, async (_req, res, next) => {
  try {
    const tipos = await listarTiposDocumento();
    res.json({ ok: true, tipos });
  } catch (error) {
    next(error);
  }
});

router.get("/paises", requireAuth, async (_req, res, next) => {
  try {
    const paises = await listarPaises();
    res.json({ ok: true, paises });
  } catch (error) {
    next(error);
  }
});

router.get("/departamentos", requireAuth, async (req, res, next) => {
  try {
    const { paisId } = req.query;
    const departamentos = await listarDepartamentosPorPais(paisId);
    res.json({ ok: true, departamentos });
  } catch (error) {
    next(error);
  }
});

router.get("/ciudades", requireAuth, async (req, res, next) => {
  try {
    const { departamentoId } = req.query;
    const ciudades = await listarCiudadesPorDepartamento(departamentoId);
    res.json({ ok: true, ciudades });
  } catch (error) {
    next(error);
  }
});

router.get("/ubicacion", requireAuth, async (req, res, next) => {
  try {
    const ubicacion = await resolverUbicacionPorCiudad(req.query.ciudadId);
    res.json({ ok: true, ubicacion });
  } catch (error) {
    next(error);
  }
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
