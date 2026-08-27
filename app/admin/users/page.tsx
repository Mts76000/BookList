import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { book, user } from "@/drizzle/schema";
import { Field } from "@/components/ui/field";

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

  // Comptage des livres par utilisateur, pré-agrégé puis joint : une jointure directe sur
  // `book` multiplierait les lignes d'utilisateur et fausserait la pagination.
  // À noter : une sous-requête corrélée écrite à la main dans un template `sql` ne convient
  // pas ici — Drizzle y interpole les colonnes sans qualifier leur table, et la condition
  // devient `"user_id" = "id"`, les deux résolus dans la portée de `book`, donc toujours
  // fausse et un comptage systématiquement à zéro.
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
      <h1 className="font-serif text-2xl text-stone-900">Utilisateurs</h1>
      <p className="mt-1 text-sm text-stone-500">
        {total} compte{total !== 1 ? "s" : ""}
        {search ? ` correspondant à « ${search} »` : ""}
      </p>

      {/* Formulaire GET : la recherche reste dans l'URL, donc partageable et rechargeable. */}
      <form method="get" className="mt-6 flex items-end gap-2">
        <Field
          label="Rechercher un utilisateur"
          hideLabel
          type="search"
          name="q"
          defaultValue={search ?? ""}
          placeholder="Nom ou adresse e-mail…"
          className="max-w-sm"
        />
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
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
              <tr key={entry.id} className="hover:bg-stone-50/70">
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
                  <span
                    className={`badge ${entry.role === "admin" ? "bg-accent-50 text-accent-700" : "bg-stone-100 text-stone-600"}`}
                  >
                    {entry.role === "admin" ? "Admin" : "Utilisateur"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {entry.isAnonymized ? (
                    <span className="badge bg-stone-100 text-stone-500">Supprimé</span>
                  ) : entry.emailVerified ? (
                    <span className="badge bg-moss-100 text-moss-800">Vérifié</span>
                  ) : (
                    <span className="badge bg-amber-100 text-amber-600">Non vérifié</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{entry.bookCount}</td>
                <td className="px-4 py-3 text-right text-xs text-stone-400">
                  {formatDate(entry.createdAt)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-stone-400">
                  Aucun utilisateur ne correspond.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
