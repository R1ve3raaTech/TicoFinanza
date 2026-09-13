"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
import { goalProgress } from "@/lib/insights";
import type { SavingsGoal, Transaction } from "@/lib/types";
import { GoalModal } from "./GoalModal";
import { InsightSection } from "./InsightSection";

function daysLeftLabel(targetDate: string): { text: string; overdue: boolean } {
  const days = Math.ceil(
    (new Date(targetDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000
  );
  if (days < 0) return { text: `venció hace ${Math.abs(days)} días`, overdue: true };
  if (days === 0) return { text: "es hoy", overdue: false };
  return { text: `faltan ${days} días`, overdue: false };
}

export function SavingsGoals({
  goals,
  transactions,
}: {
  goals: SavingsGoal[];
  transactions: Transaction[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  function openCreate() {
    setEditingGoal(null);
    setModalOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditingGoal(goal);
    setModalOpen(true);
  }

  return (
    <InsightSection
      id="metas"
      title="Metas de ahorro"
      description="Se calculan solas: ingresos menos gastos desde que creaste cada meta."
      action={
        <Button variant="ghost" size="sm" onClick={openCreate}>
          <Plus size={14} />
          Nueva meta
        </Button>
      }
    >
      {goals.length === 0 ? (
        <p className="border-t border-line pt-3 text-sm text-ink-3">
          Todavía no tenés metas de ahorro. Creá una para ver cuánto llevás acumulado.
        </p>
      ) : (
        <ul className="border-t border-line">
          {goals.map((g) => {
            const progress = goalProgress(transactions, g);
            const pct = Math.min(1, progress / g.target_amount);
            const reached = progress >= g.target_amount;
            const deadline = g.target_date ? daysLeftLabel(g.target_date) : null;
            return (
              <li key={g.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => openEdit(g)}
                  aria-label={`Editar la meta ${g.name}`}
                  className="block w-full cursor-pointer py-3 text-left transition-colors duration-150 hover:bg-surface-hover/70 focus-visible:outline-offset-[-2px] md:-mx-2 md:w-[calc(100%+1rem)] md:rounded-control md:px-2"
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 truncate text-sm text-ink">{g.name}</span>
                    <span className="text-meta text-ink-3">
                      <Money value={progress} className="text-sm text-ink" /> de{" "}
                      <Money value={g.target_amount} />
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="mt-2 block h-1.5 w-full rounded-[2px] bg-chart-track"
                  >
                    <span
                      className={`block h-full rounded-r-[3px] ${
                        reached ? "bg-chart-income" : "bg-chart-neutral"
                      }`}
                      style={{ width: `${pct * 100}%` }}
                    />
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-3 text-meta text-ink-3">
                    <span className={reached ? "font-medium text-income" : "money"}>
                      {reached ? "Meta cumplida" : `${Math.round(pct * 100)}%`}
                    </span>
                    {deadline && (
                      <span className={deadline.overdue && !reached ? "text-warn" : undefined}>
                        {deadline.text}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <GoalModal open={modalOpen} goal={editingGoal} onClose={() => setModalOpen(false)} />
    </InsightSection>
  );
}
