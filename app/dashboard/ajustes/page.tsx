import { Suspense } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsBody } from "@/components/settings/SettingsBody";

/**
 * Ajustes.
 *
 * **Volvió a ser una pantalla.** Fue un diálogo durante un tiempo, con la
 * idea de que no es un lugar donde uno *esté*; en la práctica, ocho
 * bloques apilados dentro de una ventana chica dejaban todo lo de abajo
 * —cerrar sesión, la zona de peligro— a varios scrolls de distancia, y
 * todas las entradas pesaban igual. Ver `SettingsScreen`.
 *
 * La página no consulta nada: los datos ya los trae el layout de
 * /dashboard, que los necesitaba igual, y bajan por contexto
 * (`SettingsDataProvider`).
 */
export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-10 sm:px-6">
      <PageHeader title="Ajustes" />
      {/* La sección abierta vive en la URL (`?s=`), y leerla pide un
          límite de Suspense: sin él, Next no puede dibujar nada de esta
          página hasta resolverla. */}
      <Suspense fallback={null}>
        <SettingsBody />
      </Suspense>
    </div>
  );
}
