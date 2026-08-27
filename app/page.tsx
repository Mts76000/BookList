import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountButton } from "@/components/account-button";
import { Footer } from "@/components/footer";
import { getOptionalSession } from "@/lib/permissions";
import { env } from "@/lib/env";

export default async function Home() {
  const session = await getOptionalSession();

  return (
    <div className="bg-background flex min-h-[100dvh] flex-col">
      <header className="border-border border-b px-6 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className="text-foreground text-sm font-semibold tracking-tight">
            {env.NEXT_PUBLIC_APP_NAME}
          </span>
          {session ? (
            <AccountButton />
          ) : (
            <div className="flex gap-3">
              <Link href="/login">
                <Button type="button" variant="secondary">
                  Se connecter
                </Button>
              </Link>
              <Link href="/register">
                <Button type="button">Créer un compte</Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center"
      >
        <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          {env.NEXT_PUBLIC_APP_NAME}
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Auth, email, analytics, sécurité et tests déjà en place. Décrivez vos fonctionnalités
          métier, le reste est prêt.
        </p>
      </main>
      <Footer />
    </div>
  );
}
