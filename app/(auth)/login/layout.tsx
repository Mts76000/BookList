import type { Metadata } from "next";

// La page de connexion est un Client Component : son titre passe par ce layout.
export const metadata: Metadata = { title: "Connexion" };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
