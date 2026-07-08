function asNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Replica la lógica de consultaDetalle() en controladorFactura.php
 * para elegir la tabla de ítems según las guías de tipo de factura.
 */
export function resolveDetailTable(guias) {
  const dato = asNumber(guias.GuiaFactura);
  const dato2 = asNumber(guias.GuiaFacturaNormal);
  const dato3 = asNumber(guias.GuiaSaldos);
  const dato4 = asNumber(guias.GuiaCantidadPresupuesto);
  const dato5 = asNumber(guias.GuiaAbono);
  const dato6 = asNumber(guias.GuiaCuotaInicial);
  const dato7 = asNumber(guias.GuiaCuotasNoAnticipos);

  if (dato === 0 && dato2 === 0) {
    return "[Face Cnsta FacturaCopago]";
  }
  if (dato6 !== 0 || dato7 >= 1) {
    return "[Face Cnsta FacturaAnticiposVariosItems]";
  }
  if (dato5 !== 0 && dato4 !== 1) {
    return "[Face Cnsta FacturaAnticiposVariosItems]";
  }
  if (dato === 0 && (dato2 === 5 || dato2 === 13) && dato3 === 0 && dato4 === 1) {
    return "[Face Cnsta FacturaParticular]";
  }
  if (dato3 !== 0) {
    return "[Face Cnsta FacturaSaldos]";
  }
  return "[Face Cnsta FacturaEII]";
}
