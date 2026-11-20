"use client";

import { useLinkStatus } from "next/link";
import { BrandLoader } from "@/components/brand/BrandLoader";

/**
 * La marca animada dentro de un enlace, mientras la navegación va en
 * camino. **Tiene que vivir dentro del `<Link>`**: `useLinkStatus` lee el
 * estado del enlace que la envuelve.
 *
 * Existe por las pestañas. Cambiar de "Gastos" a "Ingresos" —o de mes en
 * Plan, o de período en Movimientos— es una navegación que **solo cambia
 * los parámetros de la URL**, así que Next no corta por ningún
 * `loading.tsx`: no hay cambio de segmento. El resultado era que tocabas la
 * pestaña, no pasaba nada durante medio segundo y la app parecía trabada.
 *
 * Es deliberadamente chico: la recomendación de Next para este caso es
 * respuesta sutil y en línea, no tapar la pantalla. La pantalla entera se
 * reserva para los cambios de ruta, que sí tienen su `loading.tsx`.
 */
export function PendingMark({ size = 14 }: { size?: number }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <BrandLoader size={size} accent={false} className="ml-1.5 shrink-0" />;
}
