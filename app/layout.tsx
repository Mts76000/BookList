import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { UmamiScript } from "@/components/umami-script";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { canonicalUrl, organizationJsonLd } from "@/lib/seo";
import { env } from "@/lib/env";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const appName = env.NEXT_PUBLIC_APP_NAME;
const description =
  "Socle Next.js générique : auth, email, analytics, sécurité, tests, prêt à l'emploi.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description,
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
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${plusJakarta.variable} h-full antialiased`}>
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
