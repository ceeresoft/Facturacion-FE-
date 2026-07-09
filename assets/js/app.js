const API_BASE_URL =
  window.APP_CONFIG?.apiBaseUrl ?? "http://localhost:3005";
const SESSION_KEY = "fe-sesion";
const TOKEN_KEY = "fe-token";
const USER_KEY = "fe-user";
const EMPRESA_ACTIVA_KEY = "fe-empresa-activa";
const USUARIO_PERFIL_KEY = "fe-usuario-perfil";

/** Texto visible donde aún no hay integración con backend */
const PENDIENTE_INTEGRAR = "[Pendiente integrar]";

const USUARIO_PERFIL_DEFAULT = {
  tipoDocumento: "",
  identificacion: "",
  nombres: "",
  apellidos: "",
  email: "",
  departamento: "",
  ciudad: "",
  direccion: "",
  telefono: "",
  regimen: "",
};

let tipoEnvioActual = "factura";
let ultimaConsulta = null;
let empresasCatalogo = [];
let empresasCatalogoPromise = null;
let modalUsuarioInstance = null;
let modalEmpresaInstance = null;
let modalPerfilGuardadoInstance = null;
let empresaSeleccionadaId = null;
let ultimaEntidadConsulta = null;
let feModoConfig = { facturaModo: "enviar", notaCreditoModo: "enviar" };
let modalRespuestaInstance = null;
let modalConfirmarInstance = null;
let confirmarResolver = null;

const ACCORDION_IDS = ["secEmpresa", "secUsuario", "secFactura", "secItems"];

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMensajeRespuesta(raw) {
  let text = String(raw ?? "").trim();
  if (!text) return "";

  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  text = textarea.value;

  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/\s*(\[Paso[^\]]+\])/g, "\n\n$1");
  text = text.replace(/\s*(Regla\s+[A-Z0-9]+)/gi, "\n\n$1");

  return escapeHtml(text)
    .replace(/\n/g, "<br>")
    .replace(/\[Paso[^\]]+\]/g, (match) => `<strong>${match}</strong>`);
}

function ensureModalesMensajes() {
  if (document.getElementById("modalRespuesta")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div class="modal fade" id="modalRespuesta" tabindex="-1" aria-labelledby="modalRespuestaLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable modal-lg modal-dialog-centered">
        <div class="modal-content modal-respuesta">
          <div class="modal-header">
            <h5 class="modal-title" id="modalRespuestaLabel">Respuesta</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div id="modalRespuestaBody" class="respuesta-mensaje"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal fade" id="modalConfirmar" tabindex="-1" aria-labelledby="modalConfirmarLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-respuesta">
          <div class="modal-header">
            <h5 class="modal-title" id="modalConfirmarLabel">Confirmar</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <div id="modalConfirmarBody" class="respuesta-mensaje"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" id="btnConfirmarNo" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnConfirmarSi">Continuar</button>
          </div>
        </div>
      </div>
    </div>
    `
  );

  const modalConfirmarEl = document.getElementById("modalConfirmar");
  modalConfirmarEl?.addEventListener("hidden.bs.modal", () => {
    if (confirmarResolver) {
      confirmarResolver(false);
      confirmarResolver = null;
    }
  });

  document.getElementById("btnConfirmarSi")?.addEventListener("click", () => {
    if (confirmarResolver) {
      confirmarResolver(true);
      confirmarResolver = null;
    }
    modalConfirmarInstance?.hide();
  });

  document.getElementById("btnConfirmarNo")?.addEventListener("click", () => {
    if (confirmarResolver) {
      confirmarResolver(false);
      confirmarResolver = null;
    }
  });
}

function showRespuesta(message, { titulo = "Respuesta", tipo = "info" } = {}) {
  ensureModalesMensajes();

  const modalEl = document.getElementById("modalRespuesta");
  const bodyEl = document.getElementById("modalRespuestaBody");
  const titleEl = document.getElementById("modalRespuestaLabel");

  if (!modalEl || !bodyEl) {
    window.alert(message);
    return;
  }

  const pasoMatch = String(message ?? "").match(/^\[([^\]]+)\]/);
  if (pasoMatch && titulo === "Respuesta") {
    titulo = `Error en ${pasoMatch[1]}`;
  }

  if (titleEl) titleEl.textContent = titulo;
  bodyEl.className = `respuesta-mensaje respuesta-${tipo}`;
  bodyEl.innerHTML = formatMensajeRespuesta(message);

  modalRespuestaInstance =
    modalRespuestaInstance || bootstrap.Modal.getOrCreateInstance(modalEl);
  modalRespuestaInstance.show();
}

function showConfirmar(message, { titulo = "Confirmar" } = {}) {
  ensureModalesMensajes();

  const modalEl = document.getElementById("modalConfirmar");
  const bodyEl = document.getElementById("modalConfirmarBody");
  const titleEl = document.getElementById("modalConfirmarLabel");

  if (!modalEl || !bodyEl) {
    return Promise.resolve(window.confirm(message));
  }

  if (titleEl) titleEl.textContent = titulo;
  bodyEl.innerHTML = formatMensajeRespuesta(message);

  modalConfirmarInstance =
    modalConfirmarInstance || bootstrap.Modal.getOrCreateInstance(modalEl);

  return new Promise((resolve) => {
    confirmarResolver = resolve;
    modalConfirmarInstance.show();
  });
}

function initModalesMensajes() {
  ensureModalesMensajes();
}

/**
 * Integraciones pendientes:
 * - Nota crédito: controladorFacturaNotaNC.php
 * - Envío XML / SOAP: generadorXMLFactura.php (líneas 1630+)
 * - Perfil usuario en BD (hoy solo localStorage en consulta)
 */
document.addEventListener("DOMContentLoaded", () => {
  migrarPerfilEmpresaLegacy();
  initModalesMensajes();
  initSession();
  initLogin();
  initLogout();
  initSeleccionEmpresa();
  initCambiarEmpresa();
  initMenuEnvio();
  initBuscarFactura();
  initImprimirFactura();
  initPerfilEmpresa();
  initModalUsuario();
  applyEmpresaNombre();
});

function isSessionActive() {
  return (
    localStorage.getItem(SESSION_KEY) === "true" &&
    Boolean(localStorage.getItem(TOKEN_KEY))
  );
}

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = { ...options.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

function getAuthUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function iniciarSesion(token, user) {
  localStorage.setItem(SESSION_KEY, "true");
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(EMPRESA_ACTIVA_KEY);
}

function cerrarSesion() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EMPRESA_ACTIVA_KEY);
  window.location.href = "login.html";
}

async function validarSesionActiva() {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return false;

    const data = await response.json();
    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    return true;
  } catch {
    return false;
  }
}

function initSession() {
  const requiereAuth = document.body.hasAttribute("data-require-auth");
  const esLogin = document.getElementById("loginForm");

  if (requiereAuth) {
    if (!isSessionActive()) {
      window.location.href = "login.html";
      return;
    }

    validarSesionActiva().then((valida) => {
      if (!valida) {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = "login.html";
      }
    });
    return;
  }

  if (esLogin && isSessionActive()) {
    validarSesionActiva().then((valida) => {
      if (valida) {
        window.location.href = "buscar-factura.html";
      } else {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    });
  }
}

function initLogout() {
  const btn = document.getElementById("btnCerrarSesion");
  if (!btn) return;
  btn.addEventListener("click", cerrarSesion);
}

function migrarPerfilEmpresaLegacy() {
  localStorage.removeItem("fe-empresa-perfil");
  localStorage.removeItem("fe-empresa-perfiles");
}

function getEmpresaActivaId() {
  return localStorage.getItem(EMPRESA_ACTIVA_KEY);
}

function setEmpresaActiva(id) {
  localStorage.setItem(EMPRESA_ACTIVA_KEY, id);
}

function clearEmpresaActiva() {
  localStorage.removeItem(EMPRESA_ACTIVA_KEY);
}

function getEmpresaById(id) {
  return (
    empresasCatalogo.find((empresa) => String(empresa.id) === String(id)) ||
    null
  );
}

async function cargarEmpresasCatalogo() {
  if (empresasCatalogo.length) {
    return empresasCatalogo;
  }

  if (!empresasCatalogoPromise) {
    empresasCatalogoPromise = apiFetch("/api/empresas/catalogo")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "No se pudieron cargar las empresas");
        }
        empresasCatalogo = data.empresas || [];
        return empresasCatalogo;
      })
      .finally(() => {
        empresasCatalogoPromise = null;
      });
  }

  return empresasCatalogoPromise;
}

function getEmpresaActiva() {
  const id = getEmpresaActivaId();
  return id ? getEmpresaById(id) : null;
}

function getEmpresaPerfil() {
  const base = getEmpresaActiva();
  if (!base) {
    return null;
  }

  return {
    ...base,
    nombre: base.nombre,
    documento: base.documento,
    tipoDocumento: base.tipoDocumento,
    direccion: base.direccion ?? "",
    telefono: base.telefono ?? "",
    telefono2: base.telefono2 ?? "",
    email: base.email ?? "",
    email2: base.email2 ?? "",
  };
}

function actualizarEmpresaEnCache(empresa) {
  const index = empresasCatalogo.findIndex(
    (item) => String(item.id) === String(empresa.id)
  );
  if (index >= 0) {
    empresasCatalogo[index] = empresa;
  } else {
    empresasCatalogo.push(empresa);
  }
}

async function guardarEmpresaPerfilEnApi(idEmpresa, data) {
  const response = await apiFetch(`/api/empresas/catalogo/${idEmpresa}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "No se pudo guardar el perfil de la empresa");
  }

  if (payload.empresa) {
    actualizarEmpresaEnCache(payload.empresa);
  }

  return payload.empresa;
}

function applyEmpresaNombre() {
  const activa = getEmpresaActiva();
  const nombre = activa ? activa.nombre : PENDIENTE_INTEGRAR;
  document.querySelectorAll("[data-empresa-nombre]").forEach((el) => {
    el.textContent = nombre;
  });
}

function cargarFormularioEmpresa() {
  const form = document.getElementById("perfilEmpresaForm");
  if (!form) return;

  const perfil = getEmpresaPerfil();
  if (!perfil) return;
  form.querySelector("#perfilNombre").value = perfil.nombre || "";
  form.querySelector("#perfilDocumento").value = perfil.documento || "";
  form.querySelector("#perfilTipoDocumento").value = perfil.tipoDocumento || "";
  form.querySelector("#perfilDireccion").value = perfil.direccion || "";
  form.querySelector("#perfilTelefono").value = perfil.telefono || "";
  form.querySelector("#perfilTelefono2").value = perfil.telefono2 || "";
}

function limpiarResultadosConsulta() {
  ultimaConsulta = null;
  ultimaEntidadConsulta = null;
  const resultsBody = document.getElementById("resultsBody");
  if (!resultsBody) return;
  resetResultsEmpty(resultsBody, tipoEnvioActual === "nota_credito");
}

async function renderEmpresaOptions() {
  const container = document.getElementById("empresaOptionsList");
  if (!container) return;

  const activaId = getEmpresaActivaId();
  empresaSeleccionadaId = activaId;

  container.innerHTML =
    '<p class="text-muted mb-0">Cargando empresas...</p>';

  try {
    const empresas = await cargarEmpresasCatalogo();

    if (!empresas.length) {
      container.innerHTML =
        '<p class="text-muted mb-0">No hay empresas disponibles.</p>';
      actualizarBotonConfirmarEmpresa();
      return;
    }

    container.innerHTML = empresas
      .map(
        (empresa) => `
      <label class="empresa-option${String(empresa.id) === String(activaId) ? " active" : ""}">
        <input
          type="radio"
          name="empresaSeleccion"
          class="empresa-option-input"
          value="${empresa.id}"
          ${String(empresa.id) === String(activaId) ? "checked" : ""}
        >
        <span class="empresa-option-body">
          <span class="empresa-option-nombre">${empresa.nombre}</span>
          <span class="empresa-option-doc">${empresa.tipoDocumento} ${empresa.documento}</span>
        </span>
      </label>
    `
      )
      .join("");

    container.querySelectorAll(".empresa-option-input").forEach((input) => {
      input.addEventListener("change", () => {
        empresaSeleccionadaId = input.value;
        container.querySelectorAll(".empresa-option").forEach((option) => {
          option.classList.toggle(
            "active",
            option.contains(input) && input.checked
          );
        });
        actualizarBotonConfirmarEmpresa();
      });
    });
  } catch (error) {
    container.innerHTML = `<p class="text-danger mb-0">${error.message || "Error al cargar empresas."}</p>`;
  }

  actualizarBotonConfirmarEmpresa();
}

function actualizarBotonConfirmarEmpresa() {
  const btn = document.getElementById("btnConfirmarEmpresa");
  if (btn) {
    btn.disabled = !empresaSeleccionadaId;
  }
}

async function abrirModalSeleccionEmpresa() {
  const modalEl = document.getElementById("modalSeleccionEmpresa");
  if (!modalEl) return;

  await renderEmpresaOptions();
  modalEmpresaInstance =
    modalEmpresaInstance || bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEmpresaInstance.show();
}

function confirmarSeleccionEmpresa() {
  if (!empresaSeleccionadaId) return;

  const anteriorId = getEmpresaActivaId();
  setEmpresaActiva(empresaSeleccionadaId);
  applyEmpresaNombre();
  cargarFormularioEmpresa();

  if (anteriorId && anteriorId !== empresaSeleccionadaId) {
    limpiarResultadosConsulta();
  }

  modalEmpresaInstance?.hide();
  document.dispatchEvent(new CustomEvent("fe-empresa-cambiada"));
}

function initSeleccionEmpresa() {
  const modalEl = document.getElementById("modalSeleccionEmpresa");
  if (!modalEl || !document.body.hasAttribute("data-require-auth")) return;

  const btnConfirmar = document.getElementById("btnConfirmarEmpresa");
  btnConfirmar?.addEventListener("click", confirmarSeleccionEmpresa);

  cargarEmpresasCatalogo()
    .then(() => {
      applyEmpresaNombre();
      if (!getEmpresaActivaId()) {
        abrirModalSeleccionEmpresa();
      }
    })
    .catch(() => {
      if (!getEmpresaActivaId()) {
        abrirModalSeleccionEmpresa();
      }
    });
}

function initCambiarEmpresa() {
  const btn = document.getElementById("btnCambiarEmpresa");
  if (!btn) return;
  btn.addEventListener("click", () => {
    abrirModalSeleccionEmpresa();
  });
}

function initPerfilEmpresa() {
  const form = document.getElementById("perfilEmpresaForm");
  if (!form) return;

  const alertBox = document.getElementById("perfilAlert");
  cargarEmpresasCatalogo().then(() => cargarFormularioEmpresa());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const activa = getEmpresaActiva();
    if (!activa) {
      showPerfilAlert(alertBox, "Seleccione una empresa para continuar.", "warning");
      abrirModalSeleccionEmpresa();
      return;
    }

    const direccion = form.querySelector("#perfilDireccion").value.trim();
    const telefono = form.querySelector("#perfilTelefono").value.trim();
    const telefono2 = form.querySelector("#perfilTelefono2").value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!direccion || !telefono) {
      showPerfilAlert(alertBox, "Complete la dirección y el teléfono principal.", "warning");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Guardando...";
    }

    try {
      await guardarEmpresaPerfilEnApi(activa.id, {
        direccion,
        telefono,
        telefono2,
        email: activa.email || "",
        email2: activa.email2 || "",
      });
      cargarFormularioEmpresa();
      applyEmpresaNombre();
      if (alertBox) {
        alertBox.classList.add("d-none");
      }
      mostrarModalPerfilGuardado(
        "Los datos de la empresa se actualizaron correctamente."
      );
    } catch (error) {
      showPerfilAlert(
        alertBox,
        error.message || "No se pudo guardar el perfil de la empresa.",
        "danger"
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Guardar cambios";
      }
    }
  });
}

function getUsuarioEdiciones() {
  try {
    return JSON.parse(localStorage.getItem(USUARIO_PERFIL_KEY) || "{}");
  } catch {
    return {};
  }
}

function getUsuarioPerfil() {
  return ultimaEntidadConsulta || { ...USUARIO_PERFIL_DEFAULT, ...getUsuarioEdiciones() };
}

function saveUsuarioPerfil(data) {
  localStorage.setItem(USUARIO_PERFIL_KEY, JSON.stringify(data));
}

/** Entidad/responsable de la factura (API). No mezclar documento del usuario logueado. */
function mergeEntidadConEdiciones(entidadApi) {
  const base = entidadApi || {};
  const ediciones = getUsuarioEdiciones();
  const camposDesdeApi = [
    "tipoDocumento",
    "identificacion",
    "nombres",
    "apellidos",
    "nombreCompleto",
  ];

  const merged = { ...base };

  Object.entries(ediciones).forEach(([key, value]) => {
    if (!value || !String(value).trim()) return;

    if (
      camposDesdeApi.includes(key) &&
      base[key] &&
      String(base[key]).trim()
    ) {
      return;
    }

    merged[key] = value;
  });

  return merged;
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
  const { numeroFactura, numeroNotaCredito, esNotaCredito, empresaId } =
    ultimaConsulta;

  if (!empresaId) {
    showResultsMessage(
      resultsBody,
      "warning",
      `${PENDIENTE_INTEGRAR} Falta empresa/resolución para refrescar la consulta.`
    );
    restoreAccordionOpenState(openPanels);
    return;
  }

  consultarFacturaApi(numeroFactura, empresaId)
    .then((data) => {
      const datos = mapApiToViewModel(
        data,
        numeroFactura,
        numeroNotaCredito,
        esNotaCredito
      );
      renderFacturaResult(resultsBody, datos, esNotaCredito);
      restoreAccordionOpenState(openPanels);
    })
    .catch(() => {});
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

function mostrarModalPerfilGuardado(mensaje) {
  const modalEl = document.getElementById("modalPerfilGuardado");
  if (!modalEl) return;

  const mensajeEl = modalEl.querySelector("[data-perfil-guardado-mensaje]");
  if (mensajeEl) {
    mensajeEl.textContent = mensaje;
  }

  modalPerfilGuardadoInstance =
    modalPerfilGuardadoInstance ||
    bootstrap.Modal.getOrCreateInstance(modalEl);
  modalPerfilGuardadoInstance.show();
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const usuario = form.querySelector("#usuario").value.trim();
    const password = form.querySelector("#password").value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!usuario || !password) {
      showAlert(alertBox, "Por favor ingrese usuario y contraseña.", "warning");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Iniciando sesión...";
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        showAlert(
          alertBox,
          data.message || "Credenciales inválidas. Verifique usuario y contraseña.",
          "danger"
        );
        return;
      }

      iniciarSesion(data.token, data.user);
      window.location.href = "buscar-factura.html";
    } catch {
      showAlert(
        alertBox,
        "No se pudo conectar con el servidor. Verifique que el API esté en ejecución (puerto 3005).",
        "danger"
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Iniciar sesión";
      }
    }
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

  const resolucionSelect = document.getElementById("resolucion");
  if (resolucionSelect?.value) {
    cargarFacturasPorResolucion(resolucionSelect.value);
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

async function cargarResoluciones() {
  const select = document.getElementById("resolucion");
  if (!select) return;

  select.innerHTML =
    '<option value="" selected disabled>Cargando resoluciones...</option>';

  try {
    const response = await apiFetch("/api/empresas");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No se pudieron cargar las resoluciones");
    }

    if (!data.empresas?.length) {
      select.innerHTML =
        '<option value="" selected disabled>Sin resoluciones disponibles</option>';
      return;
    }

    select.innerHTML =
      '<option value="" selected disabled>Seleccione una resolución</option>';

    data.empresas.forEach((empresa) => {
      const option = document.createElement("option");
      option.value = empresa.id;
      option.textContent = empresa.label;
      if (empresa.inactiva) {
        option.style.color = "red";
      }
      select.appendChild(option);
    });
  } catch (error) {
    select.innerHTML =
      '<option value="" selected disabled>Error al cargar resoluciones</option>';
    console.error(error);
  }
}

async function cargarFacturasPorResolucion(idEmpresaV) {
  const select = document.getElementById("numeroFactura");
  if (!select) return;

  if (!idEmpresaV) {
    select.innerHTML =
      '<option value="" selected disabled>Seleccione factura</option>';
    return;
  }

  select.innerHTML =
    '<option value="" selected disabled>Cargando facturas...</option>';

  try {
    const esNotaCredito = tipoEnvioActual === "nota_credito";
    const endpoint = esNotaCredito
      ? `/api/empresas/${idEmpresaV}/facturas/anuladas`
      : `/api/empresas/${idEmpresaV}/facturas`;
    const response = await apiFetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No se pudieron cargar las facturas");
    }

    if (!data.facturas?.length) {
      select.innerHTML = esNotaCredito
        ? '<option value="" selected disabled>No hay facturas anuladas enviadas</option>'
        : '<option value="" selected disabled>No hay facturas realizadas</option>';
      return;
    }

    select.innerHTML =
      '<option value="" selected disabled>Seleccione factura</option>';

    data.facturas.forEach((factura) => {
      const option = document.createElement("option");
      option.value = factura.numero;
      option.textContent = factura.numero;
      select.appendChild(option);
    });
  } catch (error) {
    select.innerHTML =
      '<option value="" selected disabled>Error al cargar facturas</option>';
    console.error(error);
  }
}

async function consultarFacturaApi(numeroFactura, empresaId) {
  const response = await apiFetch(
    `/api/facturas/${encodeURIComponent(numeroFactura)}?empresaId=${encodeURIComponent(empresaId)}`
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "No se pudo consultar la factura");
  }

  return data;
}

function xmlFileNameNotaCreditoHint(numeroNota, prefijoNC) {
  const nota = String(numeroNota ?? "").trim();
  const prefijo = String(prefijoNC ?? "").trim();
  return nota && prefijo ? `face_${nota}${prefijo}.xml` : null;
}

function mapApiToViewModel(data, numeroFactura, numeroNotaCredito, esNotaCredito) {
  const factura = data.factura || {};
  const entidad = mergeEntidadConEdiciones(data.usuario);
  ultimaEntidadConsulta = entidad;
  const prefijoNC = factura.prefijoNC || "";
  const xmlFileName = esNotaCredito
    ? xmlFileNameNotaCreditoHint(numeroNotaCredito, prefijoNC)
    : null;

  return {
    empresa: data.empresa || {},
    usuario: entidad,
    estado: factura.estado || "—",
    numeroFactura: factura.numeroFactura || numeroFactura,
    fecha: factura.fecha || "—",
    medioPago: factura.medioPago || "—",
    subtotal: factura.subtotal ?? 0,
    iva: factura.iva ?? 0,
    descuento: factura.descuento ?? 0,
    retencionFuente: factura.retencionFuente ?? 0,
    retencionIva: factura.retencionIva ?? 0,
    otrasRetenciones: factura.otrasRetenciones ?? 0,
    total: factura.total ?? 0,
    items: data.items || [],
    prefijoNC,
    xmlFileName,
    ...(esNotaCredito && numeroNotaCredito ? { numeroNotaCredito } : {}),
  };
}

async function cargarFeModoConfig() {
  try {
    const response = await apiFetch("/api/config/fe-modo");
    const data = await response.json();
    if (response.ok && data.ok) {
      feModoConfig = {
        facturaModo: data.facturaModo || "enviar",
        notaCreditoModo: data.notaCreditoModo || "enviar",
      };
    }
  } catch {
    /* conservar valores por defecto */
  }
}

function getEtiquetaBotonProcesar(esNotaCredito) {
  const modo = esNotaCredito ? feModoConfig.notaCreditoModo : feModoConfig.facturaModo;
  const doc = esNotaCredito ? "nota crédito" : "factura";
  return modo === "solo_xml" ? `Generar XML ${doc}` : `Enviar ${doc} electrónica`;
}

function getHintProcesarFe(esNotaCredito) {
  const modo = esNotaCredito ? feModoConfig.notaCreditoModo : feModoConfig.facturaModo;
  const varName = esNotaCredito ? "FE_NOTA_CREDITO_MODO" : "FE_FACTURA_MODO";
  if (modo === "solo_xml") {
    return `Modo ${varName}=solo_xml: genera y guarda el XML (sin Facturatech).`;
  }
  return `Modo ${varName}=enviar: genera XML, envía a Facturatech y actualiza BD.`;
}

function setFeProcesarStatus(message, tipo = "info") {
  const el = document.getElementById("feProcesarStatus");
  if (!el) return;

  if (!message) {
    el.innerHTML = "";
    el.className = "fe-procesar-status";
    return;
  }

  const alertClass =
    tipo === "success"
      ? "alert-success"
      : tipo === "error"
        ? "alert-danger"
        : tipo === "warning"
          ? "alert-warning"
          : "alert-info";

  el.className = "fe-procesar-status mt-2";
  el.innerHTML = `<div class="alert ${alertClass} mb-0 text-start" role="alert">${formatMensajeRespuesta(message)}</div>`;
}

async function procesarFeDesdeConsulta() {
  if (!ultimaConsulta?.empresaId || !ultimaConsulta?.numeroFactura) {
    const msg =
      "Primero presione «Buscar» y espere los resultados. Luego use «Generar XML».";
    setFeProcesarStatus(msg, "warning");
    showRespuesta(msg, { tipo: "warning" });
    return;
  }

  const esNotaCredito = ultimaConsulta.esNotaCredito;
  if (esNotaCredito && !ultimaConsulta.numeroNotaCredito) {
    const msg = "Ingrese el número de nota crédito y vuelva a buscar.";
    setFeProcesarStatus(msg, "warning");
    showRespuesta(msg, { tipo: "warning" });
    return;
  }

  const etiqueta = esNotaCredito ? "nota crédito" : "factura";
  const modo = esNotaCredito ? feModoConfig.notaCreditoModo : feModoConfig.facturaModo;
  const accion =
    modo === "solo_xml"
      ? "generar el XML"
      : "generar el XML y enviarlo a Facturatech";

  if (modo !== "solo_xml") {
    const confirmar = await showConfirmar(
      `Se procesará la ${etiqueta} electrónica (${accion}). ¿Desea continuar?`
    );
    if (!confirmar) {
      setFeProcesarStatus("Operación cancelada.", "info");
      return;
    }
  }

  const btn = document.getElementById("btnProcesarFe");
  const prevText = btn?.textContent;
  const archivoEsperado =
    ultimaConsulta.xmlFileName ||
    (esNotaCredito
      ? null
      : `face_${ultimaConsulta.numeroFactura}.xml`);

  if (btn) {
    btn.disabled = true;
    btn.textContent = esNotaCredito ? "Generando XML..." : "Procesando...";
  }

  setFeProcesarStatus(
    esNotaCredito
      ? "Generando XML de nota crédito (consulta CUFE si aplica)..."
      : "Generando XML de factura...",
    "info"
  );

  try {
    const { numeroFactura, numeroNotaCredito, empresaId, cufe } = ultimaConsulta;
    const endpoint = esNotaCredito
      ? `/api/notas-credito/${encodeURIComponent(numeroNotaCredito)}/enviar?empresaId=${encodeURIComponent(empresaId)}&numeroFactura=${encodeURIComponent(numeroFactura)}`
      : `/api/facturas/${encodeURIComponent(numeroFactura)}/enviar?empresaId=${encodeURIComponent(empresaId)}`;

    const response = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify(cufe ? { cufe } : {}),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Respuesta inválida del servidor. Revise la carpeta xml/ del proyecto por si el archivo ya se guardó."
      );
    }

    if (!response.ok) {
      throw new Error(data.message || "No se pudo procesar el documento");
    }

    const ruta = data.relativePath || data.fileName || archivoEsperado;
    let mensaje = data.message || "Documento procesado correctamente.";
    if (ruta) {
      const nombre = String(ruta).replace(/^xml\//, "");
      mensaje += `\n\nArchivo guardado en:\nxml/${nombre}`;
    }

    setFeProcesarStatus(mensaje, "success");
    showRespuesta(mensaje, { tipo: "success", titulo: "XML generado" });
  } catch (error) {
    const mensaje = error.message || "Error al procesar el documento electrónico.";
    setFeProcesarStatus(mensaje, "error");
    showRespuesta(mensaje, { tipo: "error", titulo: "Error" });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prevText || getEtiquetaBotonProcesar(esNotaCredito);
    }
  }
}

function initBuscarFactura() {
  const form = document.getElementById("buscarForm");
  if (!form) return;

  const resultsBody = document.getElementById("resultsBody");
  const resolucionSelect = form.querySelector("#resolucion");
  const submitBtn = form.querySelector("#btnBuscar");

  resultsBody?.addEventListener("click", (event) => {
    if (event.target.closest(".btn-procesar-fe")) {
      event.preventDefault();
      procesarFeDesdeConsulta();
    }
  });

  cargarFeModoConfig();
  cargarResoluciones();

  resolucionSelect?.addEventListener("change", () => {
    cargarFacturasPorResolucion(resolucionSelect.value);
    ultimaConsulta = null;
    resetResultsEmpty(resultsBody, tipoEnvioActual === "nota_credito");
  });

  form.addEventListener("submit", async (e) => {
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

    const btnText = submitBtn?.querySelector("#btnBuscarText");
    const prevText = btnText?.textContent;

    if (submitBtn) {
      submitBtn.disabled = true;
    }
    if (btnText) {
      btnText.textContent = "Consultando...";
    }

    try {
      const data = await consultarFacturaApi(numeroFactura, resolucion);
      const datos = mapApiToViewModel(
        data,
        numeroFactura,
        numeroNotaCredito,
        esNotaCredito
      );
      ultimaConsulta = {
        numeroFactura,
        numeroNotaCredito,
        esNotaCredito,
        empresaId: resolucion,
        cufe: null,
        xmlFileName:
          datos.xmlFileName ||
          (esNotaCredito ? null : `face_${numeroFactura}.xml`),
      };
      renderFacturaResult(resultsBody, datos, esNotaCredito);
      setFeProcesarStatus(
        esNotaCredito && datos.xmlFileName
          ? `Listo. Al generar XML se guardará en xml/${datos.xmlFileName}`
          : esNotaCredito
            ? "Consulta lista. Presione «Generar XML nota crédito»."
            : `Listo. Al generar XML se guardará en xml/face_${numeroFactura}.xml`,
        "info"
      );
    } catch (error) {
      ultimaConsulta = null;
      showResultsMessage(
        resultsBody,
        "warning",
        error.message || "Error al consultar la factura."
      );
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
      if (btnText && prevText) {
        btnText.textContent = prevText;
      }
    }
  });
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

function renderEmpresaSection(empresa = {}) {
  const telefonos = empresa.telefono2
    ? `${empresa.telefono} / ${empresa.telefono2}`
    : empresa.telefono;

  const fields = [
    { label: "Tipo documento", value: displayValue(empresa.tipoDocumento) },
    { label: "Documento", value: displayValue(empresa.documento) },
    { label: "Razón Social", value: displayValue(empresa.razonSocial) },
    { label: "Dirección", value: displayValue(empresa.direccion) },
    { label: "Teléfonos", value: displayValue(telefonos) },
    { label: "Departamento", value: displayValue(empresa.departamento) },
    { label: "Ciudad", value: displayValue(empresa.ciudad) },
    { label: "Barrio", value: displayValue(empresa.barrio) },
    { label: "E-mail", value: displayValue(empresa.email) },
    { label: "Régimen", value: displayValue(empresa.regimen) },
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
    "Información del responsable",
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

function renderNotaCreditoBanner(numeroNotaCredito, xmlFileName) {
  const archivoHint = xmlFileName
    ? `<span class="banner-hint text-muted small d-block mt-1">Archivo XML: xml/${xmlFileName}</span>`
    : "";
  return `
    <div class="nota-credito-banner">
      <span class="banner-label">Número de nota crédito</span>
      <span class="banner-value">${numeroNotaCredito}</span>
      ${archivoHint}
    </div>
  `;
}

function renderFacturaResult(container, datos, esNotaCredito) {
  if (!container) return;

  const banner = esNotaCredito
    ? renderNotaCreditoBanner(datos.numeroNotaCredito, datos.xmlFileName)
    : "";

  const avisoIntegracion = esNotaCredito
    ? `<p class="integracion-notice mb-3 text-muted small">Datos de la factura anulada referenciada. El XML se guarda en la carpeta <strong>xml/</strong> del proyecto (ej. <code>xml/face_1NC.xml</code>).</p>`
    : `<p class="integracion-notice mb-3 text-muted small">El XML se guarda en la carpeta <strong>xml/</strong> del proyecto (ej. <code>xml/face_${datos.numeroFactura}.xml</code>).</p>`;

  const accionesXml = `<div class="results-actions mt-3">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <button type="button" class="btn btn-primary btn-procesar-fe" id="btnProcesarFe">
            ${getEtiquetaBotonProcesar(esNotaCredito)}
          </button>
          <span class="text-muted small">${getHintProcesarFe(esNotaCredito)}</span>
        </div>
        <div id="feProcesarStatus" class="fe-procesar-status"></div>
      </div>`;

  container.innerHTML = `
    ${banner}
    ${avisoIntegracion}
    <div class="accordion sesiones-accordion" id="sesionesAccordion">
      ${renderEmpresaSection(datos.empresa)}
      ${renderUsuarioSection(datos.usuario)}
      ${renderFacturaSection(datos, esNotaCredito)}
      ${renderItemsSection(datos.items, esNotaCredito)}
    </div>
    ${accionesXml}
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

let modalPdfFacturaInstance = null;
let pdfPreviewBlobUrl = null;
let pdfPreviewNumero = null;
let pdfPreviewPrefijo = "";

function limpiarPdfPreview() {
  if (pdfPreviewBlobUrl) {
    URL.revokeObjectURL(pdfPreviewBlobUrl);
    pdfPreviewBlobUrl = null;
  }
  const frame = document.getElementById("pdfPreviewFrame");
  if (frame) {
    frame.removeAttribute("src");
  }
}

async function fetchPdfFacturaBlob(numero, empresaId, disposition = "inline") {
  const response = await apiFetch(
    `/api/facturas/${encodeURIComponent(numero)}/pdf?empresaId=${encodeURIComponent(empresaId)}&disposition=${disposition}`
  );

  if (!response.ok) {
    let message = "No se pudo obtener el PDF";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(message);
  }

  return response.blob();
}

function descargarBlobComoPdf(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function verPdfFactura(numero, prefijo) {
  const empresaId = getEmpresaActivaId();
  if (!empresaId) {
    showRespuesta("Seleccione una empresa para continuar.", { tipo: "warning" });
    return;
  }

  const modalEl = document.getElementById("modalPdfFactura");
  const frame = document.getElementById("pdfPreviewFrame");
  const title = document.getElementById("modalPdfFacturaLabel");
  if (!modalEl || !frame) return;

  if (title) {
    title.textContent = `Factura ${prefijo}${numero}`;
  }

  limpiarPdfPreview();
  frame.setAttribute("srcdoc", "<p style='padding:1rem;font-family:sans-serif'>Cargando PDF…</p>");

  modalPdfFacturaInstance =
    modalPdfFacturaInstance || bootstrap.Modal.getOrCreateInstance(modalEl);
  modalPdfFacturaInstance.show();

  try {
    const blob = await fetchPdfFacturaBlob(numero, empresaId, "inline");
    pdfPreviewNumero = numero;
    pdfPreviewPrefijo = prefijo || "";
    pdfPreviewBlobUrl = URL.createObjectURL(blob);
    frame.removeAttribute("srcdoc");
    frame.src = pdfPreviewBlobUrl;
  } catch (error) {
    modalPdfFacturaInstance.hide();
    showRespuesta(error.message || "Error al cargar el PDF.", { tipo: "error", titulo: "Error" });
  }
}

async function descargarPdfFactura(numero, prefijo) {
  const empresaId = getEmpresaActivaId();
  if (!empresaId) {
    showRespuesta("Seleccione una empresa para continuar.", { tipo: "warning" });
    return;
  }

  try {
    const blob = await fetchPdfFacturaBlob(numero, empresaId, "attachment");
    descargarBlobComoPdf(blob, `factura_${prefijo}${numero}.pdf`);
  } catch (error) {
    showRespuesta(error.message || "Error al descargar el PDF.", { tipo: "error", titulo: "Error" });
  }
}

function renderFacturasElectronicas(container, facturas) {
  if (!container) return;

  if (!facturas.length) {
    container.innerHTML = `
      <div class="results-empty">
        <p>No hay facturas electrónicas enviadas para esta empresa.</p>
      </div>
    `;
    return;
  }

  const rows = facturas
    .map(
      (factura) => `
      <tr>
        <td>${factura.prefijo}${factura.numero}</td>
        <td>${factura.numero}</td>
        <td>${factura.prefijo || "—"}</td>
        <td>${factura.fecha || "—"}</td>
        <td class="fe-actions-cell">
          <button type="button" class="btn btn-sm btn-outline-primary btn-ver-pdf" data-numero="${factura.numero}" data-prefijo="${factura.prefijo}">
            Ver PDF
          </button>
          <button type="button" class="btn btn-sm btn-primary btn-descargar-pdf" data-numero="${factura.numero}" data-prefijo="${factura.prefijo}">
            Descargar
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  container.innerHTML = `
    <div class="items-table-wrap">
      <table class="table items-table mb-0">
        <thead>
          <tr>
            <th>Comprobante</th>
            <th>Número</th>
            <th>Prefijo</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll(".btn-ver-pdf").forEach((btn) => {
    btn.addEventListener("click", () => {
      verPdfFactura(btn.dataset.numero, btn.dataset.prefijo || "");
    });
  });

  container.querySelectorAll(".btn-descargar-pdf").forEach((btn) => {
    btn.addEventListener("click", () => {
      descargarPdfFactura(btn.dataset.numero, btn.dataset.prefijo || "");
    });
  });
}

async function cargarFacturasElectronicas() {
  const container = document.getElementById("facturasElectronicasBody");
  if (!container) return;

  const empresaId = getEmpresaActivaId();
  if (!empresaId) {
    container.innerHTML = `
      <div class="results-empty">
        <p>Seleccione una empresa para ver las facturas enviadas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="results-empty">
      <p>Cargando facturas electrónicas…</p>
    </div>
  `;

  try {
    const response = await apiFetch(
      `/api/empresas/${encodeURIComponent(empresaId)}/facturas/electronicas`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No se pudieron cargar las facturas");
    }

    renderFacturasElectronicas(container, data.facturas || []);
  } catch (error) {
    container.innerHTML = `
      <div class="results-empty">
        <p class="text-danger mb-0">${error.message || "Error al cargar facturas."}</p>
      </div>
    `;
  }
}

function initImprimirFactura() {
  if (document.body.dataset.page !== "imprimir-factura") return;

  const modalEl = document.getElementById("modalPdfFactura");
  modalEl?.addEventListener("hidden.bs.modal", limpiarPdfPreview);

  document.getElementById("btnRecargarFacturasElectronicas")?.addEventListener(
    "click",
    cargarFacturasElectronicas
  );

  document.getElementById("btnDescargarPdfModal")?.addEventListener("click", async () => {
    if (!pdfPreviewNumero) return;
    try {
      const blob = await fetchPdfFacturaBlob(
        pdfPreviewNumero,
        getEmpresaActivaId(),
        "attachment"
      );
      descargarBlobComoPdf(
        blob,
        `factura_${pdfPreviewPrefijo}${pdfPreviewNumero}.pdf`
      );
    } catch (error) {
      showRespuesta(error.message || "Error al descargar el PDF.", { tipo: "error", titulo: "Error" });
    }
  });

  document.addEventListener("fe-empresa-cambiada", cargarFacturasElectronicas);

  cargarEmpresasCatalogo()
    .then(() => {
      if (getEmpresaActivaId()) {
        cargarFacturasElectronicas();
      }
    })
    .catch(() => {
      if (getEmpresaActivaId()) {
        cargarFacturasElectronicas();
      }
    });
}
