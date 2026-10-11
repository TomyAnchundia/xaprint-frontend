import type { EstadoPedido, Pedido } from "../types/pedido";

export type FiltroPedido =
  | "TODOS"
  | "REVISION"
  | "IMPRIMIENDO"
  | "LISTO"
  | "ENTREGADO";

export type FiltroServicioPedido =
  | "TODOS"
  | "UV"
  | "TEXTIL_31"
  | "TEXTIL_58";

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
    clase: "bg-emerald-700 text-white",
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

export function escaparHtml(valor: string): string {
  const elemento = document.createElement("div");
  elemento.textContent = valor;
  return elemento.innerHTML;
}

export function formatearPrecio(precio: number | null): string {
  if (precio === null) {
    return "—";
  }

  return `$${precio.toFixed(2)}`;
}

export function formatearMedidas(pedido: Pedido): string {
  if (pedido.largo === null) {
    return `${pedido.ancho} cm`;
  }

  return `${pedido.ancho} × ${pedido.largo} cm`;
}

function fechaEsDeHoy(fecha: string | null): boolean {
  if (!fecha) {
    return false;
  }

  const fechaRegistro = new Date(fecha);
  const fechaActual = new Date();

  const formatoFecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    formatoFecha.format(fechaRegistro) === formatoFecha.format(fechaActual)
  );
}

export function obtenerPedidosFiltrados(
  pedidosActuales: Pedido[],
  filtroActual: FiltroPedido,
  filtroServicio: FiltroServicioPedido = "TODOS",
): Pedido[] {
  let pedidos = [...pedidosActuales];

  if (filtroServicio === "UV") {
    pedidos = pedidos.filter((pedido) => pedido.servicio === "UV");
  } else if (filtroServicio === "TEXTIL_31") {
    pedidos = pedidos.filter(
      (pedido) => pedido.servicio === "TEXTIL" && pedido.ancho === 31,
    );
  } else if (filtroServicio === "TEXTIL_58") {
    pedidos = pedidos.filter(
      (pedido) => pedido.servicio === "TEXTIL" && pedido.ancho === 58,
    );
  }

  if (filtroActual === "TODOS") {
    pedidos = pedidos.filter(
      (pedido) =>
        pedido.estado === "REVISION" ||
        pedido.estado === "IMPRIMIENDO" ||
        pedido.estado === "LISTO",
    );
  } else if (filtroActual === "ENTREGADO") {
    pedidos = pedidos.filter(
      (pedido) =>
        pedido.estado === "ENTREGADO" && fechaEsDeHoy(pedido.updatedAt),
    );
  } else {
    pedidos = pedidos.filter((pedido) => pedido.estado === filtroActual);
  }

  pedidos.sort((a, b) => {
    const fechaA = new Date(a.createdAt).getTime();
    const fechaB = new Date(b.createdAt).getTime();

    if (fechaA !== fechaB) {
      return fechaB - fechaA;
    }

    if (a.prioridad !== b.prioridad) {
      return b.prioridad - a.prioridad;
    }

    return b.id - a.id;
  });

  return pedidos;
}
