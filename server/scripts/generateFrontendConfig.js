import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPublicAppConfig } from "../src/config/appPorts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "../../assets/js/env-config.js");
const config = getPublicAppConfig();

const content = `// Generado desde server/.env — ejecutar: npm run config:frontend
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content, "utf8");

console.log(`Config frontend escrita en ${outputPath}`);
console.log(`  API:      ${config.apiBaseUrl}`);
console.log(`  Frontend: ${config.frontendUrl}`);
