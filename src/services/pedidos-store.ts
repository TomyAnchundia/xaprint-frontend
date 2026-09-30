import { io, type Socket } from "socket.io-client";

import { obtenerPedidos } from "./api";

import type { Pedido } from "../types/pedido";

const API_URL = import.meta.env.PUBLIC_API_URL ?? "http://localhost:3000";

type Listener = (pedidos: Pedido[]) => void;

type ConnectionListener = (conectado: boolean) => void;

let pedidos: Pedido[] = [];

let socket: Socket | null = null;

let iniciado = false;

const listeners = new Set<Listener>();

const connectionListeners = new Set<ConnectionListener>();

export function obtenerPedidosStore(): Pedido[] {
  return pedidos;
}

export function suscribirsePedidos(listener: Listener): () => void {
  listeners.add(listener);

  listener(pedidos);

  return () => {
    listeners.delete(listener);
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

function notificarConexion(conectado: boolean) {
  connectionListeners.forEach((listener) => {
    listener(conectado);
  });
}

function notificarDatosFinancierosActualizados() {
  window.dispatchEvent(new CustomEvent("centro-control:actualizar-datos"));
}

export async function cargarPedidos() {
  try {
    pedidos = await obtenerPedidos();

    notificarPedidos();

    return pedidos;
  } catch (error) {
    console.error("Error cargando pedidos:", error);

    throw error;
  }
}

function actualizarPedido(
  pedidoActualizado: Pedido | { id: number; eliminado: true },
) {
  if ("eliminado" in pedidoActualizado && pedidoActualizado.eliminado) {
    pedidos = pedidos.filter((pedido) => pedido.id !== pedidoActualizado.id);
    notificarPedidos();
    return;
  }

  const indice = pedidos.findIndex(
    (pedido) => pedido.id === pedidoActualizado.id,
  );

  if (indice === -1) {
    pedidos = [pedidoActualizado, ...pedidos];
  } else {
    pedidos = pedidos.map((pedido) =>
      pedido.id === pedidoActualizado.id ? pedidoActualizado : pedido,
    );
  }

  notificarPedidos();
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
    notificarDatosFinancierosActualizados();
  });

  socket.on("finanzasActualizadas", notificarDatosFinancierosActualizados);
}

export async function iniciarPedidosStore() {
  if (iniciado) {
    return;
  }

  iniciado = true;

  conectarWebSocket();

  await cargarPedidos();
}
