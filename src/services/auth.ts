export interface UsuarioSesion {
  id: number;
  username: string;
  rol: "ADMIN" | "DISENADOR" | "EMPLEADO";
  area: "TEXTIL31" | "TEXTIL58" | "UV" | null;
}

const TOKEN_KEY = "centro-control-token";
const USER_KEY = "centro-control-usuario";
const SESSION_MESSAGE_KEY = "centro-control-session-message";
let expirationTimer = 0;

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

export function cerrarSesion(message?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.clearTimeout(expirationTimer);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (message) {
    sessionStorage.setItem(SESSION_MESSAGE_KEY, message);
  }

  window.location.replace("/login");
}

export function vigilarExpiracionSesion(token = obtenerToken()): void {
  if (typeof window === "undefined" || !token) return;
  window.clearTimeout(expirationTimer);

  try {
    const payload = token.split(".")[1];
    if (!payload) return;
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims: unknown = JSON.parse(
      window.atob(
        normalizedPayload.padEnd(
          Math.ceil(normalizedPayload.length / 4) * 4,
          "=",
        ),
      ),
    );
    if (
      typeof claims !== "object" ||
      claims === null ||
      !("exp" in claims) ||
      typeof claims.exp !== "number" ||
      !Number.isFinite(claims.exp)
    ) {
      return;
    }

    const remaining = claims.exp * 1000 - Date.now();
    if (remaining <= 0) {
      cerrarSesion("La sesión expiró. Inicia sesión de nuevo.");
      return;
    }
    expirationTimer = window.setTimeout(
      () => cerrarSesion("La sesión expiró. Inicia sesión de nuevo."),
      remaining,
    );
  } catch {
    // El servidor sigue siendo quien valida tokens malformados.
  }
}

export function consumirAvisoSesion(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(SESSION_MESSAGE_KEY);
  sessionStorage.removeItem(SESSION_MESSAGE_KEY);
  return message;
}
