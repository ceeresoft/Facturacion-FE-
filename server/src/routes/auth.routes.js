import { Router } from "express";
import {
  AuthError,
  signToken,
  validateCredentials,
} from "../services/auth.service.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const usuario = String(req.body?.usuario ?? "").trim();
    const password = String(req.body?.password ?? "").trim();

    if (!usuario || !password) {
      throw new AuthError("Usuario y contraseña son obligatorios", 400);
    }

    const user = await validateCredentials(usuario, password);
    const token = signToken(user);

    res.json({ ok: true, token, user });
  } catch (error) {
    if (error.code === "ELOGIN" || error.name === "ConnectionError") {
      return res.status(503).json({
        ok: false,
        message: "No se pudo conectar a la base de datos. Verifique la configuración en .env",
      });
    }
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true, message: "Sesión cerrada" });
});

export default router;
