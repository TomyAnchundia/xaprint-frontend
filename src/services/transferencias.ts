import { io, type Socket } from "socket.io-client";
import { obtenerToken } from "./auth";

const API_URL =
  import.meta.env.PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:3000`
    : "http://localhost:3000");
const TAMANO_BLOQUE = 64 * 1024;

type Respuesta<T> = { ok: true } & T | { ok: false; error: string };

export interface SolicitudTransferencia {
  transferenciaId: string;
  pedidoId: number;
  archivos: {
    id: string;
    nombreArchivo: string;
    tamano: number;
    tipo: string;
    siguienteSecuencia: number;
    bytesEnviados: number;
  }[];
  remitente: string;
}

export interface BloqueTransferencia {
  transferenciaId: string;
  archivoId: string;
  secuencia: number;
  contenido: ArrayBuffer | Uint8Array | { type: "Buffer"; data: number[] };
}

export interface ProgresoTransferencia {
  estado: "solicitando" | "esperando" | "enviando" | "completado";
  archivoId?: string;
  nombreArchivo?: string;
  enviados: number;
  total: number;
}

export interface EstadoDestinatarioTransferencia {
  transferenciaId: string;
  archivoId?: string;
  username: string;
  estado:
    | "aceptado"
    | "rechazado"
    | "desconectado"
    | "expirado"
    | "recibido";
}

type EventoListo = {
  transferenciaId: string;
  cantidadAceptada: number;
};

let socket: Socket | null = null;
let conexion: Promise<Socket> | null = null;

function obtenerSocket(): Socket {
  if (!socket) {
    const token = obtenerToken();
    if (!token) {
      throw new Error("Inicia sesión para usar la transferencia de archivos.");
    }
    socket = io(`${API_URL}/pedidos`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
    });
  }
  return socket;
}

async function conectar(): Promise<Socket> {
  const canal = obtenerSocket();
  if (canal.connected) return canal;
  if (conexion) return conexion;

  conexion = new Promise((resolve, reject) => {
    const tiempoLimite = window.setTimeout(() => {
      limpiar();
      reject(new Error("No se pudo conectar para transferir el archivo."));
    }, 15_000);

    const alConectar = () => {
      limpiar();
      resolve(canal);
    };
    const alFallar = (error: Error) => {
      limpiar();
      reject(new Error(`No se pudo conectar: ${error.message}`));
    };
    const limpiar = () => {
      window.clearTimeout(tiempoLimite);
      canal.off("connect", alConectar);
      canal.off("connect_error", alFallar);
      conexion = null;
    };

    canal.on("connect", alConectar);
    canal.on("connect_error", alFallar);
    canal.connect();
  });

  return conexion;
}

function emitirConRespuesta<T>(
  canal: Socket,
  evento: string,
  datos: unknown,
): Promise<Respuesta<T>> {
  return new Promise((resolve, reject) => {
    canal.timeout(15_000).emit(
      evento,
      datos,
      (error: Error | null, respuesta: Respuesta<T>) => {
        if (error) {
          reject(new Error("El servidor no respondió a la transferencia."));
          return;
        }
        resolve(respuesta);
      },
    );
  });
}

function validarRespuesta<T>(respuesta: Respuesta<T>): T {
  if (!respuesta.ok) {
    throw new Error(respuesta.error);
  }
  return respuesta;
}

function crearIdTransferenciaArchivo(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hexadecimal = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`;
}

export function suscribirseTransferencia<T>(
  evento: string,
  listener: (datos: T) => void,
): () => void {
  const canal = obtenerSocket();
  canal.on(evento, listener);
  canal.connect();
  return () => canal.off(evento, listener);
}

export async function responderTransferencia(
  transferenciaId: string,
  aceptada: boolean,
): Promise<void> {
  const canal = await conectar();
  validarRespuesta(
    await emitirConRespuesta<Record<string, never>>(
      canal,
      "transferencia:responder",
      { transferenciaId, aceptada },
    ),
  );
}

export async function confirmarArchivoRecibido(
  transferenciaId: string,
  archivoId: string,
): Promise<void> {
  const canal = await conectar();
  validarRespuesta(
    await emitirConRespuesta<Record<string, never>>(
      canal,
      "transferencia:archivo-recibido",
      { transferenciaId, archivoId },
    ),
  );
}

export async function enviarArchivosPedido(
  pedidoId: number,
  archivos: File[],
  alActualizar: (progreso: ProgresoTransferencia) => void,
  alPrepararArchivos: (
    archivos: { id: string; archivo: File }[],
  ) => void,
  alCrearTransferencia: (transferenciaId: string) => void,
  alRecibirDestinatarios: (nombres: string[]) => void,
): Promise<void> {
  const canal = await conectar();
  alActualizar({ estado: "solicitando", enviados: 0, total: 0 });

  const eventosListos = new Map<string, EventoListo>();
  const resolutoresListos = new Map<
    string,
    (evento: EventoListo) => void
  >();
  const tiemposLimiteListos = new Map<string, number>();
  const recibirListo = (evento: EventoListo) => {
    const resolver = resolutoresListos.get(evento.transferenciaId);
    if (resolver) {
      const tiempoLimite = tiemposLimiteListos.get(evento.transferenciaId);
      if (tiempoLimite) window.clearTimeout(tiempoLimite);
      tiemposLimiteListos.delete(evento.transferenciaId);
      resolver(evento);
      resolutoresListos.delete(evento.transferenciaId);
    } else {
      eventosListos.set(evento.transferenciaId, evento);
    }
  };
  canal.on("transferencia:destinatarios-listos", recibirListo);

  let transferenciaId: string | null = null;
  try {
    const archivosTransferencia = archivos.map((archivo) => ({
      id: crearIdTransferenciaArchivo(),
      nombreArchivo: archivo.name,
      tamano: archivo.size,
      tipo: archivo.type,
    }));
    alPrepararArchivos(
      archivos.map((archivo, indice) => ({
        id: archivosTransferencia[indice]!.id,
        archivo,
      })),
    );
    const invitacion = validarRespuesta(
      await emitirConRespuesta<{
        transferenciaId: string;
        destinatarios: { socketId: string; username: string }[];
      }>(canal, "transferencia:invitar", {
        pedidoId,
        archivos: archivosTransferencia,
      }),
    );
    transferenciaId = invitacion.transferenciaId;
    alCrearTransferencia(transferenciaId);
    alRecibirDestinatarios(
      invitacion.destinatarios.map((destinatario) => destinatario.username),
    );
    alActualizar({ estado: "esperando", enviados: 0, total: 0 });

    const eventoListo = await new Promise<EventoListo>((resolve, reject) => {
      const eventoEnCola = eventosListos.get(transferenciaId as string);
      if (eventoEnCola) {
        eventosListos.delete(transferenciaId as string);
        resolve(eventoEnCola);
        return;
      }

      const idEsperado = transferenciaId as string;
      const tiempoLimiteId = window.setTimeout(() => {
        resolutoresListos.delete(idEsperado);
        tiemposLimiteListos.delete(idEsperado);
        reject(new Error("Los empleados no respondieron a tiempo."));
      }, 100_000);
      tiemposLimiteListos.set(idEsperado, tiempoLimiteId);
      resolutoresListos.set(idEsperado, (evento) => {
        resolve(evento);
      });
    });

    if (eventoListo.cantidadAceptada === 0) {
      throw new Error("Ningún empleado aceptó recibir el archivo.");
    }

    for (const [indice, archivo] of archivos.entries()) {
      const archivoId = archivosTransferencia[indice]?.id;
      if (!archivoId) {
        throw new Error("No se pudo identificar uno de los archivos.");
      }
      let enviados = 0;
      for (let inicio = 0; inicio < archivo.size; inicio += TAMANO_BLOQUE) {
        const contenido = new Uint8Array(
          await archivo.slice(inicio, inicio + TAMANO_BLOQUE).arrayBuffer(),
        );
        validarRespuesta(
          await emitirConRespuesta<Record<string, never>>(
            canal,
            "transferencia:bloque",
            {
              transferenciaId,
              archivoId,
              secuencia: enviados / TAMANO_BLOQUE,
              contenido,
            },
          ),
        );
        enviados += contenido.byteLength;
        alActualizar({
          estado: "enviando",
          archivoId,
          nombreArchivo: archivo.name,
          enviados,
          total: archivo.size,
        });
      }
      validarRespuesta(
        await emitirConRespuesta<Record<string, never>>(
          canal,
          "transferencia:archivo-completado",
          { transferenciaId, archivoId },
        ),
      );
    }

    alActualizar({ estado: "completado", enviados: 0, total: 0 });
  } catch (error) {
    if (transferenciaId) {
      canal.emit("transferencia:cancelar", { transferenciaId });
    }
    throw error;
  } finally {
    if (transferenciaId) {
      const tiempoLimite = tiemposLimiteListos.get(transferenciaId);
      if (tiempoLimite) window.clearTimeout(tiempoLimite);
      tiemposLimiteListos.delete(transferenciaId);
      resolutoresListos.delete(transferenciaId);
      eventosListos.delete(transferenciaId);
    }
    canal.off("transferencia:destinatarios-listos", recibirListo);
  }
}

export function cancelarTransferencia(transferenciaId: string): void {
  socket?.emit("transferencia:cancelar", { transferenciaId });
}

export function convertirContenidoABlobPartes(
  contenido: BloqueTransferencia["contenido"],
): ArrayBuffer {
  if (contenido instanceof ArrayBuffer) return contenido;
  if (contenido instanceof Uint8Array) {
    return contenido.buffer.slice(
      contenido.byteOffset,
      contenido.byteOffset + contenido.byteLength,
    ) as ArrayBuffer;
  }
  if (
    typeof contenido === "object" &&
    contenido !== null &&
    contenido.type === "Buffer" &&
    Array.isArray(contenido.data)
  ) {
    return new Uint8Array(contenido.data).buffer;
  }
  throw new Error("El bloque recibido tiene un formato no válido.");
}
