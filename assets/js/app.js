const SESSION_KEY = "fe-sesion";
const EMPRESA_PERFIL_KEY = "fe-empresa-perfil";
const USUARIO_PERFIL_KEY = "fe-usuario-perfil";

const EMPRESA_PERFIL_DEFAULT = {
  nombre: "Mi Empresa S.A.S.",
  documento: "900.123.456-7",
  tipoDocumento: "NIT",
  direccion: "Calle 50 # 32-120, El Poblado",
  telefono: "604 321 4567",
  telefono2: "300 987 6543",
};

const USUARIO_PERFIL_DEFAULT = {
  tipoDocumento: "CC",
  identificacion: "1.234.567.890",
  nombres: "Juan Carlos",
  apellidos: "Pérez Gómez",
  email: "",
  departamento: "Antioquia",
  ciudad: "Medellín",
  direccion: "",
  telefono: "",
  regimen: "",
};

let tipoEnvioActual = "factura";
let ultimaConsulta = null;
let modalUsuarioInstance = null;

const ACCORDION_IDS = ["secEmpresa", "secUsuario", "secFactura", "secItems"];

const FACTURA_MOCK = {
  empresa: {
    tipoDocumento: "NIT",
    documento: "900.123.456-7",
    razonSocial: "Clínica Salud Integral S.A.S.",
    departamento: "Antioquia",
    ciudad: "Medellín",
    barrio: "El Poblado",
    email: "facturacion@clinicasalud.com",
    regimen: "Responsable de IVA",
  },
  usuario: {
    tipoDocumento: "CC",
    identificacion: "1.234.567.890",
    nombres: "Juan Carlos",
    apellidos: "Pérez Gómez",
    email: "juan.perez@email.com",
    departamento: "Antioquia",
    ciudad: "Medellín",
    direccion: "Calle 10 # 43-28",
    telefono: "300 123 4567",
    regimen: "No responsable de IVA",
  },
  estado: "Aprobada",
  numeroFactura: "00001234",
  fecha: "15/06/2026",
  medioPago: "Transferencia bancaria",
  subtotal: 1250000,
  iva: 237500,
  descuento: 50000,
  retencionFuente: 31250,
  retencionIva: 35625,
  otrasRetenciones: 0,
  total: 1375625,
  items: [
    {
      codigo: "SRV-001",
      descripcion: "Consultoría en sistemas de información",
      cantidad: 10,
      precioUnitario: 85000,
      iva: 161500,
      subtotal: 850000,
    },
    {
      codigo: "SRV-002",
      descripcion: "Soporte técnico mensual",
      cantidad: 2,
      precioUnitario: 200000,
      iva: 76000,
      subtotal: 400000,
    },
  ],
};

const NOTA_CREDITO_MOCK = {
  ...FACTURA_MOCK,
  numeroNotaCredito: "NC-000001",
  estado: "Aprobada",
};

document.addEventListener("DOMContentLoaded", () => {
  initSession();
  initLogin();
  initLogout();
  initMenuEnvio();
  initBuscarFactura();
  initPerfilEmpresa();
  initModalUsuario();
  applyEmpresaNombre();
});

function isSessionActive() {
  return localStorage.getItem(SESSION_KEY) === "true";
}

function iniciarSesion() {
  localStorage.setItem(SESSION_KEY, "true");
}

function cerrarSesion() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

function initSession() {
  const requiereAuth = document.body.hasAttribute("data-require-auth");
  const esLogin = document.getElementById("loginForm");

  if (requiereAuth && !isSessionActive()) {
    window.location.href = "login.html";
    return;
  }

  if (esLogin && isSessionActive()) {
    window.location.href = "buscar-factura.html";
  }
}

function initLogout() {
  const btn = document.getElementById("btnCerrarSesion");
  if (!btn) return;
  btn.addEventListener("click", cerrarSesion);
}

function getEmpresaPerfil() {
  try {
    const saved = JSON.parse(localStorage.getItem(EMPRESA_PERFIL_KEY) || "{}");
    return {
      ...EMPRESA_PERFIL_DEFAULT,
      ...saved,
      nombre: EMPRESA_PERFIL_DEFAULT.nombre,
      documento: EMPRESA_PERFIL_DEFAULT.documento,
    };
  } catch {
    return { ...EMPRESA_PERFIL_DEFAULT };
  }
}

function saveEmpresaPerfil(data) {
  const toSave = {
    tipoDocumento: data.tipoDocumento,
    direccion: data.direccion,
    telefono: data.telefono,
    telefono2: data.telefono2 || "",
  };
  localStorage.setItem(EMPRESA_PERFIL_KEY, JSON.stringify(toSave));
}

function getEmpresaParaFactura() {
  const perfil = getEmpresaPerfil();
  return {
    ...FACTURA_MOCK.empresa,
    tipoDocumento: perfil.tipoDocumento,
    documento: perfil.documento,
    razonSocial: perfil.nombre,
    direccion: perfil.direccion,
    telefono: perfil.telefono,
    telefono2: perfil.telefono2,
  };
}

function applyEmpresaNombre() {
  const nombre = getEmpresaPerfil().nombre;
  document.querySelectorAll("[data-empresa-nombre]").forEach((el) => {
    el.textContent = nombre;
  });
}

function initPerfilEmpresa() {
  const form = document.getElementById("perfilEmpresaForm");
  if (!form) return;

  const perfil = getEmpresaPerfil();
  const alertBox = document.getElementById("perfilAlert");

  form.querySelector("#perfilNombre").value = perfil.nombre;
  form.querySelector("#perfilDocumento").value = perfil.documento;
  form.querySelector("#perfilTipoDocumento").value = perfil.tipoDocumento;
  form.querySelector("#perfilDireccion").value = perfil.direccion;
  form.querySelector("#perfilTelefono").value = perfil.telefono;
  form.querySelector("#perfilTelefono2").value = perfil.telefono2 || "";

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const tipoDocumento = form.querySelector("#perfilTipoDocumento").value;
    const direccion = form.querySelector("#perfilDireccion").value.trim();
    const telefono = form.querySelector("#perfilTelefono").value.trim();
    const telefono2 = form.querySelector("#perfilTelefono2").value.trim();

    if (!direccion || !telefono) {
      showPerfilAlert(alertBox, "Complete la dirección y el teléfono principal.", "warning");
      return;
    }

    saveEmpresaPerfil({ tipoDocumento, direccion, telefono, telefono2 });
    applyEmpresaNombre();
    showPerfilAlert(alertBox, "Perfil actualizado correctamente.", "success");
  });
}

function getUsuarioPerfil() {
  try {
    const saved = JSON.parse(localStorage.getItem(USUARIO_PERFIL_KEY) || "{}");
    return { ...USUARIO_PERFIL_DEFAULT, ...saved };
  } catch {
    return { ...USUARIO_PERFIL_DEFAULT };
  }
}

function saveUsuarioPerfil(data) {
  localStorage.setItem(USUARIO_PERFIL_KEY, JSON.stringify(data));
}

function getUsuarioParaFactura() {
  const perfil = getUsuarioPerfil();
  return { ...FACTURA_MOCK.usuario, ...perfil };
}

function isUsuarioIncompleto(usuario) {
  const campos = [
    usuario.email,
    usuario.telefono,
    usuario.direccion,
    usuario.regimen,
    usuario.departamento,
    usuario.ciudad,
  ];
  return campos.some((c) => !c || !String(c).trim());
}

function displayValue(value) {
  return value && String(value).trim() ? value : "—";
}

function cargarFormularioUsuario() {
  const form = document.getElementById("perfilUsuarioForm");
  if (!form) return;

  const perfil = getUsuarioPerfil();
  form.querySelector("#usuarioTipoDocumento").value = perfil.tipoDocumento;
  form.querySelector("#usuarioIdentificacion").value = perfil.identificacion;
  form.querySelector("#usuarioNombres").value = perfil.nombres;
  form.querySelector("#usuarioApellidos").value = perfil.apellidos;
  form.querySelector("#usuarioEmail").value = perfil.email || "";
  form.querySelector("#usuarioTelefono").value = perfil.telefono || "";
  form.querySelector("#usuarioDepartamento").value = perfil.departamento || "";
  form.querySelector("#usuarioCiudad").value = perfil.ciudad || "";
  form.querySelector("#usuarioDireccion").value = perfil.direccion || "";
  form.querySelector("#usuarioRegimen").value = perfil.regimen || "";
}

function leerDatosFormularioUsuario(form) {
  return {
    tipoDocumento: form.querySelector("#usuarioTipoDocumento").value,
    identificacion: form.querySelector("#usuarioIdentificacion").value.trim(),
    nombres: form.querySelector("#usuarioNombres").value.trim(),
    apellidos: form.querySelector("#usuarioApellidos").value.trim(),
    email: form.querySelector("#usuarioEmail").value.trim(),
    telefono: form.querySelector("#usuarioTelefono").value.trim(),
    departamento: form.querySelector("#usuarioDepartamento").value.trim(),
    ciudad: form.querySelector("#usuarioCiudad").value.trim(),
    direccion: form.querySelector("#usuarioDireccion").value.trim(),
    regimen: form.querySelector("#usuarioRegimen").value,
  };
}

function abrirModalUsuario() {
  const modalEl = document.getElementById("modalEditarUsuario");
  if (!modalEl) return;

  const alertBox = document.getElementById("perfilUsuarioAlert");
  if (alertBox) {
    alertBox.classList.add("d-none");
  }

  cargarFormularioUsuario();
  modalUsuarioInstance =
    modalUsuarioInstance || bootstrap.Modal.getOrCreateInstance(modalEl);
  modalUsuarioInstance.show();
}

function getAccordionOpenState() {
  return ACCORDION_IDS.filter((id) =>
    document.getElementById(id)?.classList.contains("show")
  );
}

function restoreAccordionOpenState(openIds) {
  openIds.forEach((id) => {
    const panel = document.getElementById(id);
    const btn = document.querySelector(`[data-bs-target="#${id}"]`);
    if (panel && !panel.classList.contains("show")) {
      panel.classList.add("show");
      btn?.classList.remove("collapsed");
      btn?.setAttribute("aria-expanded", "true");
    }
  });
}

function refrescarResultados() {
  if (!ultimaConsulta) return;

  const resultsBody = document.getElementById("resultsBody");
  const openPanels = getAccordionOpenState();
  const { numeroFactura, numeroNotaCredito, esNotaCredito } = ultimaConsulta;
  const datos = buildMockData(numeroFactura, numeroNotaCredito, esNotaCredito);

  renderFacturaResult(resultsBody, datos, esNotaCredito);
  restoreAccordionOpenState(openPanels);
}

function initModalUsuario() {
  const form = document.getElementById("perfilUsuarioForm");
  const modalEl = document.getElementById("modalEditarUsuario");
  const resultsBody = document.getElementById("resultsBody");
  if (!form || !modalEl) return;

  const alertBox = document.getElementById("perfilUsuarioAlert");

  modalEl.addEventListener("show.bs.modal", cargarFormularioUsuario);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = leerDatosFormularioUsuario(form);

    if (!data.identificacion || !data.nombres || !data.apellidos) {
      showPerfilAlert(
        alertBox,
        "Complete identificación, nombres y apellidos como mínimo.",
        "warning"
      );
      return;
    }

    saveUsuarioPerfil(data);
    refrescarResultados();

    modalUsuarioInstance =
      modalUsuarioInstance || bootstrap.Modal.getOrCreateInstance(modalEl);
    modalUsuarioInstance.hide();
  });

  if (resultsBody) {
    resultsBody.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-editar-usuario");
      if (btn) {
        e.preventDefault();
        abrirModalUsuario();
      }
    });
  }
}

function showPerfilAlert(container, message, type) {
  if (!container) return;
  container.className = `alert alert-${type} mb-3`;
  container.textContent = message;
  container.classList.remove("d-none");
}

function initLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const alertBox = document.getElementById("loginAlert");
  const passwordInput = form.querySelector("#password");
  const toggleBtn = document.getElementById("btnTogglePassword");

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      toggleBtn.setAttribute("aria-pressed", String(isHidden));
      toggleBtn.setAttribute("aria-label", isHidden ? "Ocultar contraseña" : "Mostrar contraseña");
      toggleBtn.querySelector(".icon-eye")?.classList.toggle("d-none", isHidden);
      toggleBtn.querySelector(".icon-eye-slash")?.classList.toggle("d-none", !isHidden);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const usuario = form.querySelector("#usuario").value.trim();
    const password = form.querySelector("#password").value.trim();

    if (!usuario || !password) {
      showAlert(alertBox, "Por favor ingrese usuario y contraseña.", "warning");
      return;
    }

    iniciarSesion();
    window.location.href = "buscar-factura.html";
  });
}

function initMenuEnvio() {
  const menu = document.getElementById("menuEnvio");
  if (!menu) return;

  menu.querySelectorAll("[data-tipo-envio]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTipoEnvio(btn.dataset.tipoEnvio);
    });
  });
}

function setTipoEnvio(tipo) {
  tipoEnvioActual = tipo;
  const esNotaCredito = tipo === "nota_credito";

  document.body.classList.toggle("modo-nota-credito", esNotaCredito);

  document.querySelectorAll("[data-tipo-envio]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tipoEnvio === tipo);
  });

  const searchTitle = document.getElementById("searchTitleText");
  const btnBuscarText = document.getElementById("btnBuscarText");
  const emptyAction = document.getElementById("emptyActionText");
  const resultsHeader = document.getElementById("resultsHeader");
  const resultsBody = document.getElementById("resultsBody");

  if (searchTitle) {
    searchTitle.textContent = esNotaCredito ? "Consultar nota crédito" : "Consultar factura";
  }
  if (btnBuscarText) {
    btnBuscarText.textContent = esNotaCredito ? "Buscar nota crédito" : "Buscar factura";
  }
  if (emptyAction) {
    emptyAction.textContent = esNotaCredito ? "Buscar nota crédito" : "Buscar factura";
  }
  if (resultsHeader) {
    resultsHeader.textContent = esNotaCredito
      ? "Resultados de la nota crédito"
      : "Resultados de la consulta";
  }

  if (resultsBody) {
    ultimaConsulta = null;
    resetResultsEmpty(resultsBody, esNotaCredito);
  }
}

function resetResultsEmpty(container, esNotaCredito) {
  const actionText = esNotaCredito ? "Buscar nota crédito" : "Buscar factura";
  container.innerHTML = `
    <div class="results-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
        <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.448-.148-.986.124-1.316l.307-.338.338-.307c.33-.272.868-.32 1.316-.124a.81.81 0 0 1 .42.438c.196.448.148.986-.124 1.316l-.307.338-.338.307a.81.81 0 0 1-.438.124z"/>
      </svg>
      <p>Seleccione los criterios y presione <strong>${actionText}</strong>.</p>
    </div>
  `;
}

function initBuscarFactura() {
  const form = document.getElementById("buscarForm");
  if (!form) return;

  const resultsBody = document.getElementById("resultsBody");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const resolucion = form.querySelector("#resolucion").value;
    const numeroFactura = form.querySelector("#numeroFactura").value;
    const esNotaCredito = tipoEnvioActual === "nota_credito";
    const numeroNotaCredito = esNotaCredito
      ? form.querySelector("#numeroNotaCredito").value.trim()
      : null;

    if (esNotaCredito && !numeroNotaCredito) {
      showResultsMessage(
        resultsBody,
        "warning",
        "Ingrese el número de nota crédito para continuar."
      );
      return;
    }

    if (!resolucion) {
      showResultsMessage(
        resultsBody,
        "warning",
        "Seleccione una resolución de facturación para continuar."
      );
      return;
    }

    if (!numeroFactura) {
      showResultsMessage(
        resultsBody,
        "warning",
        "Seleccione el número de factura que desea consultar."
      );
      return;
    }

    ultimaConsulta = { numeroFactura, numeroNotaCredito, esNotaCredito };
    const datos = buildMockData(numeroFactura, numeroNotaCredito, esNotaCredito);
    renderFacturaResult(resultsBody, datos, esNotaCredito);
  });
}

function buildMockData(numeroFactura, numeroNotaCredito, esNotaCredito) {
  const base = esNotaCredito ? NOTA_CREDITO_MOCK : FACTURA_MOCK;
  return {
    ...base,
    empresa: getEmpresaParaFactura(),
    usuario: getUsuarioParaFactura(),
    numeroFactura,
    ...(esNotaCredito && { numeroNotaCredito }),
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getEstadoClass(estado) {
  const map = {
    Aprobada: "aprobada",
    Pendiente: "pendiente",
    Anulada: "anulada",
  };
  return map[estado] || "pendiente";
}

function renderInfoGrid(fields) {
  return fields
    .map(
      (field) => `
      <div class="info-field${field.money ? " info-field-money" : ""}${field.total ? " info-field-total" : ""}">
        <span class="info-label">${field.label}</span>
        <span class="info-value">${field.value}</span>
      </div>
    `
    )
    .join("");
}

function renderAccordionSection(id, title, iconPath, contentHtml, expanded) {
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button
          class="accordion-button${expanded ? "" : " collapsed"}"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#${id}"
          aria-expanded="${expanded}"
          aria-controls="${id}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
            ${iconPath}
          </svg>
          ${title}
        </button>
      </h2>
      <div id="${id}" class="accordion-collapse collapse${expanded ? " show" : ""}">
        <div class="accordion-body">
          ${contentHtml}
        </div>
      </div>
    </div>
  `;
}

const ICONS = {
  empresa: '<path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1h1a.5.5 0 0 1 .5.5v1h1a.5.5 0 0 1 .5.5v1h1a.5.5 0 0 1 .5.5v1h-7a.5.5 0 0 1-.5-.5v-1H3a.5.5 0 0 1-.5-.5v-1H2a.5.5 0 0 1-.5-.5v-1H1a.5.5 0 0 1-.5-.5v-1h.5V2.5z"/><path d="M7 6.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-7z"/>',
  usuario: '<path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>',
  factura: '<path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>',
  items: '<path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14z"/>',
};

function renderEmpresaSection(empresa) {
  const telefonos = empresa.telefono2
    ? `${empresa.telefono} / ${empresa.telefono2}`
    : empresa.telefono;

  const fields = [
    { label: "Tipo documento", value: empresa.tipoDocumento },
    { label: "Documento", value: empresa.documento },
    { label: "Razón Social", value: empresa.razonSocial },
    { label: "Dirección", value: empresa.direccion || "—" },
    { label: "Teléfonos", value: telefonos || "—" },
    { label: "Departamento", value: empresa.departamento },
    { label: "Ciudad", value: empresa.ciudad },
    { label: "Barrio", value: empresa.barrio },
    { label: "E-mail", value: empresa.email },
    { label: "Régimen", value: empresa.regimen },
  ];
  return renderAccordionSection(
    "secEmpresa",
    "Información empresa",
    ICONS.empresa,
    `<div class="info-grid">${renderInfoGrid(fields)}</div>`,
    true
  );
}

function renderUsuarioSection(usuario) {
  const incompleto = isUsuarioIncompleto(usuario);
  const avisoIncompleto = incompleto
    ? `<div class="usuario-incompleto-banner">
        <span>Faltan datos del usuario por completar.</span>
        <button type="button" class="btn btn-link btn-editar-usuario p-0">Completar datos →</button>
      </div>`
    : "";

  const fields = [
    { label: "Tipo de documento", value: displayValue(usuario.tipoDocumento) },
    { label: "Identificación", value: displayValue(usuario.identificacion) },
    { label: "Nombres", value: displayValue(usuario.nombres) },
    { label: "Apellidos", value: displayValue(usuario.apellidos) },
    { label: "E-mail", value: displayValue(usuario.email) },
    { label: "Departamento", value: displayValue(usuario.departamento) },
    { label: "Ciudad", value: displayValue(usuario.ciudad) },
    { label: "Dirección", value: displayValue(usuario.direccion) },
    { label: "Teléfono", value: displayValue(usuario.telefono) },
    { label: "Régimen", value: displayValue(usuario.regimen) },
  ];
  return renderAccordionSection(
    "secUsuario",
    "Información usuario",
    ICONS.usuario,
    `${avisoIncompleto}<div class="info-grid">${renderInfoGrid(fields)}</div>
     <p class="mt-3 mb-0"><button type="button" class="btn btn-link btn-editar-usuario p-0">Editar datos del usuario</button></p>`,
    false
  );
}

function renderFacturaSection(factura, esNotaCredito) {
  const fields = [];

  if (esNotaCredito) {
    fields.push({
      label: "Número de nota crédito",
      value: factura.numeroNotaCredito,
    });
  }

  fields.push(
    {
      label: esNotaCredito ? "Estado de nota crédito" : "Estado de factura",
      value: `<span class="estado-badge ${getEstadoClass(factura.estado)}">${factura.estado}</span>`,
    },
    { label: "Número factura", value: factura.numeroFactura },
    {
      label: esNotaCredito ? "Fecha de la nota crédito" : "Fecha de la factura",
      value: factura.fecha,
    },
    { label: "Medio de pago", value: factura.medioPago },
    { label: "Subtotal", value: formatMoney(factura.subtotal), money: true },
    { label: "IVA", value: formatMoney(factura.iva), money: true },
    { label: "Descuento", value: formatMoney(factura.descuento), money: true },
    { label: "Retención en la fuente", value: formatMoney(factura.retencionFuente), money: true },
    { label: "Retención IVA", value: formatMoney(factura.retencionIva), money: true },
    { label: "Otras retenciones", value: formatMoney(factura.otrasRetenciones), money: true },
    { label: "Total", value: formatMoney(factura.total), money: true, total: true }
  );

  const titulo = esNotaCredito
    ? "Información de la nota crédito"
    : "Información de la factura";

  return renderAccordionSection(
    "secFactura",
    titulo,
    ICONS.factura,
    `<div class="info-grid">${renderInfoGrid(fields)}</div>`,
    false
  );
}

function renderItemsSection(items, esNotaCredito) {
  const itemsRows = items
    .map(
      (item, index) => `
      <tr>
        <td class="col-num">${index + 1}</td>
        <td>${item.codigo}</td>
        <td>${item.descripcion}</td>
        <td class="col-money">${item.cantidad}</td>
        <td class="col-money">${formatMoney(item.precioUnitario)}</td>
        <td class="col-money">${formatMoney(item.iva)}</td>
        <td class="col-money">${formatMoney(item.subtotal)}</td>
      </tr>
    `
    )
    .join("");

  const titulo = esNotaCredito ? "Items nota crédito" : "Items factura";

  const tableHtml = `
    <div class="items-table-wrap">
      <table class="table items-table mb-0">
        <thead>
          <tr>
            <th class="col-num">#</th>
            <th>Código</th>
            <th>Descripción</th>
            <th class="col-money">Cantidad</th>
            <th class="col-money">Precio unitario</th>
            <th class="col-money">IVA</th>
            <th class="col-money">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>
  `;

  return renderAccordionSection("secItems", titulo, ICONS.items, tableHtml, false);
}

function renderNotaCreditoBanner(numeroNotaCredito) {
  return `
    <div class="nota-credito-banner">
      <span class="banner-label">Número de nota crédito</span>
      <span class="banner-value">${numeroNotaCredito}</span>
    </div>
  `;
}

function renderFacturaResult(container, datos, esNotaCredito) {
  if (!container) return;

  const banner = esNotaCredito
    ? renderNotaCreditoBanner(datos.numeroNotaCredito)
    : "";

  container.innerHTML = `
    ${banner}
    <div class="accordion sesiones-accordion" id="sesionesAccordion">
      ${renderEmpresaSection(datos.empresa)}
      ${renderUsuarioSection(datos.usuario)}
      ${renderFacturaSection(datos, esNotaCredito)}
      ${renderItemsSection(datos.items, esNotaCredito)}
    </div>
    <p class="mock-notice mb-0">
      Datos de ejemplo — fase visual. Los valores reales se cargarán desde el backend en la fase 2.
    </p>
  `;
}

function showAlert(container, message, type) {
  if (!container) return;
  container.className = `alert alert-${type} alert-login`;
  container.textContent = message;
  container.classList.remove("d-none");
}

function showResultsMessage(container, type, html) {
  if (!container) return;

  const typeClass =
    type === "warning"
      ? "alert-warning"
      : type === "info"
        ? "alert-info"
        : "alert-secondary";

  container.innerHTML = `
    <div class="results-placeholder">
      <div class="alert ${typeClass} mb-0 text-start" role="alert">
        ${html}
      </div>
    </div>
  `;
}
