/**
 * Construcción del XML de factura electrónica (esquema FACTURA / Facturatech).
 *
 * Migrado desde `Ceere_face_VFacturaTechLeon/controlador/generadorXMLFactura.php`.
 * Recibe el objeto normalizado de `cargarDatosXmlFactura()` y devuelve el XML
 * como string UTF-8 listo para guardar o enviar a la DIAN.
 *
 * Estructura principal del documento:
 *   FACTURA
 *     ENC  → Encabezado (tipo documento, emisor, adquiriente, fechas)
 *     EMI  → Emisor (empresa prestadora)
 *     ADQ  → Adquiriente / responsable de pago (entidad o paciente)
 *     ANT  → Anticipos (solo facturas prepagadas SS01)
 *     TOT  → Totales monetarios
 *     TIM  → Impuestos consolidados (IVA)
 *     DSC  → Descuentos generales
 *     DRF  → Resolución DIAN de numeración
 *     NOT  → Observaciones
 *     MEP  → Medio y forma de pago
 *     ITE  → Líneas de detalle (ítems)
 *     CSL  → Sector salud (código prestador, tipo operación)
 *
 * Convención de campos: los tags (ENC_1, EMI_6, etc.) siguen el diccionario
 * del proveedor tecnológico; no se renombran para mantener compatibilidad.
 */

import { create } from "xmlbuilder2";
import { appendFlat, txt } from "./xmlHelpers.js";

/**
 * Bloque ADQ para persona natural (cédula, tarjeta de identidad, etc.).
 * tipoDocE !== 31 → se usan nombres y apellidos separados (ADQ_8, ADQ_9).
 */
function buildAdqNatural(bloqueAdquiriente, adquiriente) {
  appendFlat(bloqueAdquiriente, [
    ["ADQ_6", `${adquiriente.pNomE} ${adquiriente.sNomE} ${adquiriente.pApeE} ${adquiriente.sApeE}`.trim()],
    ["ADQ_8", `${adquiriente.pNomE} ${adquiriente.sNomE}`.trim()],
    ["ADQ_9", `${adquiriente.pApeE} ${adquiriente.sApeE}`.trim()],
    ["ADQ_10", adquiriente.direccionE],
    ["ADQ_11", adquiriente.departE],
    ["ADQ_12", ""],
    ["ADQ_13", adquiriente.ciudadE],
    ["ADQ_14", ""],
    ["ADQ_15", adquiriente.codigoPaisEnt],
    ["ADQ_19", adquiriente.nombreDepartamentoEnt],
    ["ADQ_21", adquiriente.nombrePaisEnt],
    ["ADQ_23", adquiriente.codigoCiudad],
  ]);
}

/**
 * Bloque ADQ para persona jurídica (NIT, tipoDocE = 31).
 * Usa razón social en ADQ_6/ADQ_7 e incluye dígito de verificación (ADQ_22).
 */
function buildAdqJuridico(bloqueAdquiriente, adquiriente) {
  appendFlat(bloqueAdquiriente, [
    ["ADQ_6", `${adquiriente.pNomE} ${adquiriente.sNomE}`.trim()],
    ["ADQ_7", `${adquiriente.pNomE} ${adquiriente.sNomE}`.trim()],
    ["ADQ_10", adquiriente.direccionE],
    ["ADQ_11", adquiriente.departE],
    ["ADQ_12", ""],
    ["ADQ_13", adquiriente.ciudadE],
    ["ADQ_14", ""],
    ["ADQ_15", adquiriente.codigoPaisEnt],
    ["ADQ_19", adquiriente.nombreDepartamentoEnt],
    ["ADQ_21", adquiriente.paisE],
    ["ADQ_22", adquiriente.digitoVerificacion],
    ["ADQ_23", adquiriente.codigoCiudad],
  ]);
}

/**
 * Impuesto IVA por línea de detalle (nodos TII + IIM dentro de ITE).
 * Solo se emite si el ítem tiene porcentaje de IVA mayor a cero.
 */
function buildItemIva(nodoItem, lineaDetalle) {
  if (asNumber(lineaDetalle.PorcentajeIvaItem) <= 0) return;

  const nodoImpuestoItem = nodoItem.ele("TII");
  appendFlat(nodoImpuestoItem, [
    ["TII_1", lineaDetalle.ValorIvaItem],
    ["TII_2", "COP"],
    ["TII_3", "false"],
  ]);

  const nodoDetalleImpuesto = nodoImpuestoItem.ele("IIM");
  appendFlat(nodoDetalleImpuesto, [
    ["IIM_1", "01"], // Código impuesto: 01 = IVA
    ["IIM_2", lineaDetalle.ValorIvaItem],
    ["IIM_3", "COP"],
    ["IIM_4", lineaDetalle.ValorItem],
    ["IIM_5", "COP"],
    ["IIM_6", lineaDetalle.PorcentajeIvaItem],
  ]);
}

/** Convierte a número; devuelve 0 si el valor no es numérico. */
function asNumber(value) {
  const numero = Number(value);
  return Number.isNaN(numero) ? 0 : numero;
}

/**
 * Montos por ítem según tipo de factura de salud.
 * SS01 (prepagada/recaudo): usa ValorConCopago en lugar de ValorItem/ValorTotalItem.
 */
function calcularMontosItem(lineaDetalle, tipoFactura) {
  const esPrepagada = tipoFactura === "SS01";
  return {
    total: esPrepagada ? lineaDetalle.ValorConCopago : lineaDetalle.ValorTotalItem,
    unitario: esPrepagada ? lineaDetalle.ValorConCopago : lineaDetalle.ValorItem,
    linea: esPrepagada ? lineaDetalle.ValorConCopago : lineaDetalle.ValorTotalItem,
  };
}

/**
 * Arma el XML completo de una factura electrónica.
 *
 * @param {object} datosXml - Resultado de `cargarDatosXmlFactura()`
 * @param {string} datosXml.tipoFactura - Código sector salud: SS01, SS06, SS07, etc.
 * @param {object} datosXml.factura - Totales, fechas, prefijo y número
 * @param {object} datosXml.empresa - Datos del emisor y resolución DIAN
 * @param {object} datosXml.entidad - Responsable / adquiriente
 * @param {Array}  datosXml.items - Líneas de detalle
 * @param {Array}  datosXml.impuestos - Bases e IVA consolidados
 * @param {Array}  datosXml.baseImponible - Totales base imponible (TOT_3)
 * @param {number} [datosXml.totalAnticipos] - Suma copagos prepagados (SS01)
 * @param {string} [datosXml.observaciones] - Texto libre de la factura
 * @returns {string} XML con formato legible (prettyPrint)
 */
export function buildFacturaXml(datosXml) {
  const {
    tipoFactura,
    factura,
    empresa: emisor,
    entidad: adquiriente,
    items,
    impuestos,
    baseImponible,
    totalAnticipos,
    observaciones,
  } = datosXml;

  // Documento de identificación del adquiriente según tipo (NIT vs cédula)
  const documentoAdquiriente =
    Number(adquiriente.tipoDocE) === 31
      ? txt(adquiriente.documentoNit)
      : txt(adquiriente.docE);

  const documento = create({ version: "1.0", encoding: "UTF-8" }).ele("FACTURA");

  // ─── ENC: Encabezado del documento electrónico ───────────────────────────
  const encabezado = documento.ele("ENC");
  appendFlat(encabezado, [
    ["ENC_1", "INVOIC"], // Tipo UBL: factura de venta
    ["ENC_2", emisor.documentoSinDigito], // NIT emisor sin DV
    ["ENC_3", adquiriente.documentoNit ?? documentoAdquiriente], // Documento adquiriente
    ["ENC_4", "UBL 2.1"],
    ["ENC_5", "DIAN 2.1"],
    ["ENC_6", `${factura.prefijoF}${factura.numF}`], // Número completo con prefijo
    ["ENC_7", factura.fechaF], // Fecha emisión (YYYY-MM-DD)
    ["ENC_8", `${factura.horaF}-05:00`], // Hora con zona horaria Colombia
    ["ENC_9", "01"], // Tipo operación
    ["ENC_10", "COP"],
    ["ENC_11", factura.fechaF2], // Fecha/hora emisión ISO
    ["ENC_12", factura.fechaVencimiento2], // Vencimiento
  ]);

  // ─── EMI: Emisor (empresa / prestador de servicios de salud) ─────────────
  const bloqueEmisor = documento.ele("EMI");
  appendFlat(bloqueEmisor, [
    ["EMI_1", emisor.codigoTipoEmp],
    ["EMI_2", emisor.documentoSinDigito],
    ["EMI_3", emisor.tipoDocumentoEmpresa],
    ["EMI_4", "49"], // Responsabilidad fiscal emisor
    ["EMI_6", emisor.nombreEmpresa],
    ["EMI_7", emisor.nombreEmpresa],
    ["EMI_8", ""],
    ["EMI_9", ""],
    ["EMI_10", emisor.direccionEmpresa],
    ["EMI_11", emisor.codigoDepartamentoEmpresa],
    ["EMI_13", emisor.nombreCiudadEmpresa],
    ["EMI_14", emisor.codigoCiudadEmp],
    ["EMI_15", emisor.codigoPaisEmp],
    ["EMI_19", emisor.nombreDepartamentoEmpresa],
    ["EMI_21", emisor.nombrePaisEmp],
    ["EMI_22", emisor.digitoVerificacionEm],
    ["EMI_23", emisor.codigoCiudadEmp],
    ["EMI_24", emisor.nombreEmpresa],
  ]);

  // TAC: Régimen tributario del emisor (valor fijo del sistema legado)
  const regimenEmisor = bloqueEmisor.ele("TAC");
  regimenEmisor.ele("TAC_1").txt("R-99-PN");

  // DFE: Dirección fiscal del emisor
  const direccionFiscalEmisor = bloqueEmisor.ele("DFE");
  appendFlat(direccionFiscalEmisor, [
    ["DFE_1", emisor.codigoCiudadEmp],
    ["DFE_2", emisor.codigoDepartamentoEmpresa],
    ["DFE_3", emisor.codigoPaisEmp],
    ["DFE_4", ""],
    ["DFE_5", emisor.nombrePaisEmp],
    ["DFE_6", emisor.nombreDepartamentoEmpresa],
    ["DFE_7", emisor.nombreCiudadEmpresa],
    ["DFE_8", emisor.direccionEmpresa],
  ]);

  // ICC / CDE / GTE: prefijo, contacto y obligaciones tributarias del emisor
  const prefijoEmisor = bloqueEmisor.ele("ICC");
  prefijoEmisor.ele("ICC_1");
  prefijoEmisor.ele("ICC_9").txt(factura.prefijoF);

  const contactoEmisor = bloqueEmisor.ele("CDE");
  appendFlat(contactoEmisor, [
    ["CDE_1", "1"],
    ["CDE_2", "No definido"],
    ["CDE_3", emisor.telefonoEmp],
    ["CDE_4", emisor.emailEmpresa],
  ]);

  const tributosEmisor = bloqueEmisor.ele("GTE");
  appendFlat(tributosEmisor, [
    ["GTE_1", "01"],
    ["GTE_2", "IVA"],
  ]);

  // ─── ADQ: Adquiriente (EPS, particular o responsable del pago) ───────────
  const bloqueAdquiriente = documento.ele("ADQ");
  appendFlat(bloqueAdquiriente, [
    ["ADQ_1", adquiriente.tipoPersona], // 1 jurídica, 2 natural
    ["ADQ_2", documentoAdquiriente],
    ["ADQ_3", adquiriente.tipoDocE], // Código tipo documento DIAN
    ["ADQ_4", adquiriente.responsableIva], // 48 = responsable IVA, ZZ = no responsable
  ]);

  if (Number(adquiriente.tipoDocE) === 31) {
    buildAdqJuridico(bloqueAdquiriente, adquiriente);
  } else {
    buildAdqNatural(bloqueAdquiriente, adquiriente);
  }

  const regimenAdquiriente = bloqueAdquiriente.ele("TCR");
  regimenAdquiriente.ele("TCR_1").txt("R-99-PN");

  // ILA: Información legal del adquiriente (nombre completo + documento)
  const infoLegalAdquiriente = bloqueAdquiriente.ele("ILA");
  appendFlat(infoLegalAdquiriente, [
    [
      "ILA_1",
      `${adquiriente.pNomE} ${adquiriente.sNomE} ${adquiriente.pApeE} ${adquiriente.sApeE}`.trim(),
    ],
    ["ILA_2", documentoAdquiriente],
    ["ILA_3", adquiriente.tipoDocE],
  ]);
  if (Number(adquiriente.tipoDocE) === 31) {
    infoLegalAdquiriente.ele("ILA_4").txt(txt(adquiriente.digitoVerificacion));
  }

  // DFA / CDA / GTA: dirección, contacto y tributos del adquiriente
  const direccionFiscalAdquiriente = bloqueAdquiriente.ele("DFA");
  appendFlat(direccionFiscalAdquiriente, [
    ["DFA_1", adquiriente.codigoPaisEnt],
    ["DFA_2", adquiriente.departE],
    ["DFA_3", adquiriente.paisE],
    ["DFA_4", adquiriente.codigoCiudad],
    ["DFA_5", adquiriente.nombrePaisEnt],
    ["DFA_6", adquiriente.nombreDepartamentoEnt],
    ["DFA_7", adquiriente.ciudadE],
    ["DFA_8", adquiriente.direccionE],
  ]);

  const contactoAdquiriente = bloqueAdquiriente.ele("CDA");
  appendFlat(contactoAdquiriente, [
    ["CDA_1", "1"],
    ["CDA_2", "No definido"],
    ["CDA_3", adquiriente.telefonoEntidad],
    ["CDA_4", adquiriente.emailE],
  ]);

  const tributosAdquiriente = bloqueAdquiriente.ele("GTA");
  appendFlat(tributosAdquiriente, [
    ["GTA_1", "01"],
    ["GTA_2", "IVA"],
  ]);

  // ─── ANT: Anticipos / copagos prepagados (solo SS01 con recaudo) ─────────
  if (tipoFactura === "SS01" && totalAnticipos > 0) {
    const bloqueAnticipos = documento.ele("ANT");
    appendFlat(bloqueAnticipos, [
      ["ANT_1", totalAnticipos],
      ["ANT_2", "COP"],
      ["ANT_3", factura.fechaF],
      ["ANT_4", factura.horaCreacion],
      ["ANT_5", "1"],
      ["ANT_6", factura.fechaF],
      ["ANT_7", "Atencion Pacientes"],
      ["ANT_8", "01"],
    ]);
  }

  // ─── TOT: Totales de la factura ──────────────────────────────────────────
  // La lógica replica el PHP: SS01 suma anticipos en TOT_1/TOT_7/TOT_13.
  const bloqueTotales = documento.ele("TOT");
  const totalBrutoConAnticipos =
    tipoFactura === "SS01"
      ? factura.totalBrutoDesc + totalAnticipos
      : factura.totalBrutoDesc;
  bloqueTotales.ele("TOT_1").txt(txt(totalBrutoConAnticipos));
  bloqueTotales.ele("TOT_2").txt("COP");

  if (factura.ivaF !== 0) {
    baseImponible.forEach((filaBase) => {
      bloqueTotales.ele("TOT_3").txt(txt(filaBase.TotalBaseImponible));
    });
  } else {
    bloqueTotales.ele("TOT_3").txt("0");
  }
  bloqueTotales.ele("TOT_4").txt("COP");

  const tieneRetenciones =
    factura.porceReteFuente !== 0 ||
    factura.porceReteIva !== 0 ||
    factura.porceReteIca !== 0;

  if (tieneRetenciones) {
    bloqueTotales.ele("TOT_5").txt(txt(factura.totalBrutoImpDesc));
  } else if (tipoFactura === "SS01") {
    bloqueTotales.ele("TOT_5").txt(txt(factura.totF));
  } else {
    bloqueTotales.ele("TOT_5").txt(txt(factura.totF));
  }
  bloqueTotales.ele("TOT_6").txt("COP");

  if (factura.descuentoGeneral !== 0 || tieneRetenciones) {
    const totalConDescuentoOImpuestos =
      tipoFactura === "SS01"
        ? factura.totalBrutoImpDesc + totalAnticipos
        : factura.totalBrutoImpDesc;
    bloqueTotales.ele("TOT_7").txt(txt(totalConDescuentoOImpuestos));
  } else if (tipoFactura === "SS01") {
    bloqueTotales
      .ele("TOT_7")
      .txt(txt(factura.totalBrutoDesc + totalAnticipos));
  } else {
    bloqueTotales.ele("TOT_7").txt(txt(factura.totF));
  }
  bloqueTotales.ele("TOT_8").txt("COP");

  if (factura.descuentoGeneral !== 0) {
    bloqueTotales.ele("TOT_9").txt(txt(factura.descuentoGeneral));
    bloqueTotales.ele("TOT_10").txt("COP");
  }

  if (tipoFactura === "SS01") {
    bloqueTotales.ele("TOT_13").txt(txt(totalAnticipos));
    bloqueTotales.ele("TOT_14").txt("COP");
  }

  if (tieneRetenciones) {
    bloqueTotales.ele("TOT_15").txt(txt(factura.totalBrutoImpDesc));
    bloqueTotales.ele("TOT_16").txt("COP");
  }

  // ─── TIM: Impuestos consolidados (IVA por tarifa) ────────────────────────
  if (factura.ivaF !== 0 || factura.reteFuente !== 0 || factura.reteIva !== 0) {
    const bloqueImpuestos = documento.ele("TIM");
    if (factura.ivaF !== 0) {
      impuestos.forEach((filaImpuesto) => {
        appendFlat(bloqueImpuestos, [
          ["TIM_1", "false"],
          ["TIM_2", filaImpuesto.ValorIva],
          ["TIM_3", "COP"],
        ]);
        const detalleImpuesto = bloqueImpuestos.ele("IMP");
        appendFlat(detalleImpuesto, [
          ["IMP_1", "01"],
          ["IMP_2", filaImpuesto.base],
          ["IMP_3", "COP"],
          ["IMP_4", filaImpuesto.ValorIva],
          ["IMP_5", "COP"],
          ["IMP_6", filaImpuesto["Valor Iva % FacturaII"]],
        ]);
      });
    }
  }

  // ─── DSC: Descuento general a nivel de factura ───────────────────────────
  if (factura.descuentoGeneral !== 0) {
    const bloqueDescuentos = documento.ele("DSC");
    appendFlat(bloqueDescuentos, [
      ["DSC_1", "false"],
      ["DSC_2", factura.porcentajeDescuento],
      ["DSC_3", factura.descuentoGeneral],
      ["DSC_4", "COP"],
      ["DSC_5", "09"],
      ["DSC_6", "Descuento General"],
      ["DSC_7", factura.totalBrutoImpDesc],
      ["DSC_8", "COP"],
      ["DSC_10", "1"],
    ]);
  }

  // ─── DRF: Resolución de facturación DIAN ─────────────────────────────────
  const bloqueResolucion = documento.ele("DRF");
  appendFlat(bloqueResolucion, [
    ["DRF_1", emisor.resolucionEmpresa],
    ["DRF_2", emisor.fechaIniReso],
    ["DRF_3", emisor.fechaFinalReso],
    ["DRF_4", factura.prefijoF],
    ["DRF_5", emisor.numeroInicioReso],
    ["DRF_6", emisor.numeroFinReso],
  ]);

  // ─── NOT / MEP: Observaciones y condiciones de pago ──────────────────────
  const bloqueObservaciones = documento.ele("NOT");
  bloqueObservaciones.ele("NOT_1").txt(txt(observaciones));

  const bloqueMediosPago = documento.ele("MEP");
  appendFlat(bloqueMediosPago, [
    ["MEP_1", factura.formaPago.formadePagoFac],
    ["MEP_2", factura.formaPago.medioPagoF],
    ["MEP_3", factura.fechaVencimiento],
  ]);

  // ─── ITE: Líneas de detalle (una por ítem de la factura) ─────────────────
  let numeroLinea = 1;
  items.forEach((lineaDetalle) => {
    const montosItem = calcularMontosItem(lineaDetalle, tipoFactura);
    const nodoItem = documento.ele("ITE");
    appendFlat(nodoItem, [
      ["ITE_1", numeroLinea],
      ["ITE_3", lineaDetalle.CantidadItem],
      ["ITE_4", "C62"], // Unidad de medida: unidad
      ["ITE_5", montosItem.total],
      ["ITE_6", "COP"],
      ["ITE_7", montosItem.unitario],
      ["ITE_8", "COP"],
      ["ITE_10", lineaDetalle.DescripcionItem],
      ["ITE_11", lineaDetalle.DescripcionItem],
      ["ITE_19", montosItem.linea],
      ["ITE_20", "COP"],
      ["ITE_21", montosItem.linea],
      ["ITE_22", "COP"],
      ["ITE_27", lineaDetalle.CantidadItem],
      ["ITE_28", "C62"],
    ]);

    // SS07: facturas de medicamentos / insumos con referencia adicional
    if (tipoFactura === "SS07") {
      const referenciaDetalle = nodoItem.ele("RFD");
      referenciaDetalle.ele("RFD_1").txt("1");
    }

    // IAE: Código del producto o servicio (estándar 999 = propio)
    const codigoItem = nodoItem.ele("IAE");
    appendFlat(codigoItem, [
      ["IAE_1", lineaDetalle.codigoObjetoItem ?? ""],
      ["IAE_2", "999"],
    ]);

    buildItemIva(nodoItem, lineaDetalle);
    numeroLinea += 1;
  });

  // Campos ENC que dependen del total de ítems (se agregan al final, como en PHP)
  const totalLineas = Math.max(numeroLinea - 1, 0);
  encabezado.ele("ENC_15").txt(txt(totalLineas));
  encabezado.ele("ENC_16").txt(factura.fechaVencimiento);
  encabezado.ele("ENC_20").txt("1");
  encabezado.ele("ENC_21").txt(tipoFactura); // Código tipo factura sector salud

  // ─── CSL: Sector salud (código REPS del prestador) ───────────────────────
  // No aplica para SS07 (medicamentos); SLD_2 y SLD_3 varían según tipoFactura.
  if (tipoFactura !== "SS07") {
    const bloqueSectorSalud = documento.ele("CSL");
    const datosSectorSalud = bloqueSectorSalud.ele("SLD");
    datosSectorSalud.ele("SLD_1").txt(txt(factura.codigoPrestador));

    if (tipoFactura === "SS06") {
      datosSectorSalud.ele("SLD_2").txt("04"); // Copago / particular
    } else if (tipoFactura === "SS01") {
      datosSectorSalud.ele("SLD_2").txt("03"); // Prepagada / recaudo
    } else {
      datosSectorSalud.ele("SLD_2").txt("01"); // Factura a EPS u otros
    }

    if (tipoFactura === "SS01") {
      datosSectorSalud.ele("SLD_3").txt("11");
    } else {
      datosSectorSalud.ele("SLD_3").txt("12");
    }

    datosSectorSalud.ele("SLD_4").txt("0");
    datosSectorSalud.ele("SLD_6").txt(emisor.nombreEmpresa);
  }

  return documento.end({ prettyPrint: true });
}
