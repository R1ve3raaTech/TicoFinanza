import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { SettingsRow } from "./SettingsSection";

/**
 * Cerrar sesión. En teléfono no hay menú de cuenta (la barra de abajo es
 * solo navegación), así que esta acción vive acá.
 *
 * **Ya no está "Instalar la app".** La única vía de instalación es el APK
 * de Android, y ese se ofrece en la portada, antes de entrar. Dentro de la
 * app el botón no tenía a quién servirle: o ya estás en la app instalada, o
 * estás en el navegador de una compu o un iPhone, donde no hay nada que
 * instalar.
 *
 * Dejó de ser un componente de cliente al irse esa fila.
 */
export function SessionSettings({ email }: { email?: string }) {
  return (
    <SettingsRow
      inline
      label="Cerrar sesión"
      description={email ? `Entraste como ${email}` : undefined}
    >
      <SignOutButton />
    </SettingsRow>
  );
}
