import { runAutoEnvioWorker } from "./autoEnvio.worker.js";

runAutoEnvioWorker().catch((error) => {
  console.error("[worker] Error fatal:", error);
  process.exit(1);
});
