import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import facturaRoutes, { FacturaError } from "./routes/factura.routes.js";
import notaCreditoRoutes from "./routes/notaCredito.routes.js";
import empresaRoutes, { EmpresaError } from "./routes/empresa.routes.js";
import configRoutes from "./routes/config.routes.js";
import { handleAuthError } from "./middleware/auth.middleware.js";
import { AuthError } from "./services/auth.service.js";
import { FacturatechError } from "./services/envioElectronico.service.js";
import { getApiPort, getFrontendUrl, getApiBaseUrl } from "./config/appPorts.js";
import { getModoFactura } from "./config/feModo.js";
import { setWorkerRuntimeEnabled } from "./config/workerRuntime.js";
import { controlNssmWorkerService } from "./services/workerControl.service.js";

dotenv.config();

async function syncWorkerOnApiBoot() {
  if (getModoFactura() !== "solo_xml") {
    return;
  }

  setWorkerRuntimeEnabled(false, "system");
  const stop = await controlNssmWorkerService("stop");
  if (stop.ok) {
    console.log("Worker NSSM detenido al iniciar API (FE_FACTURA_MODO=solo_xml)");
  }
}

syncWorkerOnApiBoot().catch((error) => {
  console.warn("No se pudo sincronizar estado del worker al iniciar:", error.message);
});

const app = express();
const PORT = getApiPort();
const corsOrigin = getFrontendUrl();

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === corsOrigin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", empresaRoutes);
app.use("/api/config", configRoutes);
app.use("/api", facturaRoutes);
app.use("/api", notaCreditoRoutes);

app.use(handleAuthError);

app.use((err, _req, res, _next) => {
  if (
    err instanceof AuthError ||
    err instanceof FacturaError ||
    err instanceof EmpresaError ||
    err instanceof FacturatechError
  ) {
    return res.status(err.statusCode || 400).json({ ok: false, message: err.message });
  }

  if (err?.statusCode) {
    return res.status(err.statusCode).json({ ok: false, message: err.message });
  }

  console.error(err);
  res.status(500).json({ ok: false, message: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`API escuchando en ${getApiBaseUrl()}`);
  console.log(`CORS frontend permitido: ${corsOrigin}`);
});
