export type TipoNotificacion = "success" | "error" | "info";

export function mostrarNotificacion(
  mensaje: string,
  tipo: TipoNotificacion = "success",
) {
  window.dispatchEvent(
    new CustomEvent("centro-control:notificacion", {
      detail: { mensaje, tipo },
    }),
  );
}
