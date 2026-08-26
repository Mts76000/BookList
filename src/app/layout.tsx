import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { SerwistProvider } from "@serwist/turbopack/react";
import { CookieConsent } from "@/components/CookieConsent";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import Script from "next/script";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Suivez vos lectures`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "suivi de lecture",
    "bibliothèque personnelle",
    "tracker de livres",
    "statistiques de lecture",
    "scan ISBN",
  ],
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Suivez vos lectures`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Suivez vos lectures`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f3ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <DevServiceWorkerCleanup />
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <SessionProvider>
            {children}
            <CookieConsent />
            <Script
              strategy="beforeInteractive"
              src="https://stats.mathis-lamotte.fr/script.js"
              data-website-id="47678d3d-1e98-4a9e-b597-c09329015fdf"
            />
          </SessionProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
