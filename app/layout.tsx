import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
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

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

const SITE_URL = "https://www.ticofinanza.com";
const DESCRIPTION =
  "Lee automáticamente tus correos de BAC, BCR, Banco Nacional, Banco Popular, DaviBank, MUCAP y PayPal. Controlá tus finanzas sin mover un solo dedo. Hecho para Costa Rica.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "TicoFinanza",
  title: {
    default: "TicoFinanza | Todas tus entidades bancarias y tu dinero en un solo lugar",
    template: "%s · TicoFinanza",
  },
  description: DESCRIPTION,
  keywords: [
    "finanzas personales Costa Rica",
    "app finanzas Costa Rica",
    "control de gastos automático",
    "SINPE Móvil",
    "BAC Credomatic",
    "Banco Nacional",
    "Banco Popular",
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
    title: "TicoFinanza | Todas tus entidades bancarias y tu dinero en un solo lugar",
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "es_CR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "TicoFinanza" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TicoFinanza | Todas tus entidades bancarias y tu dinero en un solo lugar",
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
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-ground text-ink">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <RegisterServiceWorker />
          <InstallPromptProvider>
            <ToastProvider>{children}</ToastProvider>
          </InstallPromptProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
