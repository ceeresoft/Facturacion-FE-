import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function htmlInputs() {
  return {
    main: path.join(rootDir, "index.html"),
    login: path.join(rootDir, "views/login.html"),
    buscar: path.join(rootDir, "views/buscar-factura.html"),
    perfil: path.join(rootDir, "views/perfil-empresa.html"),
    imprimir: path.join(rootDir, "views/imprimir-factura.html"),
  };
}

function envConfigBody(apiBaseUrl = "") {
  const payload = {
    apiBaseUrl,
    apiPort: Number(apiBaseUrl ? new URL(apiBaseUrl).port : 3005) || 3005,
    frontendUrl: "",
    frontendPort: 8080,
  };

  return `window.APP_CONFIG = ${JSON.stringify(payload, null, 2)};\n`;
}

function envConfigPlugin() {
  const handler = (req, res, next) => {
    const url = req.url?.split("?")[0];
    if (url !== "/env-config.js") {
      next();
      return;
    }

    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(envConfigBody(""));
  };

  return {
    name: "env-config",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.join(rootDir, "server"), "");
  const apiPort = env.PORT || "3005";
  const frontendPort = Number(env.FRONTEND_PORT || 8080);

  return {
    appType: "mpa",
    root: rootDir,
    publicDir: "public",
    plugins: [envConfigPlugin()],
    build: {
      outDir: path.join(rootDir, "dist"),
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: htmlInputs(),
      },
    },
    server: {
      port: frontendPort,
      strictPort: false,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: frontendPort,
      strictPort: false,
    },
  };
});
