import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TicoFinanza",
    short_name: "TicoFinanza",
    description: "Tus finanzas en Costa Rica, automáticas.",
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
  };
}
