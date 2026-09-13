import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShowcase } from "@/components/auth/AuthShowcase";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function EntrarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-[100dvh] bg-ground lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Marca y formulario centrados como una sola unidad. */}
        <div className="flex w-full max-w-sm flex-col items-center">
          <Link href="/" aria-label="TicoFinanza, ir al inicio" className="mb-10 rounded-control">
            <Logo subtitle="finanzas personales" size="lg" accent />
          </Link>
          <AuthForm />
        </div>
      </div>
      <AuthShowcase />
    </main>
  );
}
