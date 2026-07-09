# Postman — Facturacion-FE

**2 colecciones** (cada una con sus variables internas, sin archivo de entorno):

| Colección | Archivo | Llama a |
|-----------|---------|---------|
| Facturatech WSDL | `Facturatech-WSDL.postman_collection.json` | Facturatech directo (SOAP) |
| API del proyecto | `Facturacion-FE-API.postman_collection.json` | Backend Node `/api/...` |

En ambas: clic en la colección → pestaña **Variables**. No requiere entorno.

---

## 1. Facturatech WSDL

Importar: `Facturatech-WSDL.postman_collection.json`

| Variable | Valor |
|----------|-------|
| `wsdlUrl` | `https://ws.facturatech.co/v2/pro/index.php` |
| `username` | Usuario Facturatech |
| `password` | Hash SHA-256 |
| `prefijo` / `folio` | Factura a consultar |
| `xmlBase64` | XML en Base64 |

---

## 2. API del proyecto

Importar: `Facturacion-FE-API.postman_collection.json`

Credenciales Facturatech en `server/.env`, no en Postman.

| Variable | Valor |
|----------|-------|
| `baseUrl` | `http://localhost:3005/api` |
| `usuario` / `password` | Login BD |
| `token` | Se llena con Login |
| `empresaId` | Id empresa |
| `numeroFactura` | Ej. 0800 |
| `numeroNotaCredito` | Ej. 0001 |
| `cufe` | Vacío = backend consulta getCUFE |

**Orden:** Auth → Login → Factura / Nota crédito
