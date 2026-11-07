"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise, CheckCircle, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { annualMonthly, goalColorVar, goalProgress, proration } from "@/lib/goals";
import type { Account, GoalContribution, SavingsGoal } from "@/lib/types";
import { CompleteCycleDialog } from "./CompleteCycleDialog";
import { ContributeDialog } from "./ContributeDialog";
import { GoalDialog } from "./GoalDialog";

const dateFormat = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function paceText(
  progress: ReturnType<typeof goalProgress>,
  targetDate: string | null
): string | null {
  if (progress.complete) return "Meta completa";
  if (!targetDate) return null;
  if (progress.daysLeft !== null && progress.daysLeft < 0) return "La fecha ya pasó";
  const when = dateFormat.format(new Date(`${targetDate}T12:00:00Z`));
  return progress.monthlyPace ? `${when} · apartá ₡${progress.monthlyPace.toLocaleString("de-DE")} por mes` : when;
}

/**
 * Metas de ahorro: lo que estás juntando y cuánto llevás de cada cosa.
 *
 * Cada meta tiene su color, que es personalización y no un dato: por eso son
 * celeste, índigo, violeta y neutro, nunca verde ni rosa ni ámbar, que en
 * esta app significan ingreso, gasto y alerta.
 */
export function GoalsSection({
  goals,
  accounts,
  contributions,
  categories,
  todayKey,
}: {
  goals: SavingsGoal[];
  accounts: Account[];
  /** Últimos abonos de todas las metas, para deshacer desde el diálogo. */
  contributions: GoalContribution[];
  /** Categorías de gasto, para el movimiento que genera pagar una meta anual. */
  categories: string[];
  todayKey: string;
}) {
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [contributing, setContributing] = useState<SavingsGoal | null>(null);
  const [completing, setCompleting] = useState<SavingsGoal | null>(null);
  const [session, setSession] = useState(0);

  const byGoal = useMemo(() => {
    const map = new Map<string, GoalContribution[]>();
    for (const contribution of contributions) {
      const list = map.get(contribution.goal_id) ?? [];
      list.push(contribution);
      map.set(contribution.goal_id, list);
    }
    return map;
  }, [contributions]);

  function openGoal(goal: SavingsGoal | null) {
    setEditing(goal);
    setSession((s) => s + 1);
    setGoalOpen(true);
  }

  function openContribution(goal: SavingsGoal) {
    setContributing(goal);
    setSession((s) => s + 1);
  }

  function openCompletion(goal: SavingsGoal) {
    setCompleting(goal);
    setSession((s) => s + 1);
  }

  const perMonth = annualMonthly(goals, todayKey);

  return (
    <section aria-labelledby="metas-titulo" className="min-w-0">
      <div className="flex h-10 items-center justify-between gap-3">
        <h2 id="metas-titulo" className="text-heading text-ink">
          Metas de ahorro
        </h2>
        <Button variant="ghost" size="sm" onClick={() => openGoal(null)} className="-mr-2">
          <Plus size={14} weight="bold" />
          Nueva
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="border-t border-line py-8">
          <p className="max-w-[54ch] text-sm leading-relaxed text-ink-2">
            Apartá plata para algo concreto: el fondo de emergencia, un viaje. Si es algo que
            se paga todos los años —el marchamo, el seguro— marcala como anual y la app lo
            divide entre doce para que diciembre no sorprenda.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => openGoal(null)}>
            <Plus size={15} weight="bold" />
            Crear la primera
          </Button>
        </div>
      ) : (
        <>
          <div className="border-t border-line py-3">
            {/* "Apartado en total" y el objetivo viven en el encabezado de
                la pestaña (SectionLead en PlanView). Acá queda lo que ese
                encabezado no puede decir: cuánto hay que poner por mes. */}
            {perMonth > 0 && (
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-meta text-ink-3">Prorrateo de lo anual</span>
                <span className="money text-meta text-ink-2">
                  <Money value={perMonth} /> por mes
                </span>
              </div>
            )}
          </div>

          <ul className="grid gap-3 pt-3 lg:grid-cols-2">
            {goals.map((goal) => {
              const progress = goalProgress(goal, todayKey);
              const percent = Math.round(progress.ratio * 100);
              const rate = proration(goal, todayKey);
              // En una meta anual el ritmo es la doceava parte, fija; en una
              // de una sola vez es lo que falta repartido en el plazo. Con la
              // meta ya juntada no se pide seguir apartando: lo que toca es
              // pagarla.
              const pace =
                rate && !progress.complete
                  ? `Apartá ₡${rate.perMonth.toLocaleString("de-DE")} por mes`
                  : rate
                    ? "Juntada: ya podés pagarla"
                    : paceText(progress, goal.target_date);
              return (
                <li
                  key={goal.id}
                  className="flex flex-col gap-3 rounded-surface border border-line bg-surface p-4"
                >
                  <button
                    type="button"
                    onClick={() => openGoal(goal)}
                    className="-m-1 cursor-pointer rounded-control p-1 text-left transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        style={{ background: goalColorVar(goal.color) }}
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      />
                      <span className="truncate text-label text-ink">{goal.name}</span>
                      {rate && (
                        <span className="flex shrink-0 items-center gap-1 text-meta text-ink-3">
                          <ArrowsClockwise size={11} aria-hidden />
                          {goal.cycles_completed > 0
                            ? `${goal.cycles_completed + 1}.º año`
                            : "Anual"}
                        </span>
                      )}
                      {progress.complete && (
                        <CheckCircle
                          size={14}
                          weight="fill"
                          aria-hidden
                          className="shrink-0 text-income"
                        />
                      )}
                    </span>
                    <span className="money mt-2 block text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">
                      <Money value={goal.current_amount} tabular={false} />
                      <span className="text-meta font-normal text-ink-3">
                        {" "}
                        de <Money value={goal.target_amount} />
                      </span>
                    </span>
                  </button>

                  <div
                    role="meter"
                    aria-label={`${goal.name}: ${percent}% de la meta`}
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 w-full overflow-hidden rounded-[3px] bg-chart-track"
                  >
                    <div
                      style={{
                        width: `${progress.ratio * 100}%`,
                        background: goalColorVar(goal.color),
                      }}
                      className="h-full rounded-[3px]"
                    />
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <p className="min-w-0 text-meta text-ink-3">
                      <span className="money">{percent}%</span>
                      {pace && <span className="block truncate">{pace}</span>}
                      {/* Ir atrasado en el prorrateo no es una alarma: es un
                          dato para ponerse al día, así que va en tinta y no
                          en rosa, que acá significa plata que sale. */}
                      {rate && rate.behind > 0 && (
                        <span className="block truncate text-ink-2">
                          Te faltan <Money value={rate.behind} /> para ir al día
                        </span>
                      )}
                    </p>
                    <span className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                      {/* Con la meta juntada el paso que sigue es pagarla, no
                          seguir abonando: los dos botones cambian de peso. */}
                      {rate && (
                        <Button
                          variant={progress.complete ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => openCompletion(goal)}
                          className={progress.complete ? "" : "-mr-2 sm:mr-0"}
                        >
                          Ya lo pagué
                        </Button>
                      )}
                      <Button
                        variant={rate && progress.complete ? "ghost" : "secondary"}
                        size="sm"
                        onClick={() => openContribution(goal)}
                        className={rate && progress.complete ? "-mr-2 sm:mr-0" : ""}
                      >
                        Abonar
                      </Button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <GoalDialog
        key={`meta-${session}`}
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        goal={editing}
      />
      <CompleteCycleDialog
        key={`ciclo-${session}`}
        open={Boolean(completing)}
        onClose={() => setCompleting(null)}
        goal={completing}
        accounts={accounts}
        categories={categories}
      />
      <ContributeDialog
        key={`abono-${session}`}
        open={Boolean(contributing)}
        onClose={() => setContributing(null)}
        goal={contributing}
        accounts={accounts}
        contributions={contributing ? (byGoal.get(contributing.id) ?? []) : []}
      />
    </section>
  );
}
