import { formatearPrecio } from "./pedidos-lista";
import { cargarLogoXaprintPng } from "./logo-xaprint";

const anchoImagen = 900;
const margen = 64;
const fuente = "Arial, Helvetica, sans-serif";

export interface PedidoResumenImagen {
  id: number;
  servicio: string;
  medidas: string;
  valor: number;
}

export interface ResumenPedidosImagen {
  cliente: string;
  pedidos: PedidoResumenImagen[];
  total: number;
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
  canvas.width = anchoImagen;
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
  const yCliente = 151;
  const altoLineaCliente = 40;
  const yEtiquetaPedidos =
    yCliente + lineasCliente.length * altoLineaCliente + 7;
  const yLista = yEtiquetaPedidos + 20;
  const altoFila = 68;
  const yTotal = yLista + resumen.pedidos.length * altoFila + 14;
  const yPie = yTotal + 74;
  canvas.height = yPie + 42;

  contexto.fillStyle = "#f4f7f6";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.fillStyle = "#ffffff";
  dibujarRectangulo(
    contexto,
    28,
    28,
    canvas.width - 56,
    canvas.height - 56,
    22,
  );

  contexto.drawImage(logo, margen, 54, 170, 35);
  contexto.strokeStyle = "#e7eeeb";
  contexto.lineWidth = 1;
  contexto.beginPath();
  contexto.moveTo(margen, 108);
  contexto.lineTo(anchoImagen - margen, 108);
  contexto.stroke();

  contexto.textAlign = "left";
  contexto.fillStyle = "#173d38";
  contexto.font = `700 30px ${fuente}`;
  lineasCliente.forEach((linea, indice) => {
    contexto.fillText(linea, margen, yCliente + indice * altoLineaCliente);
  });

  contexto.fillStyle = "#64716d";
  contexto.font = `400 15px ${fuente}`;
  contexto.fillText("Pedidos seleccionados", margen, yEtiquetaPedidos);

  resumen.pedidos.forEach((pedido, indice) => {
    const yFila = yLista + indice * altoFila;
    contexto.fillStyle = "#26332f";
    contexto.font = `500 18px ${fuente}`;
    contexto.textAlign = "left";
    contexto.fillText(
      `#${pedido.id} · ${pedido.servicio} · ${pedido.medidas}`,
      margen,
      yFila + 39,
      anchoImagen - margen * 2 - 150,
    );
    contexto.fillStyle = "#173d38";
    contexto.font = `700 19px ${fuente}`;
    contexto.textAlign = "right";
    contexto.fillText(
      formatearPrecio(pedido.valor),
      anchoImagen - margen,
      yFila + 39,
    );
    contexto.strokeStyle = "#edf1ef";
    contexto.beginPath();
    contexto.moveTo(margen, yFila + altoFila);
    contexto.lineTo(anchoImagen - margen, yFila + altoFila);
    contexto.stroke();
  });

  contexto.textAlign = "left";
  contexto.fillStyle = "#52625d";
  contexto.font = `500 17px ${fuente}`;
  contexto.fillText("Total seleccionado", margen, yTotal + 31);
  contexto.textAlign = "right";
  contexto.fillStyle = "#173d38";
  contexto.font = `700 25px ${fuente}`;
  contexto.fillText(
    formatearPrecio(resumen.total),
    anchoImagen - margen,
    yTotal + 33,
  );

  contexto.textAlign = "left";
  contexto.fillStyle = "#89938f";
  contexto.font = `400 13px ${fuente}`;
  contexto.fillText(
    "Resumen informativo · no es un comprobante.",
    margen,
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
