export function formatFechaDisplay(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapMedioPago(idFormaPago) {
  const map = {
    2: "Efectivo",
    4: "Tarjeta de débito",
    5: "Tarjeta de crédito",
  };
  return map[idFormaPago] ?? "Crédito";
}

export function mapItemRow(row) {
  const valorItem = Math.round(Number(row.ValorItem) || 0);
  const valorIva = Math.round(Number(row.ValorIvaItem) || 0);
  const descuento = Math.round(Number(row.ValorDescuentoItem) || 0);

  return {
    codigo: String(row.IdFacturaItem ?? ""),
    descripcion: row.DescripcionItem ?? "",
    cantidad: Number(row.CantidadItem) || 0,
    precioUnitario: valorItem,
    iva: valorIva,
    subtotal: valorIva + valorItem - descuento,
  };
}
