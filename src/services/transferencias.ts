import { io, type Socket } from "socket.io-client";
import { obtenerToken } from "./auth";

const API_URL =
  import.meta.env.PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:3000`
    : "http://localhost:3000");
const TAMANO_BLOQUE = 64 * 1024;
const MAXIMO_BUFFER_DATA_CHANNEL = 2 * 1024 * 1024;
const TIEMPO_CONEXION_P2P_MS = 45_000;

type Respuesta<T> = ({ ok: true } & T) | { ok: false; error: string };
type TipoSenalP2P = "oferta" | "respuesta" | "candidato";

type SenalP2P = {
  transferenciaId: string;
  destinatarioSocketId: string;
  remitenteSocketId: string;
  tipo: TipoSenalP2P;
  valor: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

type EventoDatosP2P =
  | { tipo: "inicio"; archivoId: string }
  | { tipo: "bloque"; archivoId: string; contenido: ArrayBuffer }
  | { tipo: "fin"; archivoId: string };

export interface SolicitudTransferencia {
  transferenciaId: string;
  pedidoId: number;
  archivos: {
    id: string;
    nombreArchivo: string;
    tamano: number;
    tipo: string;
  }[];
  remitente: string;
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
  estado: "aceptado" | "rechazado" | "desconectado" | "expirado" | "recibido";
}

type EventoListo = {
  transferenciaId: string;
  cantidadAceptada: number;
  destinatarios: { socketId: string; username: string }[];
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
    canal
      .timeout(15_000)
      .emit(evento, datos, (error: Error | null, respuesta: Respuesta<T>) => {
        if (error) {
          reject(new Error("El servidor no respondió a la transferencia."));
          return;
        }
        resolve(respuesta);
      });
  });
}

function validarRespuesta<T>(respuesta: Respuesta<T>): T {
  if (!respuesta.ok) {
    throw new Error(respuesta.error);
  }
  return respuesta;
}

function validarDisponibilidadP2P(): void {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error(
      window.isSecureContext
        ? "Este navegador no admite transferencias directas WebRTC."
        : "WebRTC no está disponible en esta página. Abre el sistema mediante HTTPS o localhost.",
    );
  }
}

function crearConexionP2P(): RTCPeerConnection {
  validarDisponibilidadP2P();
  return new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });
}

function emitirSenal(
  canal: Socket,
  datos: {
    transferenciaId: string;
    destinatarioSocketId: string;
    tipo: TipoSenalP2P;
    valor: RTCSessionDescriptionInit | RTCIceCandidateInit;
  },
): void {
  canal.emit("transferencia:senal", datos);
}

function emitirSenalConRespuesta(
  canal: Socket,
  datos: {
    transferenciaId: string;
    destinatarioSocketId: string;
    tipo: TipoSenalP2P;
    valor: RTCSessionDescriptionInit | RTCIceCandidateInit;
  },
): Promise<void> {
  return emitirConRespuesta<Record<string, never>>(
    canal,
    "transferencia:senal",
    datos,
  ).then(validarRespuesta);
}

function procesarCandidatosPendientes(
  peer: RTCPeerConnection,
  candidatos: RTCIceCandidateInit[],
): Promise<void> {
  return candidatos.reduce(
    (anterior, candidato) =>
      anterior.then(() => peer.addIceCandidate(new RTCIceCandidate(candidato))),
    Promise.resolve(),
  );
}

function esperarCanalAbierto(
  peer: RTCPeerConnection,
  canal: RTCDataChannel,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tiempoLimite = window.setTimeout(() => {
      limpiar();
      reject(
        new Error(
          "No se pudo establecer una conexión directa con todos los empleados. Verifica que la red permita WebRTC P2P.",
        ),
      );
    }, TIEMPO_CONEXION_P2P_MS);

    const limpiar = () => {
      window.clearTimeout(tiempoLimite);
      canal.removeEventListener("open", alAbrir);
      canal.removeEventListener("error", alError);
      peer.removeEventListener("connectionstatechange", revisarEstado);
    };
    const alAbrir = () => {
      limpiar();
      resolve();
    };
    const alError = () => {
      limpiar();
      reject(new Error("Falló el canal directo de transferencia."));
    };
    const revisarEstado = () => {
      if (
        peer.connectionState === "failed" ||
        peer.connectionState === "closed"
      ) {
        limpiar();
        reject(
          new Error(
            "No se pudo establecer una conexión directa. La transferencia no se envió.",
          ),
        );
      }
    };

    canal.addEventListener("open", alAbrir);
    canal.addEventListener("error", alError);
    peer.addEventListener("connectionstatechange", revisarEstado);
    revisarEstado();
    if (canal.readyState === "open") alAbrir();
  });
}

async function esperarBufferDisponible(canal: RTCDataChannel): Promise<void> {
  if (canal.readyState !== "open") {
    throw new Error("Se perdió la conexión directa durante la transferencia.");
  }
  if (canal.bufferedAmount <= MAXIMO_BUFFER_DATA_CHANNEL) return;

  canal.bufferedAmountLowThreshold = MAXIMO_BUFFER_DATA_CHANNEL / 2;
  await new Promise<void>((resolve, reject) => {
    const tiempoLimite = window.setTimeout(() => {
      limpiar();
      reject(new Error("La conexión directa dejó de aceptar datos."));
    }, TIEMPO_CONEXION_P2P_MS);
    const limpiar = () => {
      window.clearTimeout(tiempoLimite);
      canal.removeEventListener("bufferedamountlow", revisar);
      canal.removeEventListener("close", alCerrar);
    };
    const revisar = () => {
      if (canal.bufferedAmount <= MAXIMO_BUFFER_DATA_CHANNEL / 2) {
        limpiar();
        resolve();
      }
    };
    const alCerrar = () => {
      limpiar();
      reject(new Error("Se perdió la conexión directa durante el envío."));
    };

    canal.addEventListener("bufferedamountlow", revisar);
    canal.addEventListener("close", alCerrar);
    revisar();
  });
}

async function esperarColaVacia(canal: RTCDataChannel): Promise<void> {
  if (canal.readyState !== "open") {
    throw new Error("Se perdió la conexión directa durante la transferencia.");
  }
  if (canal.bufferedAmount === 0) return;

  canal.bufferedAmountLowThreshold = 0;
  await new Promise<void>((resolve, reject) => {
    const tiempoLimite = window.setTimeout(() => {
      limpiar();
      reject(
        new Error("No se pudo completar el envío por la conexión directa."),
      );
    }, TIEMPO_CONEXION_P2P_MS);
    const limpiar = () => {
      window.clearTimeout(tiempoLimite);
      canal.removeEventListener("bufferedamountlow", alVaciar);
      canal.removeEventListener("close", alCerrar);
    };
    const alVaciar = () => {
      limpiar();
      resolve();
    };
    const alCerrar = () => {
      limpiar();
      reject(new Error("Se perdió la conexión directa durante el envío."));
    };

    canal.addEventListener("bufferedamountlow", alVaciar);
    canal.addEventListener("close", alCerrar);
    if (canal.bufferedAmount === 0) alVaciar();
  });
}

async function prepararCanalesEnvio(
  canal: Socket,
  transferenciaId: string,
  destinatarios: { socketId: string }[],
): Promise<{
  canales: Map<string, RTCDataChannel>;
  cerrar: () => void;
}> {
  const peers = new Map<
    string,
    {
      peer: RTCPeerConnection;
      canal: RTCDataChannel;
      candidatosPendientes: RTCIceCandidateInit[];
    }
  >();
  const fallar = (error: unknown) => {
    console.error("Falló la conexión WebRTC de transferencia:", error);
  };

  const recibirSenal = (senal: SenalP2P) => {
    if (senal.transferenciaId !== transferenciaId || senal.tipo === "oferta") {
      return;
    }
    const entrada = peers.get(senal.destinatarioSocketId);
    if (!entrada) return;

    void (async () => {
      try {
        if (senal.tipo === "respuesta") {
          await entrada.peer.setRemoteDescription(
            new RTCSessionDescription(senal.valor as RTCSessionDescriptionInit),
          );
          await procesarCandidatosPendientes(
            entrada.peer,
            entrada.candidatosPendientes,
          );
          entrada.candidatosPendientes.length = 0;
        } else {
          const candidato = senal.valor as RTCIceCandidateInit;
          if (entrada.peer.remoteDescription) {
            await entrada.peer.addIceCandidate(new RTCIceCandidate(candidato));
          } else {
            entrada.candidatosPendientes.push(candidato);
          }
        }
      } catch (error) {
        fallar(error);
        entrada.peer.close();
      }
    })();
  };
  canal.on("transferencia:senal", recibirSenal);

  try {
    const aperturas: Promise<void>[] = [];
    for (const destinatario of destinatarios) {
      const peer = crearConexionP2P();
      const dataChannel = peer.createDataChannel("archivos", {
        ordered: true,
      });
      dataChannel.binaryType = "arraybuffer";
      peers.set(destinatario.socketId, {
        peer,
        canal: dataChannel,
        candidatosPendientes: [],
      });
      aperturas.push(esperarCanalAbierto(peer, dataChannel));
      peer.onicecandidate = (evento) => {
        if (evento.candidate) {
          emitirSenal(canal, {
            transferenciaId,
            destinatarioSocketId: destinatario.socketId,
            tipo: "candidato",
            valor: evento.candidate.toJSON(),
          });
        }
      };

      const oferta = await peer.createOffer();
      await peer.setLocalDescription(oferta);
      const descripcion = peer.localDescription;
      if (!descripcion) {
        throw new Error("No se pudo preparar la oferta WebRTC.");
      }
      await emitirSenalConRespuesta(canal, {
        transferenciaId,
        destinatarioSocketId: destinatario.socketId,
        tipo: "oferta",
        valor: descripcion.toJSON(),
      });
    }

    await Promise.all(aperturas);
    return {
      canales: new Map(
        [...peers].map(([socketId, entrada]) => [socketId, entrada.canal]),
      ),
      cerrar: () => {
        canal.off("transferencia:senal", recibirSenal);
        for (const { peer } of peers.values()) peer.close();
      },
    };
  } catch (error) {
    canal.off("transferencia:senal", recibirSenal);
    for (const { peer } of peers.values()) peer.close();
    throw error;
  }
}

export function prepararRecepcionP2P(
  transferenciaId: string,
  alRecibir: (evento: EventoDatosP2P) => void,
  alFallar: (error: Error) => void,
): () => void {
  validarDisponibilidadP2P();
  const canal = obtenerSocket();
  const peers = new Map<string, RTCPeerConnection>();
  const candidatosPendientes = new Map<string, RTCIceCandidateInit[]>();
  let activa = true;

  const recibirSenal = (senal: SenalP2P) => {
    if (
      !activa ||
      senal.transferenciaId !== transferenciaId ||
      senal.destinatarioSocketId !== canal.id ||
      senal.tipo === "respuesta"
    ) {
      return;
    }
    const remitenteSocketId = senal.remitenteSocketId;
    let peer = peers.get(remitenteSocketId);

    void (async () => {
      try {
        if (senal.tipo === "oferta") {
          if (peer) return;
          peer = crearConexionP2P();
          peers.set(remitenteSocketId, peer);
          peer.onicecandidate = (evento) => {
            if (evento.candidate) {
              emitirSenal(canal, {
                transferenciaId,
                destinatarioSocketId: canal.id!,
                tipo: "candidato",
                valor: evento.candidate.toJSON(),
              });
            }
          };
          peer.ondatachannel = ({ channel: dataChannel }) => {
            dataChannel.binaryType = "arraybuffer";
            let archivoActual: string | null = null;
            dataChannel.onmessage = ({ data }) => {
              try {
                if (typeof data === "string") {
                  const mensaje: unknown = JSON.parse(data);
                  if (
                    typeof mensaje !== "object" ||
                    mensaje === null ||
                    !("tipo" in mensaje) ||
                    !("archivoId" in mensaje) ||
                    typeof mensaje.archivoId !== "string"
                  ) {
                    throw new Error("Se recibió un control P2P no válido.");
                  }
                  if (mensaje.tipo === "inicio" && archivoActual === null) {
                    archivoActual = mensaje.archivoId;
                    alRecibir({ tipo: "inicio", archivoId: archivoActual });
                  } else if (
                    mensaje.tipo === "fin" &&
                    archivoActual === mensaje.archivoId
                  ) {
                    alRecibir({ tipo: "fin", archivoId: archivoActual });
                    archivoActual = null;
                  } else {
                    throw new Error(
                      "El flujo de archivos P2P está desordenado.",
                    );
                  }
                } else if (
                  data instanceof ArrayBuffer &&
                  archivoActual !== null
                ) {
                  alRecibir({
                    tipo: "bloque",
                    archivoId: archivoActual,
                    contenido: data,
                  });
                } else {
                  throw new Error("Se recibió un bloque P2P no válido.");
                }
              } catch (error) {
                alFallar(
                  error instanceof Error
                    ? error
                    : new Error("No se pudo procesar el bloque P2P."),
                );
                dataChannel.close();
              }
            };
          };

          await peer.setRemoteDescription(
            new RTCSessionDescription(senal.valor as RTCSessionDescriptionInit),
          );
          const pendientes = candidatosPendientes.get(remitenteSocketId) ?? [];
          await procesarCandidatosPendientes(peer, pendientes);
          candidatosPendientes.delete(remitenteSocketId);
          const respuesta = await peer.createAnswer();
          await peer.setLocalDescription(respuesta);
          const descripcion = peer.localDescription;
          if (!descripcion) {
            throw new Error("No se pudo preparar la respuesta WebRTC.");
          }
          await emitirSenalConRespuesta(canal, {
            transferenciaId,
            destinatarioSocketId: canal.id!,
            tipo: "respuesta",
            valor: descripcion.toJSON(),
          });
        } else {
          const candidato = senal.valor as RTCIceCandidateInit;
          if (peer?.remoteDescription) {
            await peer.addIceCandidate(new RTCIceCandidate(candidato));
          } else {
            const pendientes =
              candidatosPendientes.get(remitenteSocketId) ?? [];
            pendientes.push(candidato);
            candidatosPendientes.set(remitenteSocketId, pendientes);
          }
        }
      } catch (error) {
        peer?.close();
        alFallar(
          error instanceof Error
            ? error
            : new Error("No se pudo establecer la conexión directa."),
        );
      }
    })();
  };

  canal.on("transferencia:senal", recibirSenal);
  return () => {
    activa = false;
    canal.off("transferencia:senal", recibirSenal);
    for (const peer of peers.values()) peer.close();
    peers.clear();
    candidatosPendientes.clear();
  };
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
  validarDisponibilidadP2P();
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
  alPrepararArchivos: (archivos: { id: string; archivo: File }[]) => void,
  alCrearTransferencia: (transferenciaId: string) => void,
  alRecibirDestinatarios: (nombres: string[]) => void,
): Promise<void> {
  const canal = await conectar();
  alActualizar({ estado: "solicitando", enviados: 0, total: 0 });

  const eventosListos = new Map<string, EventoListo>();
  const resolutoresListos = new Map<string, (evento: EventoListo) => void>();
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
  let conexionP2P:
    { canales: Map<string, RTCDataChannel>; cerrar: () => void } | undefined;
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

    conexionP2P = await prepararCanalesEnvio(
      canal,
      transferenciaId,
      eventoListo.destinatarios,
    );
    const canalesEnvio = conexionP2P.canales;
    for (const [indice, archivo] of archivos.entries()) {
      const archivoId = archivosTransferencia[indice]?.id;
      if (!archivoId) {
        throw new Error("No se pudo identificar uno de los archivos.");
      }
      for (const dataChannel of canalesEnvio.values()) {
        dataChannel.send(JSON.stringify({ tipo: "inicio", archivoId }));
      }
      let enviados = 0;
      for (let inicio = 0; inicio < archivo.size; inicio += TAMANO_BLOQUE) {
        const contenido = await archivo
          .slice(inicio, inicio + TAMANO_BLOQUE)
          .arrayBuffer();
        for (const dataChannel of canalesEnvio.values()) {
          await esperarBufferDisponible(dataChannel);
          dataChannel.send(contenido);
        }
        enviados += contenido.byteLength;
        alActualizar({
          estado: "enviando",
          archivoId,
          nombreArchivo: archivo.name,
          enviados,
          total: archivo.size,
        });
      }
      for (const dataChannel of canalesEnvio.values()) {
        dataChannel.send(JSON.stringify({ tipo: "fin", archivoId }));
      }
      await Promise.all([...canalesEnvio.values()].map(esperarColaVacia));
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
    conexionP2P?.cerrar();
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
