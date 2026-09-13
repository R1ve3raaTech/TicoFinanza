"use client";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * Confirmación destructiva reusable. Va en la capa de arriba: casi siempre
 * se abre encima de otro diálogo (ej. eliminar desde el detalle de un
 * movimiento), y Escape cierra solo esta.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Sí, eliminar",
  cancelLabel = "Cancelar",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      role="alertdialog"
      layer="top"
      size="sm"
      dismissible={!pending}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Eliminando..." : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
