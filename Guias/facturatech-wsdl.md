# Facturatech WSDL — Operaciones SOAP

**WSDL / documentación del servicio:**  
https://ws.facturatech.co/v2/pro/index.php

Endpoint SOAP de Facturatech para facturación electrónica en Colombia (validación y envío ante la DIAN). No es una página para usar en el navegador: las llamadas se hacen por **POST SOAP** (Postman, backend Node, PHP, etc.).

---

## Datos comunes a todas las operaciones

| Campo | Descripción |
|-------|-------------|
| **URL** | `https://ws.facturatech.co/v2/pro/index.php` |
| **Protocolo** | SOAP (XML) |
| **username** | Usuario Facturatech |
| **password** | Contraseña en **hash SHA-256** (no texto plano) |
| **Éxito de envío** | Normalmente `code = 201` |

PowerShell para generar el hash de la contraseña:

```powershell
$pwd = "tu_clave_real"
[BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($pwd))).Replace("-","").ToLower()
```

---

## Flujo principal (usado en este proyecto)

### 1. `FtechAction.uploadInvoiceFile`

**Para qué sirve:** Envía un comprobante electrónico a Facturatech.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `xmlBase64` | `transaccionID`, `code` |

- El XML del comprobante va codificado en **Base64**.
- Sirve para **facturas** y **notas crédito**.
- En el proyecto Node: `enviarXmlFacturatech()` en `server/src/services/facturatech.service.js`.
- Equivalente PHP: `EnviarFactura()` y `EnviarFacturaNC()` en `wbsFactura.php`.

---

### 2. `FtechAction.documentStatusFile`

**Para qué sirve:** Consulta el estado de un documento ya subido.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `transaccionID` | Estado del comprobante |

- Se usa después de `uploadInvoiceFile` para saber si la DIAN aceptó o rechazó el documento.
- En el proyecto Node: se llama inmediatamente después del upload en `enviarXmlFacturatech()`.

---

### 3. `FtechAction.getCUFEFile`

**Para qué sirve:** Obtiene el **CUFE** de una factura ya firmada y enviada.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `prefijo`, `folio` | CUFE en `resourceData` |

- El CUFE es obligatorio en el XML de una **nota crédito** para referenciar la factura original.
- En el proyecto Node: `obtenerCufeFactura()` en `facturatech.service.js`.
- Equivalente PHP: `EnviarNotaCredito()` (consulta CUFE, no envía la NC).

---

## Descarga de documentos ya emitidos

### 4. `FtechAction.downloadXMLFile`

**Para qué sirve:** Descarga el XML **firmado** que devolvió la DIAN/Facturatech.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `prefijo`, `folio` | XML en Base64 |

Casos de uso: archivar, reenviar al cliente, auditoría.

---

### 5. `FtechAction.downloadPDFFile`

**Para qué sirve:** Descarga la representación gráfica en PDF del comprobante.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `prefijo`, `folio` | PDF en Base64 |

Casos de uso: enviar factura por correo, imprimir.

---

### 6. `FtechAction.getQRFile`

**Para qué sirve:** Obtiene el **código QR** del documento (datos en texto).

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `prefijo`, `folio` | Datos del QR |

Casos de uso: validación en app de la DIAN, mostrar QR en pantalla.

---

### 7. `FtechAction.getQRImageFile`

**Para qué sirve:** Igual que `getQRFile`, pero devuelve una **imagen** del QR.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `prefijo`, `folio` | Imagen del QR |

Casos de uso: incrustar el QR en un PDF propio o en la interfaz web.

---

## Operaciones administrativas / alternativas

### 8. `FtechAction.uploadInvoiceFileLayout`

**Para qué sirve:** Envía facturas usando un **layout/plantilla** de Facturatech en lugar de XML UBL completo.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `layout` | `transaccionID` |

Este proyecto **no lo usa**: se genera XML UBL propio (`face_0800.xml`, etc.).

---

### 9. `FtechAction.downloadTaxpayerData`

**Para qué sirve:** Consulta datos de un contribuyente en la DIAN.

| Entrada | Salida |
|---------|--------|
| `username`, `password`, `companyId`, `identificactionType` | Datos del contribuyente |

Casos de uso: autocompletar razón social, validar NIT/CC al facturar.

---

### 10. `FtechAction.checkCredits`

**Para qué sirve:** Consulta cuántos **folios/créditos** quedan disponibles en Facturatech.

| Entrada | Salida |
|---------|--------|
| `username`, `password` | Total de créditos/folios |

Casos de uso: verificar si se puede seguir facturando antes de agotar el plan.

---

## Flujo en este proyecto

```
FACTURA
  1. Generar XML (face_{numero}.xml)
  2. Esperar 2 s (FACTURATECH_ENVIO_DELAY_MS)
  3. uploadInvoiceFile
  4. documentStatusFile
  5. Si code = 201 → UPDATE Factura.EstadoFacturaElectronica

NOTA CRÉDITO
  1. getCUFEFile (factura original)
  2. Generar XML NOTA con CUFE
  3. Esperar 2 s
  4. uploadInvoiceFile
  5. documentStatusFile
  6. Si code = 201 → UPDATE [Nota Crédito].EstadoFace
```

Modo `solo_xml` en `.env` (`FE_FACTURA_MODO` / `FE_NOTA_CREDITO_MODO`): solo genera XML, sin llamar a Facturatech ni actualizar BD.

---

## Resumen por operación

| Operación | ¿Usa el proyecto? | Propósito |
|-----------|-------------------|-----------|
| `uploadInvoiceFile` | Sí | Enviar factura/NC a DIAN |
| `documentStatusFile` | Sí | Confirmar si fue aceptada |
| `getCUFEFile` | Sí | CUFE para nota crédito |
| `downloadXMLFile` | No | Descargar XML firmado |
| `downloadPDFFile` | No | Descargar PDF |
| `getQRFile` | No | Obtener QR (texto) |
| `getQRImageFile` | No | Obtener QR (imagen) |
| `uploadInvoiceFileLayout` | No | Enviar con plantilla Facturatech |
| `downloadTaxpayerData` | No | Consultar datos DIAN de un NIT/CC |
| `checkCredits` | No | Ver folios disponibles |

---

## Pruebas con Postman

Colección en `server/postman/Facturatech-WSDL.postman_collection.json`.

Incluye las 3 operaciones principales. Las variables están en la pestaña **Variables** de la colección (no requiere entorno).

Orden sugerido:

1. `getCUFEFile` — validar credenciales
2. `uploadInvoiceFile` — pegar `xmlBase64`
3. `documentStatusFile` — usa `transaccionID` del paso anterior
