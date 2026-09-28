import type { EstadoPedido, Pedido } from "../types/pedido";

export const estados: Record<
  EstadoPedido,
  {
    label: string;
    clase: string;
  }
> = {
  REVISION: {
    label: "Revisión",
    clase: "bg-slate-100 text-slate-700",
  },

  IMPRIMIENDO: {
    label: "Imprimiendo",
    clase: "bg-blue-700 text-white shadow-sm ring-1 ring-blue-600",
  },

  LISTO: {
    label: "Listo",
    clase: "bg-emerald-50 text-emerald-700",
  },

  ENTREGADO: {
    label: "Entregado",
    clase: "bg-slate-100 text-slate-600",
  },

  CANCELADO: {
    label: "Cancelado",
    clase: "bg-red-50 text-red-700",
  },
};

export const estadosAnteriores: Partial<Record<EstadoPedido, EstadoPedido>> = {
  IMPRIMIENDO: "REVISION",
  LISTO: "IMPRIMIENDO",
  ENTREGADO: "LISTO",
};

export const estadosSiguientes: Partial<Record<EstadoPedido, EstadoPedido>> = {
  REVISION: "IMPRIMIENDO",
  IMPRIMIENDO: "LISTO",
  LISTO: "ENTREGADO",
};

export const accionesSiguientes: Partial<Record<EstadoPedido, string>> = {
  REVISION: "Enviar a impresión",
  IMPRIMIENDO: "Marcar como listo",
  LISTO: "Marcar como entregado",
};

export function escaparHtml(valor: string): string {
  const elemento = document.createElement("div");
  elemento.textContent = valor;
  return elemento.innerHTML;
}

export function formatearPrecio(valor: number | null): string {
  return valor === null ? "—" : `$${valor.toFixed(2)}`;
}

export function formatearMedidas(
  pedido: Pick<Pedido, "largo" | "ancho">,
): string {
  return pedido.largo === null
    ? `${pedido.ancho} cm`
    : `${pedido.ancho} × ${pedido.largo} cm`;
}

export function obtenerNombreCliente(pedido: Pick<Pedido, "cliente">): string {
  const nombre = pedido.cliente?.nombre?.trim();
  return nombre || "cliente";
}

export function generarMensajeImpresionLista(pedido: Pedido): string {
  const nombre = obtenerNombreCliente(pedido);
  return `📢 Su impresión DTF ${pedido.servicio} ya está lista. ✅`;
}

export function generarMensajePrecio(pedido: Pedido): string {
  const servicioTexto = pedido.servicio === "TEXTIL" ? "DTF textil" : "DTF UV";

  const medidas = formatearMedidas(pedido);
  const precio = formatearPrecio(pedido.valorCobrar);

  return `Aquí tiene el detalle de su pedido:

🖨️ Servicio: ${servicioTexto}
📐 Medida: ${medidas}
💰 Total: $ *${precio}*

¡Gracias por su preferencia! 🙌✨
        `;
}
