import type { UsuarioSesion } from "./auth";
import type { Pedido, ServicioPedido } from "../types/pedido";

export type VistaDashboard =
  | "pedidos"
  | "historial"
  | "clientes"
  | "usuarios"
  | "tarifas"
  | "estadisticas";

export function puedeVerVista(
  vista: string,
  usuario: UsuarioSesion | null,
): vista is VistaDashboard {
  if (!usuario) return false;
  if (usuario.rol === "ADMIN") return true;

  if (usuario.rol === "DISENADOR") {
    return !["usuarios", "tarifas", "estadisticas"].includes(vista);
  }

  return vista === "pedidos" || vista === "historial";
}

export function pedidoPerteneceAlArea(
  pedido:
    | Pick<Pedido, "servicio" | "ancho">
    | {
        servicio: ServicioPedido;
        ancho: number;
      },
  usuario: UsuarioSesion | null,
): boolean {
  if (!usuario || usuario.rol !== "EMPLEADO") return true;
  if (!usuario.area) return false;

  if (usuario.area === "UV") return pedido.servicio === "UV";

  return (
    pedido.servicio === "TEXTIL" &&
    pedido.ancho === (usuario.area === "TEXTIL31" ? 31 : 58)
  );
}
