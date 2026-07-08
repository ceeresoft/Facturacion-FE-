import { AuthError, verifyToken } from "../services/auth.service.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "Token no proporcionado" });
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.user = {
      nombreUsuario: payload.nombreUsuario,
      nombre: payload.nombre,
      documento: payload.documento,
    };
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "Token inválido o expirado" });
  }
}

export function handleAuthError(err, _req, res, next) {
  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({ ok: false, message: err.message });
  }
  next(err);
}
