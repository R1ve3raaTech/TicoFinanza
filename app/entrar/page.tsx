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
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="animate-fade-up mb-10 inline-flex w-full justify-center">
            <Logo subtitle="finanzas personales" size="lg" />
          </Link>
          <div className="animate-fade-up [animation-delay:80ms]">
            <AuthForm />
          </div>
        </div>
      </div>
      <AuthShowcase />
    </main>
  );
}
