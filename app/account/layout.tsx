import { AppShell } from "@/components/app-shell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <main
        id="main-content"
        className="animate-fade-in-up mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8"
      >
        {children}
      </main>
    </AppShell>
  );
}
