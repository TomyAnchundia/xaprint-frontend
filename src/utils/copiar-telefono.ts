export async function copiarTelefono(
  boton: HTMLButtonElement,
  telefono: string,
): Promise<void> {
  try {
    let copiado = false;

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(telefono);
        copiado = true;
      } catch {
        // El navegador puede bloquear Clipboard API cuando la app se abre por HTTP.
      }
    }

    if (!copiado) {
      const textarea = document.createElement("textarea");

      textarea.value = telefono;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.width = "1px";
      textarea.style.height = "1px";
      textarea.style.padding = "0";
      textarea.style.border = "0";
      textarea.style.outline = "0";
      textarea.style.boxShadow = "none";
      textarea.style.background = "transparent";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      copiado = document.execCommand("copy");

      document.body.removeChild(textarea);
    }

    if (!copiado) {
      throw new Error("El navegador no permitió copiar el número.");
    }

    const contenidoOriginal = boton.innerHTML;
    const tituloOriginal = boton.title;

    boton.innerHTML = `
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
          d="M5 13l4 4L19 7"
        />
      </svg>
    `;

    boton.classList.remove(
      "text-slate-400",
      "hover:bg-slate-100",
      "hover:text-slate-700",
    );

    boton.classList.add("text-emerald-600", "bg-emerald-50");
    boton.title = "Número copiado";

    setTimeout(() => {
      boton.innerHTML = contenidoOriginal;
      boton.classList.remove("text-emerald-600", "bg-emerald-50");
      boton.classList.add(
        "text-slate-400",
        "hover:bg-slate-100",
        "hover:text-slate-700",
      );
      boton.title = tituloOriginal || "Copiar número";
    }, 1500);
  } catch (error) {
    console.error("No se pudo copiar el teléfono:", error);

    const contenidoOriginal = boton.innerHTML;
    const tituloOriginal = boton.title;

    boton.title = "No se pudo copiar";
    boton.classList.remove(
      "text-slate-400",
      "hover:bg-slate-100",
      "hover:text-slate-700",
    );
    boton.classList.add("text-red-600", "bg-red-50");

    setTimeout(() => {
      boton.innerHTML = contenidoOriginal;
      boton.classList.remove("text-red-600", "bg-red-50");
      boton.classList.add(
        "text-slate-400",
        "hover:bg-slate-100",
        "hover:text-slate-700",
      );
      boton.title = tituloOriginal || "Copiar número";
    }, 1800);
  }
}
