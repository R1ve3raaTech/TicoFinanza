"use client";

import { useEffect } from "react";

// Reemplaza al layout raíz cuando todo lo demás falló: no hay CSS de la app
// ni tema, así que los colores van escritos a mano (los del modo oscuro).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0a0a0b", color: "#ededef" }}>
        <main
          style={{
            display: "flex",
            minHeight: "100dvh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.25rem",
            padding: "0 1.5rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {/* Sin tokens ni componentes: esta pantalla se dibuja cuando se
              rompió el layout raíz, así que no puede depender de nada. */}
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, margin: 0 }}>
            Ups, hubo un error al hacer esto.
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#a1a1a8",
              margin: 0,
              maxWidth: "34rem",
              lineHeight: 1.6,
            }}
          >
            Reintentalo, y si no funciona, comunicate con el equipo de TicoFinanza
            (info@ticofinanza.com).
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              height: "2.25rem",
              borderRadius: "6px",
              background: "#38bdf8",
              color: "#04141f",
              fontWeight: 500,
              fontSize: "0.875rem",
              padding: "0 0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
