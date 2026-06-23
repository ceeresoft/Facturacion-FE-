# Facturación Electrónica — Documentación

Interfaz web para la migración del aplicativo de facturación electrónica. Paleta **Azul Médico**, login, consulta de facturas y notas crédito, perfiles editables. Fase visual sin backend PHP.

---

## Paleta — Azul Médico

| Token | Color |
|-------|-------|
| Primario | `#0284c7` |
| Header | `#0c4a6e` |
| Fondo | `#f0f9ff` |
| Logo desarrollador | `assets/img/logo-ceere-software.png` (Ceere Software) |
| Nombre clínica | `data-empresa-nombre` / `EMPRESA_PERFIL_DEFAULT` |

---

## Estructura del proyecto

```
Facturacion Electronica/
├── docs/
│   └── README.md
├── lib/bootstrap/
├── assets/
│   ├── css/app.css
│   ├── js/app.js
│   └── img/logo-ceere-software.png
├── views/
│   ├── login.html
│   ├── buscar-factura.html
│   └── perfil-empresa.html
└── index.html
```

---

## Cómo ejecutar

```bash
python -m http.server 8080
```

Abrir `http://localhost:8080` → login → pantalla principal.

---

## Sesión y navegación

### Login (`views/login.html`)

- Usuario y contraseña (validación visual).
- Inicia sesión en `localStorage` (`fe-sesion`) y redirige a la consulta.

### Cerrar sesión

Botón en el encabezado. Elimina la sesión y vuelve al login.

### Pantallas protegidas

- `buscar-factura.html`
- `perfil-empresa.html`

### Acciones del encabezado (consulta)

| Enlace | Descripción |
|--------|-------------|
| Perfil empresa | Datos del emisor (página dedicada) |
| Cerrar sesión | Salir de la aplicación |

---

## Consulta de facturas (`views/buscar-factura.html`)

### Menú de envío (junto al logo)

| Modo | Descripción |
|------|-------------|
| Envío de factura | Consulta estándar |
| Envío de nota crédito | Mismas sesiones + número de nota crédito |

### Formulario de búsqueda

| Campo | Factura | Nota crédito | Tipo |
|-------|---------|--------------|------|
| Número de nota crédito | — | Sí (primero) | Texto |
| Resolución de facturación | Sí | Sí | Select |
| Número de factura | Sí | Sí | Select |

### Resultados — 4 sesiones desplegables

Paneles independientes: al abrir uno, los demás **mantienen su estado**.

1. Información empresa
2. Información usuario
3. Información de la factura / nota crédito
4. Items factura / nota crédito

### Edición del usuario en modal (sin salir de la consulta)

En la sesión **Información usuario**:

- **Completar datos** — si faltan campos (aviso amarillo).
- **Editar datos del usuario** — enlace bajo la grilla.

Ambos abren un **modal Bootstrap** (`#modalEditarUsuario`) sobre la vista actual. Al guardar:

1. Se persiste en `localStorage` (`fe-usuario-perfil`).
2. Se actualizan los resultados **sin volver a buscar**.
3. Los paneles del accordion que estaban abiertos permanecen abiertos.

No hay enlace "Perfil usuario" en el header; la edición es solo desde los resultados de la consulta.

---

## Perfil de la empresa (`views/perfil-empresa.html`)

Almacenamiento: `fe-empresa-perfil`

### Editables

Tipo de documento, Dirección, Teléfono principal, Teléfono alternativo.

### No editables

Nombre / Razón social, Documento.

---

## Datos del usuario (`fe-usuario-perfil`)

| Campo | Obligatorio al guardar |
|-------|------------------------|
| Tipo de documento | Sí |
| Identificación | Sí |
| Nombres | Sí |
| Apellidos | Sí |
| E-mail, Teléfono, Departamento, Ciudad, Dirección, Régimen | No |

Campos vacíos se muestran como **—** en la consulta.

Valores por defecto: `USUARIO_PERFIL_DEFAULT` en `assets/js/app.js`.

---

## Campos por sesión de consulta

### Información empresa

Tipo documento, Documento, Razón Social, Dirección, Teléfonos, Departamento, Ciudad, Barrio, E-mail, Régimen.

### Información usuario

Tipo de documento, Identificación, Nombres, Apellidos, E-mail, Departamento, Ciudad, Dirección, Teléfono, Régimen.

### Información de la factura

Estado, Número factura, Fecha, Medio de pago, Subtotal, IVA, Descuento, Retenciones, Total.

### Items

#, Código, Descripción, Cantidad, Precio unitario, IVA, Subtotal.

---

## Marca e identidad visual

| Elemento | Uso |
|----------|-----|
| **Ceere Software** | Marca del desarrollador del software. Logo completo en login y pie de página. |
| **Nombre de la clínica** (`Mi Empresa S.A.S.`) | Cliente / razón social mostrada en header de consulta y perfil. |
| **Icono Ceere** | Solo el símbolo circular (recorte CSS) junto al nombre de la clínica en pantallas internas. |

**Archivo:** `assets/img/logo-ceere-software.png` — logo Ceere (icono + “ceere”) con fondo transparente. En login y footer va completo; en header interno solo el icono circular. El nombre de la clínica se mantiene en `Mi Empresa S.A.S.`.

---

## Personalización

| Qué | Dónde |
|-----|-------|
| Empresa fija | `EMPRESA_PERFIL_DEFAULT` en `app.js` |
| Usuario por defecto | `USUARIO_PERFIL_DEFAULT` en `app.js` |
| Colores | `:root` en `app.css` |
| Logo Ceere | `assets/img/logo-ceere-software.png` |

---

## Integración futura (Fase 2)

- Backend PHP / API REST
- `PUT /api/usuario/{id}` al guardar modal
- Autenticación real

---

## Tecnologías

HTML5 · Bootstrap 5.3.3 · CSS personalizado · JavaScript vanilla
