import { formatearPrecio } from "./pedidos-lista";
import { formatearFechaCorta } from "./fecha";
import { cargarLogoXaprintPng } from "./logo-xaprint";

const anchoImagen = 640;
const escalaImagen = 2;
const margen = 40;
const fuente = "Arial, Helvetica, sans-serif";

export interface PedidoResumenImagen {
  fecha: string;
  servicio: string;
  medidas: string;
  valor: number;
  abonado: number;
  porCobrar: number;
  aplicaPromocion: boolean;
}

export interface ResumenPedidosImagen {
  cliente: string;
  pedidos: PedidoResumenImagen[];
  total: number;
  totalPedidos: number;
  totalAbonado: number;
}

export interface ResultadoCompartirResumen {
  copiada: boolean;
  motivo?: string;
}

export interface OpcionesCopiarImagenResumen {
  descargarSiNoSePuedeCopiar?: boolean;
  intentarEnContextoNoSeguro?: boolean;
}

function dibujarRectangulo(
  contexto: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  radio: number,
) {
  contexto.beginPath();
  contexto.moveTo(x + radio, y);
  contexto.lineTo(x + ancho - radio, y);
  contexto.quadraticCurveTo(x + ancho, y, x + ancho, y + radio);
  contexto.lineTo(x + ancho, y + alto - radio);
  contexto.quadraticCurveTo(x + ancho, y + alto, x + ancho - radio, y + alto);
  contexto.lineTo(x + radio, y + alto);
  contexto.quadraticCurveTo(x, y + alto, x, y + alto - radio);
  contexto.lineTo(x, y + radio);
  contexto.quadraticCurveTo(x, y, x + radio, y);
  contexto.closePath();
  contexto.fill();
}

function envolverTexto(
  contexto: CanvasRenderingContext2D,
  texto: string,
  anchoMaximo: number,
): string[] {
  const palabras = texto.trim().split(/\s+/);
  const lineas: string[] = [];
  let linea = "";

  for (const palabra of palabras) {
    const candidato = linea ? `${linea} ${palabra}` : palabra;
    if (linea && contexto.measureText(candidato).width > anchoMaximo) {
      lineas.push(linea);
      linea = palabra;
    } else {
      linea = candidato;
    }
  }
  if (linea) lineas.push(linea);
  return lineas.length > 0 ? lineas : ["Cliente"];
}

function nombreSeguro(nombre: string): string {
  return (
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "cliente"
  );
}

async function generarImagenResumenPedidos(
  resumen: ResumenPedidosImagen,
): Promise<Blob> {
  const logo = new Image();
  logo.src = await cargarLogoXaprintPng();
  await logo.decode();

  const canvas = document.createElement("canvas");
  canvas.width = anchoImagen * escalaImagen;
  const contexto = canvas.getContext("2d");
  if (!contexto) {
    throw new Error("No se pudo preparar la imagen del resumen.");
  }

  contexto.font = `700 30px ${fuente}`;
  const lineasCliente = envolverTexto(
    contexto,
    resumen.cliente,
    anchoImagen - margen * 2,
  );
  const yCliente = 202;
  const altoLineaCliente = 36;
  const yEtiquetaPedidos =
    yCliente + lineasCliente.length * altoLineaCliente + 20;
  const yLista = yEtiquetaPedidos + 34;
  const altoFila = 96;
  const yTotal = yLista + resumen.pedidos.length * altoFila + 18;
  const yPie = yTotal + 132;
  canvas.height = (yPie + 42) * escalaImagen;
  contexto.scale(escalaImagen, escalaImagen);

  const fondo = contexto.createLinearGradient(0, 0, anchoImagen, yPie + 42);
  fondo.addColorStop(0, "#eaf3f1");
  fondo.addColorStop(1, "#f5f7fb");
  contexto.fillStyle = fondo;
  contexto.fillRect(0, 0, anchoImagen, yPie + 42);
  contexto.fillStyle = "#ffffff";
  dibujarRectangulo(contexto, 16, 28, anchoImagen - 32, yPie + 42 - 56, 22);

  contexto.drawImage(logo, (anchoImagen - 170) / 2, 40, 170, 35);
  contexto.fillStyle = "#e7f4f0";
  dibujarRectangulo(contexto, (anchoImagen - 200) / 2, 88, 200, 34, 17);
  contexto.fillStyle = "#176354";
  contexto.font = `700 12px ${fuente}`;
  contexto.textAlign = "center";
  contexto.fillText("RESUMEN DE PEDIDOS", anchoImagen / 2, 110);

  contexto.strokeStyle = "#e6eeeb";
  contexto.lineWidth = 1;
  contexto.beginPath();
  contexto.moveTo(margen, 140);
  contexto.lineTo(anchoImagen - margen, 140);
  contexto.stroke();

  contexto.textAlign = "center";
  contexto.fillStyle = "#71817b";
  contexto.font = `700 12px ${fuente}`;
  contexto.fillText("CLIENTE", anchoImagen / 2, 170);
  contexto.fillStyle = "#173d38";
  contexto.font = `700 30px ${fuente}`;
  lineasCliente.forEach((linea, indice) => {
    contexto.fillText(
      linea,
      anchoImagen / 2,
      yCliente + indice * altoLineaCliente,
      anchoImagen - margen * 2,
    );
  });

  contexto.fillStyle = "#176354";
  contexto.font = `700 13px ${fuente}`;
  contexto.fillText("DETALLE DE PEDIDOS", anchoImagen / 2, yEtiquetaPedidos);
  contexto.fillStyle = "#71817b";
  contexto.font = `400 13px ${fuente}`;
  contexto.fillText(
    `${resumen.pedidos.length} ${resumen.pedidos.length === 1 ? "pedido" : "pedidos"}`,
    anchoImagen / 2,
    yEtiquetaPedidos + 19,
  );

  resumen.pedidos.forEach((pedido, indice) => {
    const yFila = yLista + indice * altoFila;
    contexto.fillStyle = "#f1f7f5";
    dibujarRectangulo(
      contexto,
      margen,
      yFila + 8,
      anchoImagen - margen * 2,
      80,
      12,
    );
    contexto.textAlign = "center";
    contexto.fillStyle = "#173d38";
    contexto.font = `600 14px ${fuente}`;
    contexto.fillText(
      `${formatearFechaCorta(pedido.fecha)}  ·  ${pedido.servicio}  ·  ${pedido.medidas}${pedido.aplicaPromocion ? "  ·  PROMO APLICADA" : ""}`,
      anchoImagen / 2,
      yFila + 40,
      anchoImagen - margen * 2 - 24,
    );
    contexto.fillStyle = "#53645e";
    contexto.font = `500 13px ${fuente}`;
    contexto.fillText(
      `Total ${formatearPrecio(pedido.valor)}  ·  Abonado ${formatearPrecio(pedido.abonado)}  ·  Saldo ${formatearPrecio(pedido.porCobrar)}`,
      anchoImagen / 2,
      yFila + 64,
      anchoImagen - margen * 2 - 24,
    );
    contexto.strokeStyle = "#edf1ef";
    contexto.beginPath();
    contexto.moveTo(margen + 12, yFila + altoFila);
    contexto.lineTo(anchoImagen - margen - 12, yFila + altoFila);
    contexto.stroke();
  });

  const totalGradient = contexto.createLinearGradient(
    margen,
    yTotal,
    anchoImagen - margen,
    yTotal + 108,
  );
  totalGradient.addColorStop(0, "#174c43");
  totalGradient.addColorStop(1, "#176354");
  contexto.fillStyle = totalGradient;
  dibujarRectangulo(
    contexto,
    margen,
    yTotal,
    anchoImagen - margen * 2,
    108,
    16,
  );
  contexto.textAlign = "left";
  contexto.fillStyle = "#d5eee7";
  contexto.font = `600 13px ${fuente}`;
  contexto.fillText("VALOR TOTAL", margen + 18, yTotal + 29);
  contexto.fillText("ABONADO", margen + 18, yTotal + 56);
  contexto.font = `700 14px ${fuente}`;
  contexto.fillText("SALDO PENDIENTE", margen + 18, yTotal + 84);
  contexto.textAlign = "right";
  contexto.fillStyle = "#ffffff";
  contexto.font = `600 14px ${fuente}`;
  contexto.fillText(
    formatearPrecio(resumen.totalPedidos),
    anchoImagen - margen - 18,
    yTotal + 29,
  );
  contexto.fillText(
    formatearPrecio(resumen.totalAbonado),
    anchoImagen - margen - 18,
    yTotal + 56,
  );
  contexto.font = `700 18px ${fuente}`;
  contexto.fillText(
    formatearPrecio(resumen.total),
    anchoImagen - margen - 18,
    yTotal + 85,
  );

  contexto.textAlign = "center";
  contexto.fillStyle = "#71817b";
  contexto.font = `400 12px ${fuente}`;
  contexto.fillText(
    "Resumen informativo · no es un comprobante",
    anchoImagen / 2,
    yPie + 8,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((imagen) => {
      if (!imagen) {
        reject(new Error("No se pudo exportar la imagen del resumen."));
        return;
      }
      resolve(imagen);
    }, "image/png");
  });
}

function descargarImagenResumen(imagen: Blob, cliente: string): void {
  const url = URL.createObjectURL(imagen);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `resumen-pedidos-${nombreSeguro(cliente)}.png`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function copiarImagenResumenPedidos(
  resumen: ResumenPedidosImagen,
  opciones: OpcionesCopiarImagenResumen = {},
): Promise<ResultadoCompartirResumen> {
  const imagenPromesa = generarImagenResumenPedidos(resumen);
  const descargarSiNoSePuedeCopiar =
    opciones.descargarSiNoSePuedeCopiar ?? true;
  const alternativa = async (
    error: unknown,
  ): Promise<ResultadoCompartirResumen> => {
    const imagen = await imagenPromesa;
    if (descargarSiNoSePuedeCopiar) {
      descargarImagenResumen(imagen, resumen.cliente);
    }
    return {
      copiada: false,
      motivo:
        error instanceof Error
          ? error.message
          : "El navegador rechazó el acceso al portapapeles.",
    };
  };

  if (
    (!window.isSecureContext && !opciones.intentarEnContextoNoSeguro) ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === "undefined"
  ) {
    return alternativa(
      new Error("Este navegador no permite copiar imágenes al portapapeles."),
    );
  }

  try {
    return navigator.clipboard
      .write([new ClipboardItem({ "image/png": imagenPromesa })])
      .then(
        () => ({ copiada: true }),
        (error: unknown) => alternativa(error),
      );
  } catch (error) {
    return alternativa(error);
  }
}
