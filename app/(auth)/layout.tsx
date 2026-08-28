import Link from "next/link";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex min-h-[100dvh] flex-col">
      <header className="px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center">
          <Link href="/">
            <Logo size="sm" priority />
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
