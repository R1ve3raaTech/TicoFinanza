import Image from "next/image";

export function Avatar({
  src,
  name,
  size = 28,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        // La foto viene de Google o de un archivo subido por el usuario: no se
        // manda a procesar con sharp/libvips en el servidor (ver
        // ProfileSettings para el detalle — CVEs de severidad alta).
        unoptimized
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-raised font-medium text-ink-2 ${className}`}
    >
      {name?.trim()?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
