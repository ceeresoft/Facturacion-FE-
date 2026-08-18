import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import { getPublicAppConfig, getApiBaseUrl } from "./config/appPorts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../../dist");

export function getFrontendDistDir() {
  return distDir;
}

export function shouldServeFrontend() {
  if (process.env.SERVE_FRONTEND === "false") {
    return false;
  }
  return fs.existsSync(path.join(distDir, "index.html"));
}

export function mountFrontend(app) {
  app.get("/env-config.js", (_req, res) => {
    const config = {
      ...getPublicAppConfig(),
      apiBaseUrl: "",
      frontendUrl: getApiBaseUrl(),
    };
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(`window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
  });

  app.use(express.static(distDir, { index: "index.html" }));
}
