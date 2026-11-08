// La app solo maneja colones. Sigue siendo un tipo (en vez de borrar el
// campo) para no tener que tocar cada firma que hoy recibe una moneda, y por
// si algún día vuelve a hacer falta más de una.
export type Currency = "CRC";
export type TransactionType = "INCOME" | "EXPENSE";

export type AccountType = "efectivo" | "debito" | "credito" | "ahorro";

/**
 * Billetera: efectivo, una cuenta de débito, una tarjeta o una cuenta de
 * ahorro. `current_balance` lo mantiene al día la base (ver los triggers de
 * la migración 0020), nunca se escribe a mano desde la app: sale de
 * `initial_balance` más los movimientos, las transferencias y los abonos a
 * metas de esa cuenta.
 */
export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  currency: Currency;
  created_at: string;
}

/**
 * Un movimiento registrado a mano: un ingreso (salario, freelance, otros) o
 * un gasto variable. Los gastos fijos NO viven acá — son `FixedExpense`,
 * porque se repiten todos los meses y no se anotan uno por uno; y las
 * transferencias entre cuentas tampoco — son `Transfer`, porque no son ni
 * ingreso ni gasto.
 */
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: Currency;
  description: string | null;
  category: string | null;
  type: TransactionType;
  /** null cuando el movimiento no está asignado a ninguna cuenta. */
  account_id: string | null;
  /** Ingreso fijo que lo originó, al confirmarlo. No cuenta dos veces. */
  fixed_income_id: string | null;
  /**
   * Id que generó el navegador al anotar sin señal. Solo lo traen los
   * movimientos que pasaron por la cola offline; evita que un reintento
   * con la respuesta perdida anote el gasto dos veces (migración 0024).
   */
  client_id: string | null;
  /**
   * Gasto fijo que originó este movimiento, si se registró al marcarlo
   * pagado. Un movimiento con esto puesto **no** cuenta como gasto variable
   * (el fijo ya suma por su lado), pero sí mueve el saldo de la cuenta.
   */
  fixed_expense_id: string | null;
  /**
   * Comprobante adjunto: la RUTA del archivo dentro del bucket privado
   * `receipts` ("<user_id>/<uuid>.jpg"), no una URL que se pueda abrir. Para
   * mostrarlo hay que pedir una URL firmada con `getReceiptUrl()`.
   */
  receipt_url: string | null;
  transaction_date: string;
  created_at: string;
}

/** Plata que se mueve entre dos cuentas propias. No es ingreso ni gasto. */
export interface Transfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  transfer_date: string;
  created_at: string;
}

export type FixedExpenseStatus = "PENDING" | "PAID";

/**
 * Membresía o gasto fijo: mismo monto, mismo día de cobro, todos los meses.
 *
 * `status` + `status_month` son un par: el estado vale para el mes que dice
 * `status_month` ("YYYY-MM") y nada más. Para saber si está pagado hoy hay
 * que usar `effectiveStatus()` (lib/fixedExpenses.ts), que devuelve
 * "PENDING" cuando el estado guardado es de un mes que ya pasó — así el
 * ciclo se reinicia solo al cambiar de mes, sin ningún job de fondo.
 */
export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: Currency;
  category: string | null;
  charge_day: number;
  status: FixedExpenseStatus;
  status_month: string | null;
  account_id: string | null;
  created_at: string;
}

export type Theme = "dark" | "light" | "system";

export interface UserSettings {
  user_id: string;
  theme: Theme;
  /**
   * Querer o no los recordatorios de gastos fijos. Es por usuario; que un
   * navegador concreto pueda recibirlos es otra cosa y vive en
   * `push_subscriptions`.
   */
  reminders_enabled: boolean;
  updated_at: string;
}

export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  /**
   * Ícono elegido: el nombre de un Material Symbol ("restaurant"), o null
   * para que lo decida la app. Columna de la migración 0025.
   */
  icon: string | null;
  /**
   * Tono elegido: la CLAVE del color ("naranja"), no un hexadecimal, para
   * que se adapte al tema claro y al oscuro. null = lo decide la app.
   */
  color: string | null;
  created_at: string;
}

/** Tope de gasto para una categoría en un mes concreto ("YYYY-MM"). */
export interface Budget {
  id: string;
  user_id: string;
  category_name: string;
  monthly_limit: number;
  month_year: string;
  created_at: string;
}

export type FixedIncomeStatus = "PENDING" | "CONFIRMED";

/**
 * Ingreso que se repite todos los meses: salario, quincena, pensión, renta.
 *
 * Igual que `FixedExpense`, el par `status` + `status_month` hace que el
 * estado valga solo para el mes en curso. **No se registra solo**: el día
 * del pago aparece para confirmarlo de un toque, porque un depósito que la
 * app da por hecho y no entró deja el saldo mintiendo.
 */
export interface FixedIncome {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: Currency;
  category: string | null;
  pay_day: number;
  /** Para quincenas: el segundo día de pago del mes. */
  second_pay_day: number | null;
  account_id: string | null;
  status: FixedIncomeStatus;
  status_month: string | null;
  created_at: string;
}

export type GoalColor = "celeste" | "indigo" | "violeta" | "neutro";

/** Una meta puede repetirse todos los años (marchamo, seguros, impuestos). */
export type GoalRecurrence = "una-vez" | "anual";

/**
 * Meta de ahorro. `current_amount` lo mantiene al día la base a partir de
 * los abonos (`GoalContribution`), igual que el saldo de una cuenta.
 */
export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  color: GoalColor;
  recurrence: GoalRecurrence;
  /** Cuántas veces ya se cumplió el ciclo, en las metas anuales. */
  cycles_completed: number;
  created_at: string;
}

/** Abono a una meta: sale de una cuenta y entra a la meta. */
export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  account_id: string | null;
  amount: number;
  created_at: string;
}

/** "me_deben" es un préstamo que hiciste; "debo", uno que te hicieron. */
export type DebtType = "me_deben" | "debo";
export type DebtStatus = "pendiente" | "pagado";

/**
 * Plata prestada entre personas, en cualquiera de las dos direcciones.
 *
 * No es una transacción: prestar no es un gasto (la plata sigue siendo tuya,
 * solo que no la tenés encima) y que te deban no es un ingreso hasta que te
 * pagan. Al saldarla se puede registrar el movimiento real, y entonces
 * `settled_transaction_id` apunta a ese movimiento.
 */
export interface Debt {
  id: string;
  user_id: string;
  type: DebtType;
  person_name: string;
  amount: number;
  currency: Currency;
  /** "YYYY-MM-DD" o null si no se acordó fecha. */
  due_date: string | null;
  status: DebtStatus;
  notes: string | null;
  settled_transaction_id: string | null;
  settled_at: string | null;
  created_at: string;
}

/** Un navegador suscrito a los recordatorios push. */
export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
