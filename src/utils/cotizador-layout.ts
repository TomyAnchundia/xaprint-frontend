export interface PiezaCotizador {
  id: number;
  cantidad: number;
  ancho: number;
  alto: number;
}

export interface PiezaAcomodada {
  id: number;
  ancho: number;
  alto: number;
  x: number;
  y: number;
  rotada: boolean;
}

export interface ResultadoAcomodo {
  anchoDisponible: number;
  largoNecesario: number;
  piezas: PiezaAcomodada[];
  piezasNoAcomodadas: number;
}

export const SEPARACION_CM = 0.3;

interface PiezaExpandida {
  id: number;
  ancho: number;
  alto: number;
  area: number;
}

interface RectanguloLibre {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface CandidatoAcomodo extends RectanguloLibre {
  rotada: boolean;
  desperdicio: number;
}

function crearPiezas(piezas: PiezaCotizador[]): PiezaExpandida[] {
  return piezas.flatMap((pieza) =>
    Array.from({ length: pieza.cantidad }, () => ({
      id: pieza.id,
      ancho: pieza.ancho,
      alto: pieza.alto,
      area: pieza.ancho * pieza.alto,
    })),
  );
}

function intersecta(a: RectanguloLibre, b: RectanguloLibre): boolean {
  return (
    a.x < b.x + b.ancho &&
    a.x + a.ancho > b.x &&
    a.y < b.y + b.alto &&
    a.y + a.alto > b.y
  );
}

function contiene(a: RectanguloLibre, b: RectanguloLibre): boolean {
  return (
    b.x >= a.x &&
    b.y >= a.y &&
    b.x + b.ancho <= a.x + a.ancho &&
    b.y + b.alto <= a.y + a.alto
  );
}

function dividirEspaciosLibres(
  espacios: RectanguloLibre[],
  usado: RectanguloLibre,
): RectanguloLibre[] {
  const nuevos: RectanguloLibre[] = [];

  for (const espacio of espacios) {
    if (!intersecta(espacio, usado)) {
      nuevos.push(espacio);
      continue;
    }

    const derecha = espacio.x + espacio.ancho;
    const abajo = espacio.y + espacio.alto;
    const derechaUsada = usado.x + usado.ancho;
    const abajoUsado = usado.y + usado.alto;

    if (usado.x > espacio.x) {
      nuevos.push({
        x: espacio.x,
        y: espacio.y,
        ancho: usado.x - espacio.x,
        alto: espacio.alto,
      });
    }
    if (derechaUsada < derecha) {
      nuevos.push({
        x: derechaUsada,
        y: espacio.y,
        ancho: derecha - derechaUsada,
        alto: espacio.alto,
      });
    }
    if (usado.y > espacio.y) {
      nuevos.push({
        x: espacio.x,
        y: espacio.y,
        ancho: espacio.ancho,
        alto: usado.y - espacio.y,
      });
    }
    if (abajoUsado < abajo) {
      nuevos.push({
        x: espacio.x,
        y: abajoUsado,
        ancho: espacio.ancho,
        alto: abajo - abajoUsado,
      });
    }
  }

  return nuevos.filter(
    (espacio, indice, todos) =>
      espacio.ancho > 0 &&
      espacio.alto > 0 &&
      !todos.some(
        (otro, otroIndice) =>
          indice !== otroIndice &&
          contiene(otro, espacio) &&
          (!contiene(espacio, otro) || otroIndice < indice),
      ),
  );
}

function acomodarEnOrden(
  piezas: PiezaExpandida[],
  anchoDisponible: number,
  ordenar: (a: PiezaExpandida, b: PiezaExpandida) => number,
  criterio: "bottom-left" | "best-area",
): ResultadoAcomodo {
  const separacion = SEPARACION_CM;
  const lista = [...piezas].sort(ordenar);
  const alturasSeguras = lista.map((pieza) => {
    const altoNormal = pieza.ancho <= anchoDisponible ? pieza.alto : Infinity;
    const altoRotado = pieza.alto <= anchoDisponible ? pieza.ancho : Infinity;
    return Math.max(
      Number.isFinite(altoNormal) ? altoNormal : 0,
      Number.isFinite(altoRotado) ? altoRotado : 0,
    );
  });
  const largoMaximo =
    alturasSeguras.reduce(
      (total, alto) => total + (Number.isFinite(alto) ? alto : 0),
      0,
    ) +
    Math.max(lista.length - 1, 0) * separacion;
  const espacios: RectanguloLibre[] = [
    { x: 0, y: 0, ancho: anchoDisponible + separacion, alto: largoMaximo + separacion },
  ];
  const acomodadas: PiezaAcomodada[] = [];

  for (const pieza of lista) {
    const orientaciones = [
      { ancho: pieza.ancho, alto: pieza.alto, rotada: false },
      { ancho: pieza.alto, alto: pieza.ancho, rotada: true },
    ].filter(
      (orientacion, indice, todas) =>
        orientacion.ancho <= anchoDisponible &&
        todas.findIndex(
          (otra) =>
            otra.ancho === orientacion.ancho &&
            otra.alto === orientacion.alto,
        ) === indice,
    );

    let mejor: CandidatoAcomodo | null = null;
    let anchoUsado = 0;
    let altoUsado = 0;

    for (const espacio of espacios) {
      for (const orientacion of orientaciones) {
        const anchoAcomodado = orientacion.ancho + separacion;
        const altoAcomodado = orientacion.alto + separacion;
        if (
          anchoAcomodado > espacio.ancho ||
          altoAcomodado > espacio.alto
        ) {
          continue;
        }

        const desperdicio =
          espacio.ancho * espacio.alto -
          anchoAcomodado * altoAcomodado;
        const candidato: CandidatoAcomodo = {
          x: espacio.x,
          y: espacio.y,
          ancho: orientacion.ancho,
          alto: orientacion.alto,
          rotada: orientacion.rotada,
          desperdicio,
        };
        const candidatoMejor =
          !mejor ||
          (criterio === "bottom-left"
            ? candidato.y + candidato.alto < mejor.y + mejor.alto ||
              (candidato.y + candidato.alto === mejor.y + mejor.alto &&
                (candidato.x < mejor.x ||
                  (candidato.x === mejor.x &&
                    candidato.desperdicio < mejor.desperdicio)))
            : candidato.desperdicio < mejor.desperdicio ||
              (candidato.desperdicio === mejor.desperdicio &&
                (candidato.y + candidato.alto < mejor.y + mejor.alto ||
                  (candidato.y + candidato.alto ===
                    mejor.y + mejor.alto &&
                    candidato.x < mejor.x))));

        if (candidatoMejor) {
          mejor = candidato;
          anchoUsado = anchoAcomodado;
          altoUsado = altoAcomodado;
        }
      }
    }

    if (!mejor) continue;

    acomodadas.push({
      id: pieza.id,
      ancho: mejor.ancho,
      alto: mejor.alto,
      x: mejor.x,
      y: mejor.y,
      rotada: mejor.rotada,
    });
    espacios.splice(
      0,
      espacios.length,
      ...dividirEspaciosLibres(espacios, {
        x: mejor.x,
        y: mejor.y,
        ancho: anchoUsado,
        alto: altoUsado,
      }),
    );
  }

  return {
    anchoDisponible,
    largoNecesario: Number(
      acomodadas
        .reduce((maximo, pieza) => Math.max(maximo, pieza.y + pieza.alto), 0)
        .toFixed(2),
    ),
    piezas: acomodadas,
    piezasNoAcomodadas: lista.length - acomodadas.length,
  };
}

export function acomodarPiezas(
  piezas: PiezaCotizador[],
  anchoDisponible: number,
): ResultadoAcomodo {
  if (
    !Number.isFinite(anchoDisponible) ||
    anchoDisponible <= 0 ||
    piezas.some(
      (pieza) =>
        !Number.isSafeInteger(pieza.cantidad) ||
        pieza.cantidad < 1 ||
        !Number.isFinite(pieza.ancho) ||
        pieza.ancho <= 0 ||
        !Number.isFinite(pieza.alto) ||
        pieza.alto <= 0,
    )
  ) {
    return {
      anchoDisponible,
      largoNecesario: 0,
      piezas: [],
      piezasNoAcomodadas: crearPiezas(piezas).length,
    };
  }

  const lista = crearPiezas(piezas);
  const ordenamientos = [
    (a: PiezaExpandida, b: PiezaExpandida) =>
      b.area - a.area ||
      Math.max(b.ancho, b.alto) - Math.max(a.ancho, a.alto),
    (a: PiezaExpandida, b: PiezaExpandida) =>
      Math.max(b.ancho, b.alto) - Math.max(a.ancho, a.alto) ||
      b.area - a.area,
    (a: PiezaExpandida, b: PiezaExpandida) =>
      Math.min(b.ancho, b.alto) - Math.min(a.ancho, a.alto) ||
      b.area - a.area,
    (a: PiezaExpandida, b: PiezaExpandida) =>
      b.alto - a.alto || b.ancho - a.ancho,
  ];

  return ordenamientos
    .flatMap((ordenar) => [
      acomodarEnOrden(lista, anchoDisponible, ordenar, "bottom-left"),
      acomodarEnOrden(lista, anchoDisponible, ordenar, "best-area"),
    ])
    .sort(
      (a, b) =>
        a.piezasNoAcomodadas - b.piezasNoAcomodadas ||
        a.largoNecesario - b.largoNecesario,
    )[0];
}
