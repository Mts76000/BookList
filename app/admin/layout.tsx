import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { requireRole, ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { AdminNav } from "@/app/admin/admin-nav";
import { LogoMark } from "@/components/logo";

/**
 * Vérification autoritaire de l'accès au back-office, pour tout le segment /admin.
 *
 * Un visiteur non administrateur reçoit un 404 et non un 403 : révéler qu'une zone
 * d'administration existe à cette adresse n'apporte rien, et invite à insister.
 *
 * Le back-office a son propre châssis, plus sobre que l'application : barre latérale
 * sombre, surfaces neutres et coins resserrés (voir `.admin-scope` dans globals.css), pour
 * qu'on sache d'un coup d'œil qu'on n'est plus côté lecteur.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await requireRole("admin");
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) notFound();
    throw err;
  }

  return (
    <div className="admin-scope min-h-dvh bg-[#f5f2ec] lg:pl-60">
      <aside className="bg-stone-950 px-4 pt-4 text-stone-300 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col lg:px-3 lg:py-5">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6 lg:px-2">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="text-sm font-semibold tracking-tight text-stone-50">
              BookList <span className="font-normal text-stone-500">Admin</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-stone-400 transition-colors hover:text-stone-100 lg:hidden"
          >
            L&apos;app
          </Link>
        </div>
        <AdminNav />
        <div className="mt-auto hidden border-t border-stone-800 pt-4 lg:block">
          <p className="truncate px-2 text-xs text-stone-500">{session.user.email}</p>
          <Link
            href="/dashboard"
            className="mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-stone-400 transition-colors hover:bg-stone-800/60 hover:text-stone-100"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour à l&apos;application
          </Link>
        </div>
      </aside>

      <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}
