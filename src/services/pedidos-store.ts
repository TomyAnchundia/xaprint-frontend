import { io, type Socket } from "socket.io-client";

import {
  obtenerPaginaPedidos,
  type FiltroEstadoPedidos,
  type FiltroServicioPedidos,
} from "./api";

import type { Pedido } from "../types/pedido";
import { obtenerUsuario } from "./auth";
import { pedidoPerteneceAlArea } from "./permisos";

const API_URL = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";

type Listener = (pedidos: Pedido[]) => void;

type ConnectionListener = (conectado: boolean) => void;

export interface EstadoPaginacionPedidos {
  cargandoInicial: boolean;
  cargandoMas: boolean;
  hayMas: boolean;
  error: "inicial" | "mas" | null;
}

export interface FiltrosStorePedidos {
  estado: FiltroEstadoPedidos;
  servicio: FiltroServicioPedidos;
  busqueda: string;
}

let pedidos: Pedido[] = [];

let socket: Socket | null = null;

let iniciado = false;

let inicioEnCurso: Promise<void> | null = null;

let cursor: string | null = null;
let secuenciaCarga = 0;
let filtrosActuales: FiltrosStorePedidos = {
  estado: "TODOS",
  servicio: "TODOS",
  busqueda: "",
};
let estadoPaginacion: EstadoPaginacionPedidos = {
  cargandoInicial: true,
  cargandoMas: false,
  hayMas: false,
  error: null,
};

const listeners = new Set<Listener>();

const connectionListeners = new Set<ConnectionListener>();

const paginationListeners = new Set<
  (estado: EstadoPaginacionPedidos) => void
>();

export function obtenerPedidosStore(): Pedido[] {
  return pedidos;
}

export function obtenerEstadoPaginacionPedidos(): EstadoPaginacionPedidos {
  return estadoPaginacion;
}

export function suscribirsePedidos(listener: Listener): () => void {
  listeners.add(listener);

  listener(pedidos);

  return () => {
    listeners.delete(listener);
  };
}

export function suscribirsePaginacionPedidos(
  listener: (estado: EstadoPaginacionPedidos) => void,
): () => void {
  paginationListeners.add(listener);
  listener(estadoPaginacion);

  return () => {
    paginationListeners.delete(listener);
  };
}

export function suscribirseConexion(listener: ConnectionListener): () => void {
  connectionListeners.add(listener);

  if (socket) {
    listener(socket.connected);
  }

  return () => {
    connectionListeners.delete(listener);
  };
}

function notificarPedidos() {
  listeners.forEach((listener) => {
    listener(pedidos);
  });
}

function actualizarEstadoPaginacion(cambios: Partial<EstadoPaginacionPedidos>) {
  estadoPaginacion = { ...estadoPaginacion, ...cambios };
  paginationListeners.forEach((listener) => listener(estadoPaginacion));
}

function notificarConexion(conectado: boolean) {
  connectionListeners.forEach((listener) => {
    listener(conectado);
  });
}

function notificarDatosFinancierosActualizados() {
  window.dispatchEvent(new CustomEvent("centro-control:actualizar-datos"));
}

function notificarClientesActualizados() {
  window.dispatchEvent(
    new CustomEvent("centro-control:clientes-actualizados"),
  );
}

function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function fechaEsDeHoy(fecha: string | null): boolean {
  if (!fecha) return false;

  const formatoFecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (
    formatoFecha.format(new Date(fecha)) === formatoFecha.format(new Date())
  );
}

function pedidoCoincideConFiltros(pedido: Pedido): boolean {
  if (!pedidoPerteneceAlArea(pedido, obtenerUsuario())) return false;

  const coincideEstado =
    filtrosActuales.estado === "TODOS"
      ? ["REVISION", "IMPRIMIENDO", "LISTO"].includes(pedido.estado)
      : filtrosActuales.estado === "ENTREGADO"
        ? pedido.estado === "ENTREGADO" && fechaEsDeHoy(pedido.updatedAt)
        : pedido.estado === filtrosActuales.estado;
  if (!coincideEstado) return false;

  const coincideServicio =
    filtrosActuales.servicio === "TODOS" ||
    (filtrosActuales.servicio === "UV" && pedido.servicio === "UV") ||
    (filtrosActuales.servicio === "TEXTIL_31" &&
      pedido.servicio === "TEXTIL" &&
      pedido.ancho === 31) ||
    (filtrosActuales.servicio === "TEXTIL_58" &&
      pedido.servicio === "TEXTIL" &&
      pedido.ancho === 58);
  if (!coincideServicio) return false;

  const busqueda = normalizarTexto(filtrosActuales.busqueda.trim());
  return (
    !busqueda ||
    normalizarTexto(pedido.cliente?.nombre ?? "").includes(busqueda)
  );
}

function compararPedidos(a: Pedido, b: Pedido): number {
  const fechaA = new Date(a.createdAt).getTime();
  const fechaB = new Date(b.createdAt).getTime();
  if (fechaA !== fechaB) return fechaB - fechaA;
  if (a.prioridad !== b.prioridad) return b.prioridad - a.prioridad;
  return b.id - a.id;
}

async function cargarPagina(reiniciar: boolean): Promise<void> {
  const secuencia = reiniciar ? ++secuenciaCarga : secuenciaCarga;
  if (reiniciar) {
    cursor = null;
    actualizarEstadoPaginacion({
      cargandoInicial: true,
      cargandoMas: false,
      hayMas: false,
      error: null,
    });
  } else {
    actualizarEstadoPaginacion({
      cargandoMas: true,
      error: null,
    });
  }

  try {
    const pagina = await obtenerPaginaPedidos({
      ...filtrosActuales,
      ...(reiniciar || !cursor ? {} : { cursor }),
    });
    if (secuencia !== secuenciaCarga) return;

    const idsActuales = new Set(
      reiniciar ? [] : pedidos.map((pedido) => pedido.id),
    );
    const pedidosNuevos = pagina.items.filter(
      (pedido) => !idsActuales.has(pedido.id),
    );
    pedidos = reiniciar
      ? pagina.items
      : [...pedidos, ...pedidosNuevos].sort(compararPedidos);
    cursor = pagina.nextCursor;
    notificarPedidos();
    actualizarEstadoPaginacion({
      cargandoInicial: false,
      cargandoMas: false,
      hayMas: cursor !== null,
      error: null,
    });
  } catch (error) {
    if (secuencia === secuenciaCarga) {
      actualizarEstadoPaginacion({
        cargandoInicial: false,
        cargandoMas: false,
        error: reiniciar ? "inicial" : "mas",
      });
    }
    throw error;
  }
}

export async function cargarPedidos(): Promise<void> {
  return cargarPagina(true);
}

export async function cambiarFiltrosPedidos(
  filtros: FiltrosStorePedidos,
): Promise<void> {
  filtrosActuales = filtros;
  return cargarPagina(true);
}

export async function cargarMasPedidos(): Promise<void> {
  if (
    estadoPaginacion.cargandoInicial ||
    estadoPaginacion.cargandoMas ||
    (!estadoPaginacion.hayMas && estadoPaginacion.error !== "mas")
  ) {
    return;
  }
  return cargarPagina(false);
}

function actualizarPedido(
  pedidoActualizado: Pedido | { id: number; eliminado: true },
) {
  if ("eliminado" in pedidoActualizado && pedidoActualizado.eliminado) {
    const anterior = pedidos.find((pedido) => pedido.id === pedidoActualizado.id);
    pedidos = pedidos.filter((pedido) => pedido.id !== pedidoActualizado.id);
    notificarPedidos();
    window.dispatchEvent(
      new CustomEvent("centro-control:pedido-actualizado", {
        detail: { anterior, nuevo: null, eliminado: true },
      }),
    );
    return;
  }

  const indice = pedidos.findIndex(
    (pedido) => pedido.id === pedidoActualizado.id,
  );
  const anterior = indice === -1 ? null : pedidos[indice];

  if (!pedidoPerteneceAlArea(pedidoActualizado, obtenerUsuario())) {
    if (indice !== -1) {
      pedidos = pedidos.filter((pedido) => pedido.id !== pedidoActualizado.id);
      notificarPedidos();
    }
  } else if (pedidoCoincideConFiltros(pedidoActualizado)) {
    if (indice === -1) {
      pedidos = [...pedidos, pedidoActualizado].sort(compararPedidos);
    } else {
      pedidos = pedidos.map((pedido) =>
        pedido.id === pedidoActualizado.id ? pedidoActualizado : pedido,
      );
    }
    notificarPedidos();
  } else {
    if (indice !== -1) {
      pedidos = pedidos.filter((pedido) => pedido.id !== pedidoActualizado.id);
      notificarPedidos();
    }
  }

  window.dispatchEvent(
    new CustomEvent("centro-control:pedido-actualizado", {
      detail: { anterior, nuevo: pedidoActualizado, eliminado: false },
    }),
  );
}

function conectarWebSocket() {
  if (socket) {
    return;
  }

  socket = io(`${API_URL}/pedidos`, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("WebSocket conectado:", socket?.id);

    notificarConexion(true);
  });

  socket.on("disconnect", () => {
    console.log("WebSocket desconectado");

    notificarConexion(false);
  });

  socket.on("connect_error", (error) => {
    console.error("Error WebSocket:", error.message);

    notificarConexion(false);
  });

  socket.on("pedidoActualizado", (pedido: Pedido) => {
    console.log("Pedido actualizado en tiempo real:", pedido);

    actualizarPedido(pedido);
  });

  socket.on("finanzasActualizadas", notificarDatosFinancierosActualizados);
  socket.on("clientesActualizados", notificarClientesActualizados);
}

export function iniciarPedidosStore(): Promise<void> {
  if (inicioEnCurso) {
    return inicioEnCurso;
  }

  if (iniciado) {
    return Promise.resolve();
  }

  iniciado = true;

  conectarWebSocket();

  inicioEnCurso = cargarPedidos()
    .then(() => undefined)
    .catch((error: unknown) => {
      iniciado = false;
      throw error;
    })
    .finally(() => {
      inicioEnCurso = null;
    });

  return inicioEnCurso;
}
