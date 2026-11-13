import type { NotaVenta } from "../services/api";
import { formatearPrecio } from "./pedidos-lista";

async function cargarLogoParaPdf(): Promise<string> {
  const respuesta = await fetch("/logo-xaprint.svg");
  if (!respuesta.ok) {
    throw new Error("No se pudo cargar el logo de Xaprint.");
  }

  const svg = (await respuesta.text()).replaceAll("currentColor", "#173d38");
  const logoUrl = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml" }),
  );

  try {
    const imagen = new Image();
    imagen.src = logoUrl;
    await imagen.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 1286;
    canvas.height = 262;
    const contexto = canvas.getContext("2d");
    if (!contexto) {
      throw new Error("No se pudo preparar el logo para el comprobante.");
    }

    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(logoUrl);
  }
}

export async function descargarNotaVentaPdf(nota: NotaVenta): Promise<void> {
  const [logo, { jsPDF }] = await Promise.all([
    cargarLogoParaPdf(),
    import("jspdf"),
  ]);
  const pdf = new jsPDF();
  const margen = 18;
  const anchoPagina = pdf.internal.pageSize.getWidth();
  const altoPagina = pdf.internal.pageSize.getHeight();
  const anchoContenido = anchoPagina - margen * 2;
  const ladoDerecho = margen + anchoContenido - 4;
  const altoLogo = 55 * (261.5 / 1285.4);
  const fecha = new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Guayaquil",
  }).format(new Date(nota.fecha));
  const colorMarca = [23, 61, 56] as const;
  pdf.setProperties({
    title: `Nota de venta ${nota.numero} - Xaprint`,
    subject: "Comprobante interno no tributario",
    author: "Xaprint",
  });
  const dibujarCabecera = (continuacion: boolean) => {
    pdf.addImage(
      logo,
      "PNG",
      margen,
      13,
      continuacion ? 43 : 55,
      continuacion ? altoLogo * (43 / 55) : altoLogo,
    );
    pdf.setTextColor(...colorMarca);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("NOTA DE VENTA", ladoDerecho, 18, { align: "right" });
    pdf.setFontSize(11);
    pdf.text(`N.° ${nota.numero}`, ladoDerecho, 25, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);

    if (continuacion) {
      pdf.text("CONTINUACIÓN", ladoDerecho, 32, { align: "right" });
      pdf.setDrawColor(203, 213, 225);
      pdf.line(margen, 37, margen + anchoContenido, 37);
      return 44;
    }

    pdf.text("DOCUMENTO INTERNO NO TRIBUTARIO", ladoDerecho, 32, {
      align: "right",
    });
    pdf.setFontSize(9);
    pdf.text("Calle 108, Avenida 108", margen, 34);
    pdf.text(`Fecha: ${fecha}`, ladoDerecho, 39, { align: "right" });
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margen, 44, margen + anchoContenido, 44);

    const clienteLineas = pdf.splitTextToSize(
      nota.cliente.nombre,
      anchoContenido - 10,
    ) as string[];
    const altoCliente = 17 + clienteLineas.length * 5;
    pdf.setFillColor(245, 248, 247);
    pdf.roundedRect(margen, 50, anchoContenido, altoCliente, 2, 2, "F");
    pdf.setTextColor(100, 116, 113);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("FACTURAR A:", margen + 5, 57);
    pdf.setTextColor(30, 41, 39);
    pdf.setFontSize(11);
    pdf.text(clienteLineas, margen + 5, 64);
    return 50 + altoCliente + 8;
  };

  const dibujarCabeceraTabla = (posicionY: number) => {
    pdf.setFillColor(...colorMarca);
    pdf.roundedRect(margen, posicionY, anchoContenido, 9, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("PEDIDO", margen + 4, posicionY + 6);
    pdf.text("SERVICIO", margen + 31, posicionY + 6);
    pdf.text("MEDIDAS", margen + 79, posicionY + 6);
    pdf.text("VALOR", ladoDerecho, posicionY + 6, { align: "right" });
    return posicionY + 9;
  };

  const dibujarContinuacion = () => {
    pdf.addPage();
    return dibujarCabeceraTabla(dibujarCabecera(true));
  };

  let posicionY = dibujarCabeceraTabla(dibujarCabecera(false));
  nota.pedidos.forEach((pedido, indice) => {
    if (posicionY + 11 > altoPagina - margen - 12) {
      posicionY = dibujarContinuacion();
    }

    if (indice % 2 === 1) {
      pdf.setFillColor(247, 249, 248);
      pdf.rect(margen, posicionY, anchoContenido, 11, "F");
    }
    pdf.setDrawColor(226, 232, 230);
    pdf.line(margen, posicionY + 11, margen + anchoContenido, posicionY + 11);
    pdf.setTextColor(45, 55, 53);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`#${pedido.pedidoId}`, margen + 4, posicionY + 7);
    pdf.text(
      pedido.servicio === "TEXTIL" ? "DTF textil" : "DTF UV",
      margen + 31,
      posicionY + 7,
    );
    pdf.text(
      pedido.largo === null
        ? `${pedido.ancho} cm`
        : `${pedido.ancho} x ${pedido.largo} cm`,
      margen + 79,
      posicionY + 7,
    );
    pdf.text(formatearPrecio(pedido.valor), ladoDerecho, posicionY + 7, {
      align: "right",
    });
    posicionY += 11;
  });

  if (posicionY + 24 > altoPagina - margen - 12) {
    posicionY = dibujarContinuacion();
  }
  posicionY += 7;
  pdf.setFillColor(245, 248, 247);
  pdf.roundedRect(
    margen + anchoContenido - 73,
    posicionY,
    73,
    20,
    2,
    2,
    "F",
  );
  pdf.setTextColor(100, 116, 113);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("TOTAL A PAGAR", margen + anchoContenido - 68, posicionY + 7);
  pdf.setTextColor(...colorMarca);
  pdf.setFontSize(13);
  pdf.text(formatearPrecio(nota.total), ladoDerecho, posicionY + 15, {
    align: "right",
  });

  const cantidadPaginas = pdf.internal.getNumberOfPages();
  for (let pagina = 1; pagina <= cantidadPaginas; pagina += 1) {
    pdf.setPage(pagina);
    pdf.setTextColor(120, 130, 127);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(
      "Documento interno no tributario - No es una factura autorizada por el SRI.",
      margen,
      altoPagina - 8,
    );
    pdf.text(
      `Página ${pagina} de ${cantidadPaginas}`,
      margen + anchoContenido,
      altoPagina - 8,
      { align: "right" },
    );
  }

  const nombreArchivo = nota.cliente.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  pdf.save(`nota-venta-${nota.numero}-${nombreArchivo || "cliente"}.pdf`);
}
