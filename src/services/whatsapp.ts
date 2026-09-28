import type { Pedido } from "../types/pedido";

export function generarMensajePedidoListo(pedido: Pedido): string {
  return `Le informamos que su impresión ya está lista y puede pasar a retirarla.`;
}

export function generarMensajePrecio(pedido: Pedido): string {
  const medidas =
    pedido.largo === null
      ? `${pedido.ancho} cm`
      : `${pedido.ancho} × ${pedido.largo} cm`;

  const precio =
    pedido.precioFinal !== null
      ? `$${pedido.precioFinal.toFixed(2)}`
      : "Por confirmar";

  return `Detalle de su pedido:
            • Servicio: ${pedido.servicio}
            • Medida: ${medidas}
            • Total: ${precio}

        `;
}
