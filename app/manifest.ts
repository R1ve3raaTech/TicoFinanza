import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TicoFinanza",
    short_name: "TicoFinanza",
    description: "Tus ingresos, gastos fijos y gastos del día a día, en un solo lugar.",
    start_url: "/dashboard",
    display: "standalone",
    // Mismo valor que --ground (modo oscuro) en globals.css: si no coinciden,
    // se ve un corte de color entre la barra del sistema y la app instalada.
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    // Íconos generados con scripts/generate-brand-icons.mjs a partir del
    // símbolo de marca.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Accesos rápidos al mantener apretado el ícono de la app instalada.
    //
    // Van a la pantalla de movimientos con `?nuevo=`, que abre el
    // formulario con esa pestaña ya marcada. No son rutas propias porque
    // el formulario es un diálogo, no una pantalla: una ruta aparte
    // obligaría a mantener dos veces el mismo formulario.
    //
    // Solo dos: Android muestra hasta cuatro, pero a más atajos menos
    // sirve cada uno, y anotar un gasto es lo que se hace a diario.
    shortcuts: [
      {
        name: "Anotar un gasto",
        short_name: "Gasto",
        description: "Registrar un gasto nuevo",
        url: "/dashboard/movimientos?nuevo=gasto",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Anotar un ingreso",
        short_name: "Ingreso",
        description: "Registrar un ingreso nuevo",
        url: "/dashboard/movimientos?nuevo=ingreso",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
