import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/drizzle/schema";
import { getAdminStats } from "@/lib/admin-stats";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("fr-FR");
}

export default async function AdminOverviewPage() {
  const [stats, latestUsers] = await Promise.all([
    getAdminStats(),
    db.query.user.findMany({
      orderBy: [desc(user.createdAt)],
      limit: 5,
      columns: { id: true, name: true, email: true, createdAt: true, isAnonymized: true },
    }),
  ]);

  const tiles = [
    { label: "Utilisateurs", value: stats.totalUsers, hint: `dont ${stats.admins} admin(s)` },
    {
      label: "Inscriptions (30 j)",
      value: stats.newUsersLast30Days,
      hint: `${stats.verifiedUsers} compte(s) vérifié(s)`,
    },
    {
      label: "Livres",
      value: stats.totalBooks,
      hint: `${stats.booksAddedLast30Days} sur 30 jours`,
    },
    {
      label: "Actifs (30 j)",
      value: stats.activeUsersLast30Days,
      hint: "ont ajouté un livre",
    },
  ];

  return (
    <>
      <h1 className="font-serif text-2xl text-stone-900">Vue d&apos;ensemble</h1>
      <p className="mt-1 text-sm text-stone-500">
        {stats.deletedUsers > 0
          ? `${stats.deletedUsers} compte(s) supprimé(s) et anonymisé(s), inclus dans le total.`
          : "Aucun compte supprimé."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4 sm:p-5">
            <p className="font-serif text-2xl text-stone-900 tabular-nums sm:text-3xl">
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">{tile.label}</p>
            <p className="mt-0.5 text-xs text-stone-400">{tile.hint}</p>
          </div>
        ))}
      </div>

      <section className="card mt-8 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg text-stone-900">Dernières inscriptions</h2>
          <Link href="/admin/users" className="link text-sm">
            Tous les utilisateurs
          </Link>
        </div>

        {latestUsers.length > 0 ? (
          <ul className="divide-y divide-stone-100">
            {latestUsers.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/${entry.id}`}
                    className="font-medium text-stone-900 hover:underline"
                  >
                    {entry.isAnonymized ? "Compte supprimé" : entry.name}
                  </Link>
                  <p className="truncate text-sm text-stone-500">{entry.email}</p>
                </div>
                <time className="shrink-0 text-xs text-stone-400">
                  {formatDate(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-stone-400">Aucun utilisateur.</p>
        )}
      </section>
    </>
  );
}
