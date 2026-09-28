import { formatearHora } from "./fecha";
import { estados, escaparHtml } from "./pedido-detalle";
import type { HistorialPedido } from "../types/pedido";

export async function copiarMensaje(
  mensaje: string,
  boton: HTMLButtonElement,
  textoElemento?: HTMLElement | null,
  textoOriginal = "Copiar",
): Promise<void> {
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(mensaje);
        mostrarMensajeCopiado(boton, textoElemento, textoOriginal);
        return;
      } catch {
        // Se intenta el método alternativo cuando el navegador bloquea la API.
      }
    }

    const textarea = document.createElement("textarea");

    textarea.value = mensaje;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.padding = "0";
    textarea.style.border = "0";
    textarea.style.outline = "0";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copiado = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copiado) {
      throw new Error("El navegador no permitió copiar el mensaje.");
    }

    mostrarMensajeCopiado(boton, textoElemento, textoOriginal);
  } catch (error) {
    console.error("Error copiando mensaje:", error);

    const labelActual =
      textoElemento?.textContent ?? boton.textContent ?? textoOriginal;

    if (textoElemento) {
      textoElemento.textContent = "No se pudo copiar";
    }

    boton.disabled = true;

    setTimeout(() => {
      if (textoElemento) {
        textoElemento.textContent = labelActual;
      }
      boton.disabled = false;
    }, 1800);
  }
}

export function mostrarMensajeCopiado(
  boton: HTMLButtonElement,
  textoElemento?: HTMLElement | null,
  textoOriginal = "Copiar",
): void {
  const textoActual =
    textoElemento?.textContent ?? boton.textContent ?? textoOriginal;

  if (textoElemento) {
    textoElemento.textContent = "¡Mensaje copiado!";
  }

  boton.disabled = true;

  setTimeout(() => {
    if (textoElemento) {
      textoElemento.textContent = textoActual;
    }
    boton.disabled = false;
  }, 1800);
}

export function mostrarOverlayElement(
  overlay: HTMLElement | null,
  backdrop: HTMLElement | null,
  panel: HTMLElement | null,
): void {
  overlay?.classList.remove("pointer-events-none", "invisible");

  requestAnimationFrame(() => {
    backdrop?.classList.remove("opacity-0");
    panel?.classList.remove("translate-x-full");
  });

  document.body.classList.add("overflow-hidden");
}

export function ocultarOverlayElement(
  overlay: HTMLElement | null,
  backdrop: HTMLElement | null,
  panel: HTMLElement | null,
): void {
  backdrop?.classList.add("opacity-0");
  panel?.classList.add("translate-x-full");

  setTimeout(() => {
    overlay?.classList.add("pointer-events-none", "invisible");
    document.body.classList.remove("overflow-hidden");
  }, 200);
}

export function mostrarModalElement(modal: HTMLElement | null): void {
  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

export function ocultarModalElement(modal: HTMLElement | null): void {
  if (!modal) {
    return;
  }

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

export function renderizarHistorialElement(
  historial: HTMLElement | null,
  registros: HistorialPedido[],
  historialCantidad: HTMLElement | null,
): void {
  if (!historial) {
    return;
  }

  if (historialCantidad) {
    historialCantidad.textContent = `${registros.length} ${
      registros.length === 1 ? "cambio" : "cambios"
    }`;
  }

  if (registros.length === 0) {
    historial.innerHTML = `
      <p class="text-sm text-slate-400">
        No hay cambios registrados todavía.
      </p>
    `;

    return;
  }

  historial.innerHTML = registros
    .map((registro) => {
      const anterior = estados[registro.estadoAnterior];
      const nuevo = estados[registro.estadoNuevo];

      return `
        <div class="relative flex gap-3 pb-5 last:pb-0">
          <div class="flex w-5 shrink-0 justify-center">
            <span class="mt-1.5 h-2 w-2 rounded-full bg-slate-300"></span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5 text-sm">
              <span class="font-medium text-slate-600">
                ${escaparHtml(anterior?.label ?? registro.estadoAnterior)}
              </span>

              <span class="text-slate-300">→</span>

              <span class="font-semibold text-slate-800">
                ${escaparHtml(nuevo?.label ?? registro.estadoNuevo)}
              </span>
            </div>

            <div class="mt-1 flex flex-wrap gap-x-2 text-xs text-slate-400">
              <span>${escaparHtml(registro.usuario ?? "Usuario")}</span>
              <span>•</span>
              <span>${formatearHora(registro.fecha)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}
