"use client";

import { useEffect, useId, useRef, useState, useTransition, type MutableRefObject } from "react";
import { Camera, Check } from "@phosphor-icons/react";
import { updateProfile } from "@/app/dashboard/ajustes/actions";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/shell/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { SettingsRow } from "./SettingsSection";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Perfil: foto, nombre y fecha de nacimiento.
 *
 * **Se guarda solo.** Antes había un botón "Guardar cambios" al pie, que en
 * un diálogo es un segundo botón compitiendo con el de cerrar: uno escribe
 * el nombre, le da a "Listo" y no sabe cuál de los dos guardaba. Ahora cada
 * campo se guarda al salir de él, y el botón del diálogo manda lo que
 * quedara pendiente antes de cerrar (`flushRef`).
 *
 * Solo se escribe si algo cambió de verdad: salir de un campo sin tocarlo no
 * dispara ninguna llamada.
 */
export function ProfileSettings({
  userId,
  initialFullName,
  initialBirthDate,
  initialAvatarUrl,
  flushRef,
}: {
  userId: string;
  initialFullName: string;
  initialBirthDate: string | null;
  initialAvatarUrl: string | null;
  /** El diálogo deja acá su "guardá lo pendiente" para llamarlo al cerrar. */
  flushRef?: MutableRefObject<(() => Promise<boolean>) | null>;
}) {
  const toast = useToast();
  const nameId = useId();
  const birthId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [birthDate, setBirthDate] = useState(initialBirthDate ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  // Lo último que el servidor confirmó. Comparar contra esto es lo que evita
  // una escritura cada vez que el foco pasa por un campo sin tocarlo.
  const savedRef = useRef({ fullName: initialFullName, birthDate: initialBirthDate ?? "" });

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
    setSaved(false);
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
      // Cache-bust para que se vea la nueva foto al toque, no la vieja cacheada.
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(bustedUrl);

      const result = await updateProfile({
        fullName,
        birthDate: birthDate || null,
        avatarUrl: bustedUrl,
      });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Foto de perfil actualizada");
      }
    } catch {
      const message = "No se pudo subir la foto. Intentá de nuevo.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  /**
   * Guarda si hay algo distinto. Devuelve false si el servidor rechazó, para
   * que el diálogo no se cierre encima de un error.
   */
  async function flush(): Promise<boolean> {
    const trimmed = fullName.trim();
    const current = { fullName: trimmed, birthDate };
    const unchanged =
      current.fullName === savedRef.current.fullName &&
      current.birthDate === savedRef.current.birthDate;
    if (unchanged) return true;

    // Un nombre vacío no se manda: dejaría la app saludando a nadie.
    if (!trimmed) {
      setError("Escribí tu nombre.");
      return false;
    }

    setError(null);
    const result = await updateProfile({
      fullName: trimmed,
      birthDate: birthDate || null,
      avatarUrl,
    });
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
      return false;
    }
    savedRef.current = current;
    setSaved(true);
    return true;
  }

  function saveOnBlur() {
    startTransition(async () => {
      await flush();
    });
  }

  // El diálogo necesita poder mandar lo pendiente al cerrar. Se reasigna en
  // cada render para que siempre apunte a la versión con el estado de ahora.
  useEffect(() => {
    if (!flushRef) return;
    flushRef.current = flush;
    return () => {
      flushRef.current = null;
    };
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveOnBlur();
      }}
    >
      <SettingsRow label="Foto" description="JPG o PNG, hasta 5 MB.">
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} name={fullName} size={40} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera size={14} />
            {uploading ? "Subiendo..." : "Cambiar foto"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Elegir foto de perfil"
          />
        </div>
      </SettingsRow>

      <SettingsRow label="Nombre" htmlFor={nameId}>
        <input
          id={nameId}
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setSaved(false);
          }}
          onBlur={saveOnBlur}
          autoComplete="name"
          className={`${inputClass} sm:max-w-sm`}
        />
      </SettingsRow>

      <SettingsRow label="Fecha de nacimiento" htmlFor={birthId}>
        <input
          id={birthId}
          type="date"
          value={birthDate}
          onChange={(e) => {
            setBirthDate(e.target.value);
            setSaved(false);
          }}
          onBlur={saveOnBlur}
          max={new Date().toISOString().slice(0, 10)}
          className={`${inputClass} sm:max-w-[12rem]`}
        />
      </SettingsRow>

      {/* Sin botón de guardar: lo hace el campo al salir de él, y el botón
          del diálogo manda lo que quede pendiente. Esta línea es el acuse:
          sin ella, guardar en silencio es indistinguible de no guardar. */}
      <div className="flex min-h-[1.5rem] flex-wrap items-center gap-3 pt-3">
        {error ? (
          <FormError>{error}</FormError>
        ) : pending ? (
          <span className="text-meta text-ink-3">Guardando…</span>
        ) : saved ? (
          <span className="flex items-center gap-1 text-meta text-ink-3">
            <Check size={12} weight="bold" aria-hidden />
            Guardado
          </span>
        ) : (
          <span className="text-meta text-ink-3">Se guarda solo al salir de cada campo.</span>
        )}
      </div>
    </form>
  );
}
