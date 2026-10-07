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

export function establecerCargaBoton(
  boton: HTMLButtonElement,
  cargando: boolean,
  texto?: string,
) {
  if (texto !== undefined) boton.textContent = texto;
  boton.disabled = cargando;

  if (cargando) {
    boton.dataset.loading = "true";
    boton.setAttribute("aria-busy", "true");
  } else {
    delete boton.dataset.loading;
    boton.removeAttribute("aria-busy");
  }
}
