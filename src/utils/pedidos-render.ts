import type { Pedido } from "../types/pedido";
import { formatearFecha, formatearHora } from "./fecha";
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
      class="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
    </button>
  `;
}

export function crearFilaPedido(pedido: Pedido): string {
  const estado = estados[pedido.estado];
  const botonCopiarTelefono = pedido.cliente.telefono
    ? crearBotonCopiarTelefono(pedido.cliente.telefono)
    : "";

  return `
    <tr
      data-pedido-row-id="${pedido.id}"
      tabindex="0"
      aria-label="Abrir detalle del pedido ${pedido.id}"
      aria-haspopup="dialog"
      title="Abrir detalle del pedido"
      class="group cursor-pointer transition-colors duration-150 hover:bg-cyan-50/70 focus-visible:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-700 active:bg-cyan-100"
    >
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
          <p class="font-semibold text-slate-800 transition-colors group-hover:text-cyan-950">
            ${escaparHtml(pedido.cliente.nombre)}
          </p>

          ${
            pedido.cliente.telefono
              ? `
                <div class="mt-0.5 flex items-center gap-1">
                  <span class="text-xs text-slate-400">
                    ${escaparHtml(pedido.cliente.telefono)}
                  </span>

                  ${botonCopiarTelefono}
                </div>
              `
              : ""
          }
        </div>
      </td>

      <td class="px-5 py-4">
        <span class="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors group-hover:bg-white">
          ${pedido.servicio}
        </span>
      </td>

      <td class="px-5 py-4 text-slate-500">
        ${formatearMedidas(pedido)}
      </td>

      <td class="px-5 py-4">
        <span class="inline-flex rounded-md bg-cyan-50 px-2 py-1 font-semibold text-cyan-900 transition-colors group-hover:bg-cyan-100">
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

      <td class="px-5 py-4 text-right">
        <button
          type="button"
          data-pedido-id="${pedido.id}"
          class="rounded-lg border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:bg-white hover:text-cyan-800 group-hover:text-cyan-700"
          aria-label="Ver pedido ${pedido.id}"
          title="Ver pedido"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </td>
    </tr>
  `;
}
