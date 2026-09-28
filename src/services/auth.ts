export interface UsuarioSesion {
  id: number;
  username: string;
  rol: "ADMIN" | "DISENADOR" | "EMPLEADO";
  area: "TEXTIL31" | "TEXTIL58" | "UV" | null;
}

const TOKEN_KEY = "centro-control-token";
const USER_KEY = "centro-control-usuario";

export function obtenerToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function obtenerUsuario(): UsuarioSesion | null {
  if (typeof window === "undefined") {
    return null;
  }

  const usuario = localStorage.getItem(USER_KEY);

  if (!usuario) {
    return null;
  }

  try {
    const datos: unknown = JSON.parse(usuario);

    if (typeof datos !== "object" || datos === null) {
      return null;
    }

    const roles = ["ADMIN", "DISENADOR", "EMPLEADO"] as const;
    const rolGuardado = "rol" in datos ? datos.rol : null;
    const rolNormalizado =
      rolGuardado === "DISEÑADOR" ? "DISENADOR" : rolGuardado;
    const areas = ["TEXTIL31", "TEXTIL58", "UV"] as const;
    const rol =
      typeof rolNormalizado === "string" &&
      roles.includes(rolNormalizado as (typeof roles)[number])
        ? (rolNormalizado as UsuarioSesion["rol"])
        : null;
    const areaGuardada = "area" in datos ? datos.area : undefined;
    const area =
      typeof areaGuardada === "string" &&
      areas.includes(areaGuardada as (typeof areas)[number])
        ? (areaGuardada as (typeof areas)[number])
        : areaGuardada === null ||
            areaGuardada === undefined ||
            (typeof areaGuardada === "string" &&
              areaGuardada.trim().toUpperCase() === "NULL")
          ? null
          : undefined;

    if (
      !("id" in datos) ||
      !("username" in datos) ||
      typeof datos.id !== "number" ||
      typeof datos.username !== "string" ||
      !rol ||
      area === undefined ||
      (rol === "EMPLEADO" && area === null)
    ) {
      return null;
    }

    return {
      id: datos.id,
      username: datos.username,
      rol,
      area,
    };
  } catch {
    return null;
  }
}

export function haySesion(): boolean {
  return Boolean(obtenerToken());
}

export function cerrarSesion(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.location.replace("/login");
}
