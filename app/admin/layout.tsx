import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole, ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { AdminNav } from "@/app/admin/admin-nav";
import { Footer } from "@/components/footer";

/**
 * Vérification autoritaire de l'accès au back-office, pour tout le segment /admin.
 *
 * Un visiteur non administrateur reçoit un 404 et non un 403 : révéler qu'une zone
 * d'administration existe à cette adresse n'apporte rien, et invite à insister.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole("admin");
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  return (
    <div className="bg-background-soft flex min-h-screen flex-col">
      <header className="bg-card border-b border-stone-200/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <Link href="/admin" className="font-serif text-lg tracking-tight text-stone-900">
                Administration
              </Link>
              <span className="badge bg-accent-50 text-accent-700">BookList</span>
            </div>
            <Link href="/dashboard" className="link text-sm">
              Retour à l&apos;application
            </Link>
          </div>
          <AdminNav />
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}
