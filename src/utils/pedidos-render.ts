import type { Pedido } from "../types/pedido";
import {
  formatearFecha,
  formatearFechaCorta,
  formatearHora,
} from "./fecha";
import {
  estados,
  escaparHtml,
  formatearMedidas,
  formatearPrecio,
} from "./pedidos-lista";

export function crearBotonCopiarTelefono(telefono: string): string {
  return `
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
      title="Copiar número"
      aria-label="Copiar número"
      data-telefono="${escaparHtml(telefono)}"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8 7V5a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-2M6 7h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2z"
        />
      </svg>
      <span>Copiar teléfono</span>
    </button>
  `;
}

export function crearBotonCopiarEtiqueta(pedido: Pedido): string {
  const etiqueta = `${pedido.cliente.nombre} ${formatearMedidas(pedido)} ${formatearPrecio(pedido.valorCobrar)}`;

  return `
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      title="Copiar etiqueta de impresión"
      aria-label="Copiar etiqueta de impresión"
      data-etiqueta="${encodeURIComponent(etiqueta)}"
    >
      <span
        class="material-symbols-rounded pedido-accion-icono leading-none"
        aria-hidden="true"
      >sell</span>
    </button>
  `;
}

function crearPopoverMensajes(
  pedido: Pedido,
  esTarjeta = false,
): string {
  const popoverId = `pedido-mensajes-${esTarjeta ? "tarjeta-" : ""}${pedido.id}`;
  const botonCopiarTelefono = pedido.cliente.telefono
    ? crearBotonCopiarTelefono(pedido.cliente.telefono)
    : "";

  return `
    <div class="relative">
      <button
        type="button"
        data-pedido-mensajes-trigger
        data-popover-target="${popoverId}"
        data-popover-trigger="hover"
        aria-label="Copiar mensajes del pedido ${pedido.id}"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="${popoverId}"
        title="Copiar mensajes"
        class="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-cyan-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
      >
        <span
          class="material-symbols-rounded pedido-accion-icono leading-none"
          aria-hidden="true"
        >send</span>
      </button>

      <div
        id="${popoverId}"
        data-pedido-mensajes-popover
        role="dialog"
        aria-label="Mensajes para el pedido ${pedido.id}"
        class="invisible absolute z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 text-sm opacity-0 shadow-lg transition-opacity"
      >
        <p class="px-2 py-1 text-xs font-semibold text-slate-500">
          Acciones rápidas
        </p>
        ${botonCopiarTelefono}
        <button
          type="button"
          data-copiar-mensaje="listo"
          data-pedido-id-mensaje="${pedido.id}"
          class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-emerald-800 transition hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
        >
          <svg
            class="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Impresión lista</span>
        </button>
        <button
          type="button"
          data-copiar-mensaje="precio"
          data-pedido-id-mensaje="${pedido.id}"
          class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-violet-800 transition hover:bg-violet-50 focus:bg-violet-50 focus:outline-none"
        >
          <svg
            class="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
            />
          </svg>
          <span>Detalle del precio</span>
        </button>
        <div data-popper-arrow></div>
      </div>
    </div>
  `;
}

export function crearIconosMetodoPago(
  metodosPago: readonly string[] | null | undefined,
): string {
  const iconos = {
    Efectivo: `
      <svg class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
        <path d="M560-440q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-320q-33 0-56.5-23.5T200-400v-320q0-33 23.5-56.5T280-800h560q33 0 56.5 23.5T920-720v320q0 33-23.5 56.5T840-320H280Zm80-80h400q0-33 23.5-56.5T840-480v-160q-33 0-56.5-23.5T760-720H360q0 33-23.5 56.5T280-640v160q33 0 56.5 23.5T360-400Zm440 240H120q-33 0-56.5-23.5T40-240v-440h80v440h680v80ZM280-400v-320 320Z"/>
      </svg>
    `,
    Transferencia: `
      <svg class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
        <path d="M200-280v-280h80v280h-80Zm240 0v-280h80v280h-80ZM80-120v-80h800v80H80Zm600-160v-280h80v280h-80ZM80-640v-80l400-200 400 200v80H80Zm178-80h444L480-830 258-720Z"/>
      </svg>
    `,
  } as const;
  const nombres: readonly ("Efectivo" | "Transferencia")[] = [
    "Efectivo",
    "Transferencia",
  ];
  const metodos = nombres.filter((metodo) => metodosPago?.includes(metodo));

  return metodos
    .map(
      (metodo) => `
        <span
          class="inline-flex h-5 w-5 items-center justify-center text-emerald-800"
          title="${metodo}"
          aria-label="${metodo}"
        >
          ${iconos[metodo]}
        </span>
      `,
    )
    .join("");
}

function crearIndicadorCambioEstado(
  accion: "avanzar" | "retroceder" | undefined,
): string {
  if (!accion) return "";

  const texto =
    accion === "avanzar" ? "Avanzando estado..." : "Retrocediendo estado...";
  return `
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-800"
      role="status"
      aria-live="polite"
    >
      ${texto}
    </span>
  `;
}

export function crearFilaPedido(
  pedido: Pedido,
  accionEnCurso?: "avanzar" | "retroceder",
): string {
  const estado = estados[pedido.estado];
  const indicadorCambioEstado = crearIndicadorCambioEstado(accionEnCurso);
  const fechaVencimientoReferencia =
    new Date(pedido.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000;
  const referenciaDisponible =
    Number.isFinite(fechaVencimientoReferencia) &&
    fechaVencimientoReferencia > Date.now() &&
    pedido.estado !== "ENTREGADO" &&
    pedido.estado !== "CANCELADO";

  return `
    <tr
      data-pedido-row-id="${pedido.id}"
      tabindex="0"
      aria-busy="${Boolean(accionEnCurso)}"
      aria-label="Abrir detalle del pedido ${pedido.id}"
      aria-haspopup="dialog"
      title="Abrir detalle del pedido"
      class="pedido-row group cursor-pointer transition-colors duration-150 ${accionEnCurso ? "bg-cyan-50/60" : ""} hover:bg-slate-100/70 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-700 active:bg-slate-200"
    >
      <td class="px-3 py-4">
        <input
          type="checkbox"
          data-pedido-seleccion="${pedido.id}"
          aria-label="Seleccionar pedido #${pedido.id}"
          class="h-4 w-4 rounded border-slate-300 accent-cyan-700 focus:ring-cyan-600"
        />
      </td>
      <td class="px-5 py-4">
        <div class="flex items-center gap-2">
          ${
            pedido.prioridad > 0
              ? `
                <span
                  class="h-2 w-2 shrink-0 rounded-full bg-orange-500"
                  title="Prioridad alta"
                ></span>
              `
              : ""
          }

          <div class="flex flex-col">
            <span class="text-xs font-normal text-slate-400">
              ${formatearFecha(pedido.createdAt)}
            </span>

            <span class="text-base font-semibold text-slate-700">
              ${formatearHora(pedido.createdAt)}
            </span>
          </div>
        </div>
      </td>

      <td class="px-5 py-4">
        <div>
          <div class="flex items-center gap-1">
            <p class="pedido-cliente font-semibold text-slate-800">
              ${escaparHtml(pedido.cliente.nombre)}
            </p>
            ${crearBotonCopiarEtiqueta(pedido)}
            ${crearPopoverMensajes(pedido)}
          </div>

          <div class="mt-0.5 flex flex-wrap items-center gap-1">
            ${
              pedido.cliente.telefono
                ? `
                  <span class="text-xs text-slate-400">
                    ${escaparHtml(pedido.cliente.telefono)}
                  </span>
                `
                : ""
            }
            ${indicadorCambioEstado}
          </div>
        </div>
      </td>

      <td class="px-5 py-4">
        <span class="pedido-servicio inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          ${pedido.servicio}
        </span>
      </td>

      <td class="px-5 py-4 text-slate-500">
        ${formatearMedidas(pedido)}
      </td>

      <td class="px-5 py-4">
        <span class="pedido-precio inline-flex rounded-md bg-cyan-50 px-2 py-1 font-semibold text-cyan-900">
          ${formatearPrecio(pedido.valorCobrar)}
        </span>

        ${
          pedido.precioEspecial !== null
            ? `
              <span class="ml-1 text-xs font-normal text-violet-500">
                especial
              </span>
            `
            : ""
        }
        ${
          pedido.aplicaPromocion
            ? `
              <span class="ml-1 text-xs font-semibold text-amber-700">
                promo
              </span>
            `
            : ""
        }
      </td>

      <td class="px-5 py-4">
        <span
          class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
            estado?.clase ?? "bg-slate-100 text-slate-600"
          }"
        >
          ${estado?.label ?? pedido.estado}
        </span>
      </td>

      <td class="px-5 py-4">
        <div class="inline-flex items-center gap-1.5">
          <span
            class="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
              pedido.estadoPago === "PAGADO"
                ? "bg-emerald-50 text-emerald-700"
                : pedido.estadoPago === "PARCIALMENTE_PAGADO"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-slate-100 text-slate-600"
            }"
          >
            ${
              pedido.estadoPago === "PAGADO"
                ? "Pagado"
                : pedido.estadoPago === "PARCIALMENTE_PAGADO"
                  ? "Abono parcial"
                  : "No pagado"
            }
          </span>
          ${
            pedido.estadoPago === "PAGADO"
              ? crearIconosMetodoPago(pedido.metodosPago)
              : ""
          }
        </div>
      </td>

      <td class="px-5 py-4 text-right">
        <div class="inline-flex items-center gap-1">
          ${
            referenciaDisponible
              ? `
                <button
                  type="button"
                  data-referencia-preview="${pedido.id}"
                  class="pedido-accion rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-cyan-200 hover:bg-white hover:text-cyan-800"
                  aria-label="Vista previa de imagen del pedido ${pedido.id}"
                  title="Vista previa de imagen"
                >
                  <span
                    class="material-symbols-rounded text-[20px] leading-none"
                    aria-hidden="true"
                  >image</span>
                </button>
              `
              : ""
          }
          <button
            type="button"
            data-pedido-id="${pedido.id}"
            class="pedido-accion rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-cyan-800"
            aria-label="Ver pedido ${pedido.id}"
            title="Ver pedido"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

export function crearTarjetaPedido(
  pedido: Pedido,
  accionEnCurso?: "avanzar" | "retroceder",
): string {
  const estado = estados[pedido.estado];
  const indicadorCambioEstado = crearIndicadorCambioEstado(accionEnCurso);
  const servicio =
    pedido.servicio === "TEXTIL"
      ? `Textil ${pedido.ancho} cm`
      : "UV";

  return `
    <article
      aria-busy="${Boolean(accionEnCurso)}"
      class="rounded-xl border ${accionEnCurso ? "border-cyan-300 bg-cyan-50/30" : "border-slate-200 bg-white"} shadow-sm"
    >
      <div class="flex items-start gap-3 p-4">
        <button
          type="button"
          data-pedido-card-open="${pedido.id}"
          aria-label="Abrir detalle del pedido ${pedido.id}"
          class="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-700"
        >
          <div class="flex min-w-0 items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              ${
                pedido.prioridad > 0
                  ? '<span class="h-2 w-2 shrink-0 rounded-full bg-orange-500" title="Prioridad alta" aria-hidden="true"></span>'
                  : ""
              }
              <span class="truncate text-sm font-semibold text-slate-800">
                ${escaparHtml(pedido.cliente.nombre)}
              </span>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                estado?.clase ?? "bg-slate-100 text-slate-600"
              }"
            >
              ${estado?.label ?? pedido.estado}
            </span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <span>Pedido #${pedido.id}</span>
            <span aria-hidden="true">·</span>
            <time>
              ${formatearFechaCorta(pedido.createdAt)}
              ${formatearHora(pedido.createdAt)}
            </time>
          </div>

          ${
            indicadorCambioEstado
              ? `<div class="mt-2">${indicadorCambioEstado}</div>`
              : ""
          }

          <div class="mt-3 flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-slate-600">${servicio}</span>
            <span
              class="material-symbols-rounded text-lg leading-none text-slate-400"
              aria-hidden="true"
            >chevron_right</span>
          </div>
        </button>

        <div class="flex shrink-0 flex-col items-center justify-between self-stretch">
          ${crearPopoverMensajes(pedido, true)}
          <input
            type="checkbox"
            data-pedido-seleccion="${pedido.id}"
            aria-label="Seleccionar pedido #${pedido.id}"
            class="h-4 w-4 shrink-0 rounded border-slate-300 accent-cyan-700 focus:ring-cyan-600"
          />
        </div>
      </div>
    </article>
  `;
}
