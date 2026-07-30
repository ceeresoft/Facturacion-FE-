// Generado automaticamente desde server/.env
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
window.APP_CONFIG = {
  "apiBaseUrl": "http://localhost:3005",
  "apiPort": 3005,
  "frontendUrl": "http://localhost:8080",
  "frontendPort": 8080
};
