import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPublicAppConfig } from "../src/config/appPorts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "../../assets/js/env-config.js");
const config = getPublicAppConfig();

const content = `// Generado automaticamente desde server/.env
// NO editar a mano: corre "npm run config:frontend" (o npm start / postinstall).
//
// Este archivo lo lee el navegador. apiBaseUrl debe ser alcanzable DESDE el PC
// del usuario (no desde el servidor).
//
// - Solo en el servidor:  API_BASE_URL=http://localhost:3005
// - PCs en la misma red: API_BASE_URL=http://NOMBRE-O-IP-DEL-SERVIDOR:3005
//   y CORS_ORIGIN=http://NOMBRE-O-IP-DEL-SERVIDOR:PUERTO_FRONT
//   Ejemplo: API_BASE_URL=http://leia:3005  CORS_ORIGIN=http://leia:81
//
// Tras cambiar server/.env: npm run config:frontend && reiniciar la API.
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content, "utf8");

console.log(`Config frontend escrita en ${outputPath}`);
console.log(`  API:      ${config.apiBaseUrl}`);
console.log(`  Frontend: ${config.frontendUrl}`);
