export async function cargarLogoXaprintPng(): Promise<string> {
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
      throw new Error("No se pudo preparar el logo de Xaprint.");
    }

    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(logoUrl);
  }
}
