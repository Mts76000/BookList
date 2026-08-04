import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { SerwistProvider } from "@serwist/turbopack/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BookList - Suivez vos lectures",
  description: "Application de suivi de livres personnelle avec statistiques et recommandations",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
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
      className={`${inter.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <DevServiceWorkerCleanup />
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <SessionProvider>{children}</SessionProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
