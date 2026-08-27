import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, user } from "@/drizzle/schema";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AdminPageHeader, RoleBadge, StatusBadge } from "@/app/admin/admin-ui";

export const metadata: Metadata = {
  title: "Utilisateurs",
  robots: { index: false, follow: false },
};

const USERS_PER_PAGE = 25;

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("fr-FR");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.q?.trim();
  const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);

  const filters = search
    ? or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`))
    : undefined;

  // Comptage des livres pré-agrégé puis joint : une jointure directe sur `book`
  // multiplierait les lignes d'utilisateur et fausserait la pagination. Une sous-requête
  // corrélée écrite à la main ne convient pas non plus — Drizzle y interpole les colonnes
  // sans qualifier leur table, et la condition devient toujours fausse.
  const bookCounts = db
    .select({ userId: book.userId, value: count().as("value") })
    .from(book)
    .groupBy(book.userId)
    .as("book_counts");

  const [rows, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isAnonymized: user.isAnonymized,
        createdAt: user.createdAt,
        // ::int explicite : sans lui, Postgres renvoie un bigint que le pilote livre en chaîne.
        bookCount: sql<number>`coalesce(${bookCounts.value}, 0)::int`,
      })
      .from(user)
      .leftJoin(bookCounts, eq(bookCounts.userId, user.id))
      .where(filters)
      .orderBy(desc(user.createdAt))
      .limit(USERS_PER_PAGE)
      .offset((currentPage - 1) * USERS_PER_PAGE),
    db.select({ value: count() }).from(user).where(filters),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        subtitle={`${total} compte${total !== 1 ? "s" : ""}${search ? ` correspondant à « ${search} »` : ""}`}
        breadcrumb={[{ href: "/admin", label: "Administration" }]}
      />

      {/* Formulaire GET : la recherche reste dans l'URL, donc partageable et rechargeable. */}
      <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field
          label="Rechercher un utilisateur"
          hideLabel
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Nom ou adresse e-mail…"
          className="sm:max-w-sm"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">
            Rechercher
          </Button>
          {search && (
            <Link href="/admin/users" className="link self-center text-sm">
              Effacer
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="font-medium text-stone-900">Aucun utilisateur ne correspond</p>
          <p className="mt-1 text-sm text-stone-500">
            {search ? "Essayez une autre recherche." : "Aucun compte n'existe encore."}
          </p>
        </div>
      ) : (
        <>
          {/* Cartes sur mobile : un tableau de cinq colonnes y serait illisible même avec un
              défilement horizontal. */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {rows.map((entry) => (
              <li key={entry.id}>
                <Link href={`/admin/users/${entry.id}`} className="card card-interactive block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">
                        {entry.isAnonymized ? "Compte supprimé" : entry.name}
                      </p>
                      <p className="truncate text-xs text-stone-500">{entry.email}</p>
                    </div>
                    <StatusBadge
                      isAnonymized={entry.isAnonymized}
                      emailVerified={entry.emailVerified}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                    <RoleBadge role={entry.role} />
                    <span>
                      {entry.bookCount} livre{entry.bookCount !== 1 ? "s" : ""}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>inscrit le {formatDate(entry.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs tracking-wide text-stone-500 uppercase">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Rôle
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    État
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Livres
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Inscription
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${entry.id}`}
                        className="font-medium text-stone-900 hover:underline"
                      >
                        {entry.isAnonymized ? "Compte supprimé" : entry.name}
                      </Link>
                      <p className="truncate text-xs text-stone-500">{entry.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={entry.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        isAnonymized={entry.isAnonymized}
                        emailVerified={entry.emailVerified}
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{entry.bookCount}</td>
                    <td className="px-4 py-3 text-right text-xs text-stone-400">
                      {formatDate(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
          <PageLink
            page={currentPage - 1}
            search={search}
            disabled={currentPage <= 1}
            label="← Précédent"
          />
          <p className="text-sm text-stone-500">
            Page {currentPage} / {totalPages}
          </p>
          <PageLink
            page={currentPage + 1}
            search={search}
            disabled={currentPage >= totalPages}
            label="Suivant →"
          />
        </nav>
      )}
    </>
  );
}

function PageLink({
  page,
  search,
  disabled,
  label,
}: {
  page: number;
  search?: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-300">
        {label}
      </span>
    );
  }

  const query = new URLSearchParams({ page: String(page) });
  if (search) query.set("q", search);

  return (
    <Link
      href={`/admin/users?${query}`}
      className="bg-card rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
    >
      {label}
    </Link>
  );
}
