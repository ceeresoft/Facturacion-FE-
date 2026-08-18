import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPublicAppConfig } from "../src/config/appPorts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "../../assets/js/env-config.js");
const config = getPublicAppConfig();

const content = `// Generado automaticamente desde server/.env
// En produccion el navegador usa /env-config.js servido por la API (o por Vite en dev).
// Este archivo queda como respaldo. Preferir: npm run build + npm start.
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content, "utf8");

console.log(`Config frontend escrita en ${outputPath}`);
console.log(`  API:      ${config.apiBaseUrl}`);
console.log(`  Frontend: ${config.frontendUrl}`);
