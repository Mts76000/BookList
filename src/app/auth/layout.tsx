import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Connexion - BookList",
  description: "Connectez-vous à votre compte BookList",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
