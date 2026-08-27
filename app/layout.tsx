import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { UmamiScript } from "@/components/umami-script";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { APP_DESCRIPTION, canonicalUrl, organizationJsonLd } from "@/lib/seo";
import { env } from "@/lib/env";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Fraunces porte les titres : l'axe SOFT arrondit les terminaisons, ce qui donne le côté
// « carnet » du produit plutôt qu'une serif de presse.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
  display: "swap",
});

const appName = env.NEXT_PUBLIC_APP_NAME;
const description = APP_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description,
  keywords: [
    "suivi de lecture",
    "bibliothèque personnelle",
    "tracker de livres",
    "statistiques de lecture",
    "scan ISBN",
  ],
  applicationName: appName,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: appName,
    description,
    url: canonicalUrl("/"),
    siteName: appName,
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description,
  },
  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f3ea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (ColorZilla, Grammarly, etc.) inject
          attributes like cz-shortcut-listen into <body> before React hydrates. Harmless. */}
      <body
        className="bg-background text-foreground flex min-h-full flex-col"
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="focus:bg-primary focus:text-on-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-4 focus:py-2"
        >
          Aller au contenu principal
        </a>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <UmamiScript />
      </body>
    </html>
  );
}
