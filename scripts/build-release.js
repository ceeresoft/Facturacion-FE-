import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const releaseDir = path.join(rootDir, "release");
const serverDir = path.join(rootDir, "server");

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(from, to, skip = []) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest, skip);
    } else {
      copyFile(src, dest);
    }
  }
}

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error("No existe dist/. Corre primero: npm run build");
  process.exit(1);
}

fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

copyDir(distDir, path.join(releaseDir, "dist"));
copyDir(path.join(serverDir, "src"), path.join(releaseDir, "server", "src"));
copyDir(path.join(serverDir, "Sql"), path.join(releaseDir, "server", "Sql"));
copyDir(path.join(serverDir, "scripts"), path.join(releaseDir, "server", "scripts"), [
  "debug-xml-queries.js",
  "debug-xml-step-by-step.js",
  "debug-failing-copago.js",
  "test-cargar-xml-all.js",
  "test-codigo-municipio.js",
  "test-descuento-copago.js",
  "test-documento-sin-digito.js",
]);
copyFile(
  path.join(serverDir, "package.json"),
  path.join(releaseDir, "server", "package.json")
);
copyFile(
  path.join(serverDir, "package-lock.json"),
  path.join(releaseDir, "server", "package-lock.json")
);
copyFile(
  path.join(serverDir, ".env.example"),
  path.join(releaseDir, "server", ".env.example")
);
copyFile(
  path.join(rootDir, "Guias", "nssm-servicios.md"),
  path.join(releaseDir, "Guias", "nssm-servicios.md")
);

console.log(`Release en ${releaseDir}`);
console.log("Cliente:");
console.log("  1. Copiar release/ al servidor");
console.log("  2. cd release/server && copy .env.example .env  (editar BD, JWT, Facturatech)");
console.log("  3. npm install");
console.log("  4. npm start   → API + frontend en el mismo puerto (PORT)");
