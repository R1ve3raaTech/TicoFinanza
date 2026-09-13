"use client";

import { useId, useRef, useState, useTransition } from "react";
import { ArrowRight, Camera } from "@phosphor-icons/react";
import { completeOnboarding, skipOnboarding } from "@/app/bienvenida/actions";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/shell/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, FormError, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function WelcomeOnboarding({
  userId,
  initialFullName,
  initialAvatarUrl,
}: {
  userId: string;
  initialFullName: string;
  initialAvatarUrl: string | null;
}) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [birthDate, setBirthDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skipping, startSkipTransition] = useTransition();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Elegí un archivo de imagen.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("La imagen no puede pesar más de 5MB.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    } catch {
      setError("No se pudo subir la foto. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        fullName,
        birthDate: birthDate || null,
        avatarUrl,
      });
      if (result?.error) setError(result.error);
    });
  }

  function skip() {
    startSkipTransition(async () => {
      await skipOnboarding();
    });
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-ground px-6 py-8 sm:px-10">
      <div className="mx-auto w-full max-w-md">
        <Logo accent />
      </div>

      <div className="mx-auto my-auto flex w-full max-w-md flex-col py-12">
        <p className="text-meta text-ink-3">Antes de arrancar</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[2rem]">
          Qué bueno tenerte.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          Dos datos opcionales y listo — menos de un minuto.
        </p>

        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            if (fullName.trim()) submit();
          }}
          className="mt-8 border-t border-line"
        >
          <div className="flex items-center gap-4 border-b border-line py-4">
            <Avatar src={avatarUrl} name={fullName} size={48} />
            <div className="min-w-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera size={14} />
                {uploading ? "Subiendo..." : avatarUrl ? "Cambiar foto" : "Elegir foto"}
              </Button>
              <p className="mt-1.5 text-meta text-ink-3">Opcional. Hasta 5 MB.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Elegir foto de perfil"
            />
          </div>

          <div className="border-b border-line py-4">
            <Field label="Tu nombre">
              <input
                data-autofocus=""
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Cómo querés que te llamemos"
                autoComplete="name"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="border-b border-line py-4">
            <Field label="¿Cuándo es tu cumple?" hint="Opcional — por si un día te queremos saludar.">
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={`${inputClass} sm:max-w-[12rem]`}
              />
            </Field>
          </div>
        </form>

        {error && (
          <div className="mt-4">
            <FormError>{error}</FormError>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            form={formId}
            variant="primary"
            size="lg"
            disabled={pending || !fullName.trim()}
          >
            {pending ? "Guardando..." : "Empezar a usar TicoFinanza"}
            {!pending && <ArrowRight size={16} />}
          </Button>
          <Button variant="ghost" size="lg" onClick={skip} disabled={skipping}>
            Ahora no
          </Button>
        </div>
      </div>
    </main>
  );
}
