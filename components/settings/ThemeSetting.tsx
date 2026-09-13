"use client";

import { useState, useTransition } from "react";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { updateTheme } from "@/app/dashboard/settings/actions";
import { useToast } from "@/components/Toast";
import { Segmented } from "@/components/ui/Segmented";
import type { Theme } from "@/lib/types";
import { SettingsRow } from "./SettingsSection";

const LABELS: Record<Theme, string> = { light: "Claro", dark: "Oscuro", system: "Sistema" };

export function ThemeSetting({ initial }: { initial: Theme }) {
  const toast = useToast();
  const { setTheme } = useTheme();
  const [theme, setLocalTheme] = useState<Theme>(initial);
  const [pending, startTransition] = useTransition();

  function pick(t: Theme) {
    if (t === theme) return;
    setLocalTheme(t);
    setTheme(t);
    startTransition(async () => {
      await updateTheme(t);
      toast.success(`Tema: ${LABELS[t]}`);
    });
  }

  return (
    <SettingsRow label="Tema" description="Cómo se ve la app en este dispositivo.">
      <Segmented
        ariaLabel="Tema"
        value={theme}
        onChange={pick}
        disabled={pending}
        options={[
          { value: "light", label: <><Sun size={14} aria-hidden />{LABELS.light}</> },
          { value: "dark", label: <><Moon size={14} aria-hidden />{LABELS.dark}</> },
          { value: "system", label: <><Desktop size={14} aria-hidden />{LABELS.system}</> },
        ]}
      />
    </SettingsRow>
  );
}
