"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Camera } from "@phosphor-icons/react";
import { updateProfile } from "@/app/dashboard/settings/actions";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/shell/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, inputClass } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { SettingsRow } from "./SettingsSection";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function ProfileSettings({
  userId,
  initialFullName,
  initialBirthDate,
  initialAvatarUrl,
}: {
  userId: string;
  initialFullName: string;
  initialBirthDate: string | null;
  initialAvatarUrl: string | null;
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

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({ fullName, birthDate: birthDate || null, avatarUrl });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setSaved(true);
        toast.success("Perfil actualizado");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
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
          max={new Date().toISOString().slice(0, 10)}
          className={`${inputClass} sm:max-w-[12rem]`}
        />
      </SettingsRow>

      <SettingsRow>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" size="sm" disabled={pending || !fullName.trim()}>
            {pending ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
          </Button>
          <FormError>{error}</FormError>
        </div>
      </SettingsRow>
    </form>
  );
}
