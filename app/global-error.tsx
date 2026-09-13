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
          <p style={{ fontSize: "0.9375rem", fontWeight: 600, margin: 0 }}>Hubo un error.</p>
          <p style={{ fontSize: "0.875rem", color: "#a1a1a8", margin: 0 }}>Volvé a intentarlo.</p>
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
