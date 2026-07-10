/**
 * Construcción del XML de nota crédito electrónica (esquema NOTA / Facturatech).
 *
 * Migrado desde `Ceere_face_VFacturaTechLeon/controlador/generadorXMLFacturaNotaNC.php`.
 */

import { create } from "xmlbuilder2";
import { appendFlat, resolverCodigoMunicipioDian, txt } from "./xmlHelpers.js";

function codigoMunicipioEmisor(emisor) {
  return resolverCodigoMunicipioDian(
    emisor.codigoCiudadEmp,
    emisor.codigoDepartamentoEmpresa
  );
}

function codigoMunicipioAdquiriente(adquiriente) {
  return resolverCodigoMunicipioDian(
    adquiriente.codigoCiudad,
    adquiriente.departE
  );
}

function asNumber(value) {
  const numero = Number(value);
  return Number.isNaN(numero) ? 0 : numero;
}

function round2(value) {
  return Math.round(asNumber(value) * 100) / 100;
}

function buildAdqNaturalNc(bloqueAdquiriente, adquiriente) {
  appendFlat(bloqueAdquiriente, [
    [
      "ADQ_6",
      `${adquiriente.pNomE} ${adquiriente.sNomE} ${adquiriente.pApeE} ${adquiriente.sApeE}`.trim(),
    ],
    ["ADQ_8", `${adquiriente.pNomE} ${adquiriente.sNomE}`.trim()],
    ["ADQ_9", `${adquiriente.pApeE} ${adquiriente.sApeE}`.trim()],
    ["ADQ_10", adquiriente.direccionE],
    ["ADQ_11", adquiriente.departE],
    ["ADQ_12", ""],
    ["ADQ_13", adquiriente.ciudadE],
    ["ADQ_14", ""],
    ["ADQ_15", adquiriente.codigoPaisEnt],
    ["ADQ_19", adquiriente.nombreDepartamentoEnt],
    ["ADQ_21", adquiriente.paisE],
    ["ADQ_22", adquiriente.digitoVerificacion],
    ["ADQ_23", codigoMunicipioAdquiriente(adquiriente)],
  ]);
}

function buildAdqJuridicoNc(bloqueAdquiriente, adquiriente) {
  appendFlat(bloqueAdquiriente, [
    ["ADQ_6", adquiriente.pNomE],
    ["ADQ_7", adquiriente.pNomE],
    ["ADQ_14", codigoMunicipioAdquiriente(adquiriente)],
    ["ADQ_15", adquiriente.codigoPaisEnt],
    ["ADQ_22", adquiriente.digitoVerificacion],
  ]);
}

function buildItemDescuentoNc(nodoItem, lineaDetalle, indiceDescuento) {
  if (asNumber(lineaDetalle.ValorDescuentoItem) <= 0) return;

  const bloqueDescuento = nodoItem.ele("IDE");
  appendFlat(bloqueDescuento, [
    ["IDE_1", "false"],
    ["IDE_2", lineaDetalle.ValorDescuentoItem],
    ["IDE_3", "COP"],
    ["IDE_5", "Descuento"],
    ["IDE_6", round2(lineaDetalle.PorcentajeCopago ?? lineaDetalle.PorcentajeDescuentoItem)],
    ["IDE_7", lineaDetalle.ValorItem],
    ["IDE_8", "COP"],
    ["IDE_10", indiceDescuento],
  ]);
}

function buildItemIvaNc(nodoItem, lineaDetalle) {
  if (asNumber(lineaDetalle.PorcentajeIvaItem) <= 0) return;

  const nodoImpuestoItem = nodoItem.ele("TII");
  appendFlat(nodoImpuestoItem, [
    ["TII_1", lineaDetalle.ValorIvaItem],
    ["TII_2", "COP"],
    ["TII_3", "false"],
  ]);

  const nodoDetalleImpuesto = nodoImpuestoItem.ele("IIM");
  appendFlat(nodoDetalleImpuesto, [
    ["IIM_1", "01"],
    ["IIM_2", lineaDetalle.ValorIvaItem],
    ["IIM_3", "COP"],
    ["IIM_4", lineaDetalle.ValorItem],
    ["IIM_5", "COP"],
    ["IIM_6", lineaDetalle.PorcentajeIvaItem],
  ]);
}

export function buildNotaCreditoXml(datosXml) {
  const {
    factura,
    empresa: emisor,
    entidad: adquiriente,
    items,
    impuestos,
    baseImponible,
    notaCredito,
  } = datosXml;

  const tipoDocE = asNumber(adquiriente.tipoDocE);
  const esJuridico = tipoDocE === 31;
  const documentoAdquiriente = esJuridico
    ? txt(adquiriente.documentoNit)
    : txt(adquiriente.docE);
  const responsableIvaNc = esJuridico ? "48" : "49";
  const responsabilidadEmisor =
    asNumber(emisor.tipoDocumentoEmpresa) === 31 ? "48" : "49";

  const documento = create({ version: "1.0", encoding: "UTF-8" }).ele("NOTA");

  const encabezado = documento.ele("ENC");
  appendFlat(encabezado, [
    ["ENC_1", "NC"],
    ["ENC_2", emisor.documentoSinDigito],
    ["ENC_3", adquiriente.documentoNit ?? documentoAdquiriente],
    ["ENC_4", "UBL 2.1"],
    ["ENC_5", "DIAN 2.1"],
    ["ENC_6", `${notaCredito.prefijoNC}${notaCredito.numNC}`],
    ["ENC_7", factura.fechaF],
    ["ENC_8", `${factura.horaF}-05:00`],
    ["ENC_9", "91"],
    ["ENC_10", "COP"],
  ]);

  const bloqueEmisor = documento.ele("EMI");
  appendFlat(bloqueEmisor, [
    ["EMI_1", emisor.codigoTipoEmp],
    ["EMI_2", emisor.documentoSinDigito],
    ["EMI_3", emisor.tipoDocumentoEmpresa],
    ["EMI_4", responsabilidadEmisor],
    ["EMI_6", emisor.nombreEmpresa],
    ["EMI_7", emisor.nombreEmpresa],
    ["EMI_8", ""],
    ["EMI_9", ""],
    ["EMI_10", emisor.direccionEmpresa],
    ["EMI_11", emisor.codigoDepartamentoEmpresa],
    ["EMI_13", emisor.nombreCiudadEmpresa],
    ["EMI_14", codigoMunicipioEmisor(emisor)],
    ["EMI_15", emisor.codigoPaisEmp],
    ["EMI_19", emisor.nombreDepartamentoEmpresa],
    ["EMI_21", emisor.nombrePaisEmp],
    ["EMI_22", emisor.digitoVerificacionEm],
    ["EMI_23", codigoMunicipioEmisor(emisor)],
    ["EMI_24", emisor.nombreEmpresa],
  ]);

  const regimenEmisor = bloqueEmisor.ele("TAC");
  regimenEmisor.ele("TAC_1").txt("R-99-PN");

  const direccionFiscalEmisor = bloqueEmisor.ele("DFE");
  appendFlat(direccionFiscalEmisor, [
    ["DFE_1", codigoMunicipioEmisor(emisor)],
    ["DFE_2", emisor.codigoDepartamentoEmpresa],
    ["DFE_3", emisor.codigoPaisEmp],
    ["DFE_4", ""],
    ["DFE_5", emisor.nombrePaisEmp],
    ["DFE_6", emisor.nombreDepartamentoEmpresa],
    ["DFE_7", emisor.nombreCiudadEmpresa],
    ["DFE_8", emisor.direccionEmpresa],
  ]);

  const prefijoEmisor = bloqueEmisor.ele("ICC");
  prefijoEmisor.ele("ICC_1");
  prefijoEmisor.ele("ICC_9").txt(notaCredito.prefijoNC);

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

  const bloqueAdquiriente = documento.ele("ADQ");
  appendFlat(bloqueAdquiriente, [
    ["ADQ_1", adquiriente.tipoPersona],
    ["ADQ_2", documentoAdquiriente],
    ["ADQ_3", adquiriente.tipoDocE],
    ["ADQ_4", responsableIvaNc],
  ]);

  if (esJuridico) {
    buildAdqJuridicoNc(bloqueAdquiriente, adquiriente);
  } else {
    buildAdqNaturalNc(bloqueAdquiriente, adquiriente);
  }

  const regimenAdquiriente = bloqueAdquiriente.ele("TCR");
  regimenAdquiriente.ele("TCR_1").txt("R-99-PN");

  const infoLegalAdquiriente = bloqueAdquiriente.ele("ILA");
  appendFlat(infoLegalAdquiriente, [
    [
      "ILA_1",
      `${adquiriente.pNomE} ${adquiriente.sNomE} ${adquiriente.pApeE} ${adquiriente.sApeE}`.trim(),
    ],
    ["ILA_2", documentoAdquiriente],
    ["ILA_3", adquiriente.tipoDocE],
  ]);
  if (esJuridico) {
    infoLegalAdquiriente.ele("ILA_4").txt(txt(adquiriente.digitoVerificacion));
  }

  const direccionFiscalAdquiriente = bloqueAdquiriente.ele("DFA");
  appendFlat(direccionFiscalAdquiriente, [
    ["DFA_1", adquiriente.codigoPaisEnt],
    ["DFA_2", adquiriente.departE],
    ["DFA_3", adquiriente.paisE],
    ["DFA_4", codigoMunicipioAdquiriente(adquiriente)],
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

  const bloqueTotales = documento.ele("TOT");

  if (
    factura.ivaF !== 0 ||
    factura.reteFuente !== 0 ||
    factura.reteIva !== 0
  ) {
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

  const bloqueResolucion = documento.ele("DRF");
  appendFlat(bloqueResolucion, [
    ["DRF_1", notaCredito.resolucionNC],
    ["DRF_2", notaCredito.fechaResolNC],
    ["DRF_3", notaCredito.fechaFinResoNC],
    ["DRF_4", notaCredito.prefijoNC],
    ["DRF_5", notaCredito.inicioResNC],
    ["DRF_6", notaCredito.finResNC],
  ]);

  const bloqueReferencia = documento.ele("REF");
  appendFlat(bloqueReferencia, [
    ["REF_1", "IV"],
    ["REF_2", `${factura.prefijoF}${factura.numF}`],
    ["REF_3", factura.fechaF],
    ["REF_4", notaCredito.cufe],
    ["REF_5", "CUFE-SHA384"],
  ]);

  const bloqueConcepto = documento.ele("CDN");
  appendFlat(bloqueConcepto, [
    ["CDN_1", notaCredito.codigoConcepto],
    ["CDN_2", notaCredito.concepto],
  ]);

  const bloqueMediosPago = documento.ele("MEP");
  appendFlat(bloqueMediosPago, [
    ["MEP_1", factura.formaPago.formadePagoFac],
    ["MEP_2", factura.formaPago.medioPagoF],
    ["MEP_3", factura.fechaVencimiento],
  ]);

  let numeroLinea = 1;
  let acumTotalItems = 0;
  let contDescuentos = 0;

  items.forEach((lineaDetalle) => {
    const nodoItem = documento.ele("ITE");
    const valorTotal = asNumber(lineaDetalle.ValorTotalItem);

    appendFlat(nodoItem, [
      ["ITE_1", numeroLinea],
      ["ITE_3", lineaDetalle.CantidadItem],
      ["ITE_4", "C62"],
      ["ITE_5", valorTotal],
      ["ITE_6", "COP"],
      ["ITE_7", lineaDetalle.ValorItem],
      ["ITE_8", "COP"],
      ["ITE_11", lineaDetalle.DescripcionItem],
      ["ITE_19", valorTotal],
      ["ITE_20", "COP"],
      ["ITE_21", valorTotal],
      ["ITE_22", "COP"],
      ["ITE_27", lineaDetalle.CantidadItem],
      ["ITE_28", "C62"],
    ]);

    acumTotalItems += valorTotal;

    const codigoItem = nodoItem.ele("IAE");
    appendFlat(codigoItem, [
      ["IAE_1", lineaDetalle.codigoObjetoItem ?? ""],
      ["IAE_2", "999"],
    ]);

    if (asNumber(lineaDetalle.ValorDescuentoItem) > 0) {
      contDescuentos += 1;
      buildItemDescuentoNc(nodoItem, lineaDetalle, contDescuentos);
    }

    buildItemIvaNc(nodoItem, lineaDetalle);
    numeroLinea += 1;
  });

  const tieneRetenciones =
    factura.porceReteFuente !== 0 ||
    factura.porceReteIva !== 0 ||
    factura.porceReteIca !== 0;

  bloqueTotales.ele("TOT_1").txt(txt(factura.totalBrutoDesc));
  bloqueTotales.ele("TOT_2").txt("COP");

  if (factura.ivaF !== 0) {
    baseImponible.forEach((filaBase) => {
      bloqueTotales.ele("TOT_3").txt(txt(filaBase.TotalBaseImponible));
    });
  } else {
    bloqueTotales.ele("TOT_3").txt("0");
  }
  bloqueTotales.ele("TOT_4").txt("COP");

  if (tieneRetenciones) {
    bloqueTotales.ele("TOT_5").txt(txt(factura.totalBrutoImpDesc));
  } else if (contDescuentos > 0) {
    bloqueTotales.ele("TOT_5").txt(txt(acumTotalItems));
  } else {
    bloqueTotales.ele("TOT_5").txt(txt(factura.totF));
  }
  bloqueTotales.ele("TOT_6").txt("COP");

  if (factura.descuentoGeneral !== 0 || tieneRetenciones) {
    bloqueTotales.ele("TOT_7").txt(txt(factura.totalBrutoImpDesc));
  } else if (contDescuentos > 0) {
    bloqueTotales.ele("TOT_7").txt(txt(acumTotalItems));
  } else {
    bloqueTotales.ele("TOT_7").txt(txt(factura.totF));
  }
  bloqueTotales.ele("TOT_8").txt("COP");

  if (factura.descuentoGeneral !== 0) {
    bloqueTotales.ele("TOT_9").txt(txt(factura.descuentoGeneral));
    bloqueTotales.ele("TOT_10").txt("COP");
  }

  if (tieneRetenciones) {
    bloqueTotales.ele("TOT_15").txt(txt(factura.totalBrutoImpDesc));
    bloqueTotales.ele("TOT_16").txt("COP");
  }

  const totalLineas = Math.max(numeroLinea - 1, 0);
  encabezado.ele("ENC_15").txt(txt(totalLineas));
  encabezado.ele("ENC_16").txt(factura.fechaVencimiento);
  encabezado.ele("ENC_20").txt("1");
  encabezado.ele("ENC_21").txt("20");

  return documento.end({ prettyPrint: true });
}
