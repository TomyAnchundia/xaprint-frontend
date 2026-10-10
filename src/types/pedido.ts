export type EstadoPedido =
  | "REVISION"
  | "IMPRIMIENDO"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADO";

export type ServicioPedido = "TEXTIL" | "UV";

export type EstadoPagoPedido = "NO_PAGADO" | "PARCIALMENTE_PAGADO" | "PAGADO";

export interface ClientePedido {
  id: number;
  nombre: string;
  telefono: string | null;
  tarifaEspecial: boolean;
}

export interface Pedido {
  id: number;

  cliente: ClientePedido;

  estado: EstadoPedido;

  estadoPago: EstadoPagoPedido;

  prioridad: number;

  costoDiseno: number | null;

  aporteDesarrollador: number | null;

  servicio: ServicioPedido;

  ancho: number;

  largo: number | null;

  precioCalculado: number | null;

  precioEspecial: number | null;

  precioEspecialUsuarioId: number | null;

  precioEspecialFecha: string | null;

  valorCobrar: number | null;

  contraer: boolean | null;

  precioFinal: number | null;

  velocidad: number | null;

  obstruccion: boolean | null;

  observaciones: string | null;

  fechaEntrega: string | null;

  createdAt: string;

  updatedAt: string;
}

export interface HistorialPedido {
  id: number;

  estadoAnterior: EstadoPedido;

  estadoNuevo: EstadoPedido;

  fecha: string;

  usuario: string;
}
