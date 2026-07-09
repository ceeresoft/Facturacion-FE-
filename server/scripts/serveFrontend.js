import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { getFrontendPort, getFrontendUrl } from "../src/config/appPorts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "../..");
const port = getFrontendPort();
const url = getFrontendUrl();

console.log(`Frontend en ${url} (puerto ${port})`);

const child = spawn("npx", ["--yes", "serve", "-p", String(port), projectRoot], {
  stdio: "inherit",
  shell: true,
  cwd: projectRoot,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
