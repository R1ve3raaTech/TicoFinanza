"use client";

import { Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

/**
 * Imprimir, que en todos los navegadores de escritorio y en iOS/Android
 * ofrece "Guardar como PDF" en el mismo diálogo.
 *
 * Es `window.print()` y nada más: una librería de PDF en el navegador pesa
 * cientos de kilobytes, vuelve a dibujar la página con su propio motor y
 * rompe los acentos o las tildes en cuanto cambia una fuente. El motor de
 * impresión del navegador ya sabe paginar, repetir encabezados de tabla y
 * respetar el tamaño de papel de cada país.
 */
export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer size={15} />
      Imprimir o guardar PDF
    </Button>
  );
}
