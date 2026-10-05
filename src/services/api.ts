import type {
  HistorialPedido,
  Pedido,
  ServicioPedido,
  EstadoPedido,
} from "../types/pedido";

export type { ServicioPedido } from "../types/pedido";

const API_URL =
  import.meta.env.PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:3000`
    : "http://localhost:3000");

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string | null;
  cedula?: string | null;
  direccion?: string | null;
}

export interface Usuario {
  id: number;
  username: string;
  rol: "ADMIN" | "DISENADOR" | "DISEÑADOR" | "EMPLEADO";
  area: "TEXTIL31" | "TEXTIL58" | "UV";
}

export interface CrearUsuarioData {
  username: string;
  password: string;
  rol: "ADMIN" | "DISENADOR" | "EMPLEADO";
  area: Usuario["area"];
}

export type ActualizarUsuarioData = Partial<CrearUsuarioData>;

export interface Tarifa {
  id: number;
  servicio: ServicioPedido;
  ancho: number;
  desde: number;
  hasta: number | null;
  precio: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TarifaData {
  servicio: ServicioPedido;
  ancho: number;
  desde: number;
  hasta?: number | null;
  precio: number;
}

export interface ResumenProduccionItem {
  metros: number;
  total: number;
  aporteDesarrollador: number;
  ingresoNegocio: number;
}

export interface ResumenProduccion {
  fecha: string;
  textil58: ResumenProduccionItem;
  textil31: ResumenProduccionItem;
  uv: ResumenProduccionItem;
  totalGeneral: ResumenProduccionItem;
}

export interface ResumenPagos {
  fecha: string;
  cobradoHoy: number;
  porCobrar: number;
  pedidosPorCobrar: number;
  aporteDesarrolladorAcumulado: number;
}

export interface ResumenPagosPeriodo {
  desde: string;
  hasta: string;
  cobrado: number;
  porCobrar: number;
  pedidosPorCobrar: number;
}

export interface PagoDesarrollador {
  id: number;
  monto: number;
  fecha: string;
  usuario: { id: number; username: string };
}

export interface ResumenAporteDesarrollador {
  periodo: string;
  aporteDevengado: number;
  totalPagado: number;
  pendiente: number;
  pagos: PagoDesarrollador[];
}

export interface ResultadoPagoPedido {
  pagoId?: number;
  pagoRevertido?: number;
  pedidoId: number;
  monto: number;
  estadoPago: "NO_PAGADO" | "PARCIALMENTE_PAGADO" | "PAGADO";
}

export interface DeudaCliente {
  cliente: Pick<Cliente, "id" | "nombre" | "telefono">;
  pedidos: { id: number; total: number; pagado: number; porCobrar: number }[];
  totalDeuda: number;
}

export interface ResumenDeudaCliente {
  cliente: Pick<Cliente, "id" | "nombre" | "telefono">;
  pedidosConDeuda: number;
  totalDeuda: number;
}

export interface PagoCliente {
  id: number;
  monto: number;
  fecha: string;
  usuario: { id: number; username: string };
  aplicaciones: { pedidoId: number; monto: number }[];
}

export interface HistorialPagosCliente {
  cliente: Pick<Cliente, "id" | "nombre" | "telefono">;
  pagos: PagoCliente[];
}

export interface CrearClienteData {
  nombre: string;
  telefono?: string | null;
  cedula?: string | null;
  direccion?: string | null;
}

export interface CrearPedidoData {
  clienteId: number;
  servicio: ServicioPedido;
  ancho: number;
  largo?: number | null;
  contraer?: boolean;
  velocidad?: number;
  obstruccion?: boolean;
  observaciones?: string;
  prioridad?: number;
  fechaEntrega?: string | null;
}

export interface ActualizarPedidoData {
  clienteId?: number;
  costoDiseno?: number;
  servicio?: ServicioPedido;
  ancho?: number;
  largo?: number | null;
  contraer?: boolean | null;
  velocidad?: number | null;
  obstruccion?: boolean | null;
  observaciones?: string;
  prioridad?: number;
  fechaEntrega?: string | null;
}
export interface CalcularPrecioData {
  servicio: ServicioPedido;
  ancho: number;
  largo: number;
}

export interface CalcularPrecioResponse {
  precio?: number | string;
  valorCobrar?: number | string;
  valor_cobrar?: number | string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export interface HistorialGeneralItem {
  id: number;
  pedidoId: number;

  estadoAnterior: EstadoPedido;
  estado: "ENTREGADO" | "CANCELADO";

  fecha: string;

  cliente: Cliente | null;

  servicio: ServicioPedido;
  ancho: number;
  largo: number | null;

  precioCalculado: number | null;
  precioEspecial: number | null;
  precioFinal: number | null;

  prioridad: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("centro-control-token")
      : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers ?? {}),
    },
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Ocurrió un error al comunicarse con el servidor.";

    throw new ApiError(message, response.status);
  }

  return data as T;
}

export async function obtenerPedidos(): Promise<Pedido[]> {
  return request<Pedido[]>("/pedidos");
}

export async function obtenerPedido(id: number): Promise<Pedido> {
  return request<Pedido>(`/pedidos/${id}`);
}

export async function eliminarPedido(id: number): Promise<Pedido> {
  return request<Pedido>(`/pedidos/${id}`, { method: "DELETE" });
}

export async function obtenerHistorialPedido(
  id: number,
): Promise<HistorialPedido[]> {
  return request<HistorialPedido[]>(`/pedidos/${id}/historial`);
}

export async function obtenerClientes(): Promise<Cliente[]> {
  return request<Cliente[]>("/clientes");
}

export async function actualizarCliente(
  id: number,
  data: Partial<CrearClienteData>,
): Promise<Cliente> {
  return request<Cliente>(`/clientes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function eliminarCliente(id: number): Promise<Cliente> {
  return request<Cliente>(`/clientes/${id}`, { method: "DELETE" });
}

export async function obtenerDeudaCliente(id: number): Promise<DeudaCliente> {
  return request<DeudaCliente>(`/pagos/deuda/${id}`);
}

export async function obtenerDeudasClientes(): Promise<ResumenDeudaCliente[]> {
  return request<ResumenDeudaCliente[]>("/pagos/deudas");
}

export async function obtenerPagosCliente(
  id: number,
): Promise<HistorialPagosCliente> {
  return request<HistorialPagosCliente>(`/pagos/cliente/${id}`);
}

export async function registrarPagoPedido(
  pedidoId: number,
): Promise<ResultadoPagoPedido> {
  return request<ResultadoPagoPedido>(`/pagos/pedido/${pedidoId}`, {
    method: "POST",
  });
}

export async function registrarAbonoCliente(
  clienteId: number,
  monto: number,
): Promise<{ pagoId: number; monto: number; aplicado: number }> {
  return request<{ pagoId: number; monto: number; aplicado: number }>(
    "/pagos",
    {
      method: "POST",
      body: JSON.stringify({ clienteId, monto }),
    },
  );
}

export async function revertirUltimoPagoPedido(
  pedidoId: number,
): Promise<ResultadoPagoPedido> {
  return request<ResultadoPagoPedido>(`/pagos/pedido/${pedidoId}/ultimo`, {
    method: "DELETE",
  });
}

export async function obtenerUsuarios(): Promise<Usuario[]> {
  return request<Usuario[]>("/usuarios");
}

export async function crearUsuario(data: CrearUsuarioData): Promise<Usuario> {
  return request<Usuario>("/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarUsuario(
  id: number,
  data: ActualizarUsuarioData,
): Promise<Usuario> {
  return request<Usuario>(`/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function eliminarUsuario(id: number): Promise<Usuario> {
  return request<Usuario>(`/usuarios/${id}`, { method: "DELETE" });
}

export async function obtenerTarifas(): Promise<Tarifa[]> {
  return request<Tarifa[]>("/tarifas");
}

export async function crearTarifa(data: TarifaData): Promise<Tarifa> {
  return request<Tarifa>("/tarifas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarTarifa(
  id: number,
  data: TarifaData,
): Promise<Tarifa> {
  return request<Tarifa>(`/tarifas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function cambiarTarifaActiva(
  id: number,
  activo: boolean,
): Promise<Tarifa> {
  return request<Tarifa>(`/tarifas/${id}/activo`, {
    method: "PATCH",
    body: JSON.stringify({ activo }),
  });
}

export async function obtenerResumenProduccion(
  fecha: string,
): Promise<ResumenProduccion> {
  return request<ResumenProduccion>(
    `/produccion?fecha=${encodeURIComponent(fecha)}`,
  );
}

export async function obtenerResumenPagos(
  fecha: string,
): Promise<ResumenPagos> {
  return request<ResumenPagos>(
    `/pagos/resumen?fecha=${encodeURIComponent(fecha)}`,
  );
}

export async function obtenerResumenPagosPeriodo(
  desde: string,
  hasta: string,
): Promise<ResumenPagosPeriodo> {
  const params = new URLSearchParams({ desde, hasta });
  return request<ResumenPagosPeriodo>(`/pagos/resumen-periodo?${params}`);
}

export async function obtenerResumenAporteDesarrollador(
  periodo: string,
): Promise<ResumenAporteDesarrollador> {
  return request<ResumenAporteDesarrollador>(
    `/pagos/desarrollador?periodo=${encodeURIComponent(periodo)}`,
  );
}

export async function registrarPagoDesarrollador(
  periodo: string,
  monto: number,
): Promise<{ pagoId: number; periodo: string; monto: number }> {
  return request<{ pagoId: number; periodo: string; monto: number }>(
    "/pagos/desarrollador",
    {
      method: "POST",
      body: JSON.stringify({ periodo, monto }),
    },
  );
}

export async function crearCliente(data: CrearClienteData): Promise<Cliente> {
  return request<Cliente>("/clientes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function crearPedido(data: CrearPedidoData): Promise<Pedido> {
  return request<Pedido>("/pedidos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function calcularPrecio(
  data: CalcularPrecioData,
): Promise<CalcularPrecioResponse> {
  return request<CalcularPrecioResponse>("/precios/calcular", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function calcularCotizacionTarifa(
  tarifaId: number,
  largo: number,
): Promise<CalcularPrecioResponse> {
  return request<CalcularPrecioResponse>(
    `/precios/tarifa/${tarifaId}?largo=${encodeURIComponent(largo)}`,
  );
}

export async function cambiarEstadoPedido(
  id: number,
  estado: EstadoPedido,
): Promise<Pedido> {
  return request<Pedido>(`/pedidos/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado }),
  });
}

export async function actualizarPedido(
  id: number,
  data: ActualizarPedidoData,
): Promise<Pedido> {
  return request<Pedido>(`/pedidos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export async function obtenerHistorialGeneral(): Promise<
  HistorialGeneralItem[]
> {
  return request<HistorialGeneralItem[]>("/pedidos/historial");
}
export async function cambiarPrecioEspecial(
  id: number,
  precioEspecial: number | null,
): Promise<Pedido> {
  return request<Pedido>(`/pedidos/${id}/precio-especial`, {
    method: "PATCH",
    body: JSON.stringify({ precioEspecial }),
  });
}
