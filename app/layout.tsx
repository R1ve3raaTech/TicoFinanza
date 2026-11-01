import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { InstallPromptProvider } from "@/components/InstallPromptProvider";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.ticofinanza.com";
const DESCRIPTION =
  "Anotá tus gastos fijos con su día de cobro y tus ingresos y gastos del día a día. Próximos pagos, calendario y desglose por categoría, en colones. Hecho para Costa Rica.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TicoFinanza",
  title: {
    default: "TicoFinanza | Tus gastos fijos y tu dinero en un solo lugar",
    template: "%s · TicoFinanza",
  },
  description: DESCRIPTION,
  keywords: [
    "finanzas personales Costa Rica",
    "app finanzas Costa Rica",
    "control de gastos",
    "gastos fijos",
    "membresías y suscripciones",
    "recordatorio de pagos",
    "presupuesto colones",
  ],
  appleWebApp: { title: "TicoFinanza" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  alternates: { canonical: SITE_URL },
  openGraph: {
    siteName: "TicoFinanza",
    title: "TicoFinanza | Tus gastos fijos y tu dinero en un solo lugar",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "es_CR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TicoFinanza" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TicoFinanza | Tus gastos fijos y tu dinero en un solo lugar",
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export const viewport = {
  // Mismos valores que --ground en globals.css para cada modo.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-ground text-ink">
        <Script id="theme-bootstrap" strategy="beforeInteractive">{`
          (() => {
            let theme = 'system';
            try { theme = localStorage.getItem('theme') || 'system'; } catch {}
            const resolved = theme === 'system'
              ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
              : theme;
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
            if (resolved === 'light' || resolved === 'dark') root.style.colorScheme = resolved;
          })();
        `}</Script>
        {/* next-themes 0.4.6 emits an inline script on client remounts. Next
            executes the bootstrap above; this redundant copy is inert data.
            The provider still manages theme changes, storage and system mode. */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange scriptProps={{ type: "text/plain" }}>
          <RegisterServiceWorker />
          <InstallPromptProvider>
            <ToastProvider>{children}</ToastProvider>
          </InstallPromptProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
