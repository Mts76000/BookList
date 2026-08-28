import Link from "next/link";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-[100dvh] flex-col">
      <header className="border-border border-b px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center">
          <Link href="/">
            <Logo size="sm" priority />
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
