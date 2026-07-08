import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, message: "API de facturación funcionando" });
});

router.get("/db", async (_req, res) => {
  try {
    const { testConnection } = await import("../config/db.js");
    const connected = await testConnection();
    res.json({ ok: connected, message: connected ? "Conexión a SQL Server OK" : "Sin conexión" });
  } catch (error) {
    res.status(503).json({
      ok: false,
      message: "No se pudo conectar a SQL Server",
      error: error.message,
    });
  }
});

export default router;
