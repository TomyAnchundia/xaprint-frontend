const ZONA_HORARIA = "America/Guayaquil";

export function formatearFecha(
  fecha: string | Date | null | undefined,
): string {
  if (!fecha) {
    return "—";
  }

  const valor = fecha instanceof Date ? fecha : new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA_HORARIA,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(valor);
}

export function formatearHora(fecha: string | Date | null | undefined): string {
  if (!fecha) {
    return "—";
  }

  const valor = fecha instanceof Date ? fecha : new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}

export function formatearFechaCorta(
  fecha: string | Date | null | undefined,
): string {
  if (!fecha) {
    return "—";
  }

  const valor = fecha instanceof Date ? fecha : new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(valor);
}
