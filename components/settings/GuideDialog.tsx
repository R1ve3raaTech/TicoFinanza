"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { AppGuide } from "./AppGuide";

/**
 * La guía de la app, a pedido, en su propio diálogo.
 *
 * Es el único texto largo de Ajustes y antes estaba suelto dentro del
 * scroll: ocupaba más que todos los controles juntos y había que pasarla
 * para llegar a la zona de peligro. Nadie entra a Ajustes a leer; quien
 * quiere leer, abre.
 *
 * El contenido es el mismo `AppGuide` que muestra la bienvenida: una sola
 * fuente, así no hay dos versiones de la explicación que se desincronicen.
 */
export function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Se abre encima del diálogo de ajustes.
      layer="top"
      size="xl"
      title="Así funciona TicoFinanza"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Listo
        </Button>
      }
    >
      <AppGuide />
    </Dialog>
  );
}
