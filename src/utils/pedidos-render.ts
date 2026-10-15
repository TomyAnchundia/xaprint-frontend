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

export function crearBotonCopiarEtiqueta(pedido: Pedido): string {
  const etiqueta = `${pedido.cliente.nombre} ${formatearMedidas(pedido)} ${formatearPrecio(pedido.valorCobrar)}`;

  return `
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      title="Copiar etiqueta de impresión"
      aria-label="Copiar etiqueta de impresión"
      data-etiqueta="${encodeURIComponent(etiqueta)}"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M7.5 7.5h.008v.008H7.5V7.5zM3 3h6.586a2 2 0 011.414.586l9.414 9.414a2 2 0 010 2.828l-5.172 5.172a2 2 0 01-2.828 0L3.586 11.586A2 2 0 013 10.172V3z"
        />
      </svg>
    </button>
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

export function crearFilaPedido(pedido: Pedido): string {
  const estado = estados[pedido.estado];
  const botonCopiarTelefono = pedido.cliente.telefono
    ? crearBotonCopiarTelefono(pedido.cliente.telefono)
    : "";
  const botonCopiarEtiqueta = crearBotonCopiarEtiqueta(pedido);

  return `
    <tr
      data-pedido-row-id="${pedido.id}"
      tabindex="0"
      aria-label="Abrir detalle del pedido ${pedido.id}"
      aria-haspopup="dialog"
      title="Abrir detalle del pedido"
      class="pedido-row group cursor-pointer transition-colors duration-150 hover:bg-slate-100/70 focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-700 active:bg-slate-200"
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
          <p class="pedido-cliente font-semibold text-slate-800">
            ${escaparHtml(pedido.cliente.nombre)}
          </p>

          <div class="mt-0.5 flex flex-wrap items-center gap-1">
            ${
              pedido.cliente.telefono
                ? `
                  <span class="text-xs text-slate-400">
                    ${escaparHtml(pedido.cliente.telefono)}
                  </span>

                  ${botonCopiarTelefono}
                `
                : ""
            }
            ${botonCopiarEtiqueta}
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
