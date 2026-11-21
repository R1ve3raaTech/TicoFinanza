import type { AppLockWhen } from "@/lib/appLock";
import type { Theme, UserCategory } from "@/lib/types";

/**
 * Lo que la pantalla de Ajustes necesita saber.
 *
 * Vive en su propio archivo porque lo arma el layout de /dashboard (que es
 * del servidor) y lo consume la pantalla (que es del cliente): con el tipo
 * declarado dentro de un componente de cliente, el servidor tendría que
 * importar ese archivo entero para nombrarlo.
 */
export interface SettingsData {
  userId: string;
  email: string;
  fullName: string;
  birthDate: string | null;
  avatarUrl: string | null;
  categories: UserCategory[];
  theme: Theme;
  /** Flag de la cuenta. Que ESTE dispositivo los reciba lo revisa el switch. */
  remindersEnabled: boolean;
  transactionCount: number;
  /** Cerrojo del APK. En la web no se dibuja: ver lib/appMode.ts. */
  lockWhen: AppLockWhen;
  hasPin: boolean;
}
