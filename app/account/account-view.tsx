"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChartBar,
  Desktop,
  DeviceMobile,
  Download,
  Key,
  Laptop,
  ShieldCheck,
  SignOut,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useSession } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { formatUserAgent, formatIp } from "@/lib/format-session";
import { BuyMeACoffeeButton } from "@/components/buy-me-a-coffee";
import { PwaInstallSection } from "@/components/pwa-install";
import { apiFetch } from "@/lib/api-client";
import type { ReadingStats } from "@/lib/reading-stats";

interface SessionRow {
  id: string;
  token: string;
  createdAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2);
  return (initials ?? "?").toUpperCase();
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card rounded-xl border p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </span>
        <div>
          <h2 className="text-card-foreground text-base font-semibold">{title}</h2>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

interface AccountViewProps {
  stats: ReadingStats;
  /** Nom d'affichage, fourni par le serveur : la session client n'est pas encore chargée
   *  au premier rendu, et le champ ne doit pas partir vide puis se remplir. */
  userName: string;
  /** Livres lus avant l'inscription, saisis à l'onboarding et comptés dans le total. */
  initialBooksRead: number;
  /** Déjà formatée côté serveur : formater une date ici produit un rendu différent de
   *  celui du serveur (locale et fuseau du processus Node), et casse l'hydratation. */
  memberSince: string;
}

export function AccountView({ stats, userName, initialBooksRead, memberSince }: AccountViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session, isPending } = useSession();

  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [name, setName] = useState(userName);
  const [initialBooks, setInitialBooks] = useState(String(initialBooksRead));
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    authClient.listSessions().then(({ data }) => {
      if (data) setSessions(data as SessionRow[]);
    });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const result = await apiFetch("/api/account", {
        method: "PATCH",
        json: { name, initialBooksRead: initialBooks },
      });
      if (!result.ok) {
        toast(result.message, "error");
        return;
      }
      toast("Profil mis à jour.", "success");
      router.refresh();
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        toast(error.message ?? "Impossible de changer le mot de passe.", "error");
        return;
      }
      toast("Mot de passe modifié. Les autres sessions ont été déconnectées.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setIsPasswordFormOpen(false);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevokeSession(token: string) {
    await authClient.revokeSession({ token });
    setSessions((prev) => prev?.filter((s) => s.token !== token) ?? null);
    toast("Session révoquée.", "success");
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast(json.error.message, "error");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return null; // proxy + requireAuth() redirect unauthenticated users before this renders
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-6">
        <div className="flex items-center gap-4">
          <span className="bg-primary text-on-primary flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold">
            {initialsFrom(session.user.name || session.user.email)}
          </span>
          <div>
            <h1 className="text-card-foreground text-lg font-semibold tracking-tight">
              {session.user.name || "Mon compte"}
            </h1>
            <p className="text-muted-foreground text-sm">{session.user.email}</p>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={handleSignOut}>
          <SignOut size={16} aria-hidden="true" />
          Se déconnecter
        </Button>
      </div>

      <SectionCard
        icon={<ChartBar size={18} aria-hidden="true" />}
        title="Vos statistiques"
        description={`Membre depuis le ${memberSince}.`}
      >
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Livres lus", value: stats.totalBooks },
            { label: "Pages lues", value: stats.totalPagesRead },
            {
              label: "Note moyenne",
              value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—",
            },
            { label: "Notes écrites", value: stats.commentsCount },
          ].map((tile) => (
            <div key={tile.label}>
              <dt className="text-muted-foreground text-xs">{tile.label}</dt>
              <dd className="font-serif text-2xl text-stone-900 tabular-nums">{tile.value}</dd>
            </div>
          ))}
        </dl>

        {(stats.topAuthors[0] || stats.topGenres[0]) && (
          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-stone-100 pt-6 sm:grid-cols-2">
            {stats.topAuthors[0] && (
              <div>
                <dt className="text-muted-foreground text-xs">Auteur le plus lu</dt>
                <dd className="font-medium text-stone-900">
                  {stats.topAuthors[0].author}{" "}
                  <span className="text-muted-foreground text-sm">
                    ({stats.topAuthors[0].count})
                  </span>
                </dd>
              </div>
            )}
            {stats.topGenres[0] && (
              <div>
                <dt className="text-muted-foreground text-xs">Genre préféré</dt>
                <dd className="font-medium text-stone-900">{stats.topGenres[0]}</dd>
              </div>
            )}
          </dl>
        )}

        {stats.pagesPerYear.length > 0 && (
          <div className="mt-6 border-t border-stone-100 pt-6">
            <p className="text-muted-foreground mb-3 text-xs">Pages lues par année</p>
            <ul className="space-y-2">
              {stats.pagesPerYear.map((entry) => {
                const max = Math.max(...stats.pagesPerYear.map((y) => y.pages));
                return (
                  <li key={entry.year} className="flex items-center gap-3">
                    <span className="w-10 text-xs text-stone-500 tabular-nums">{entry.year}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                      <span
                        className="bg-accent-400 block h-full rounded-full"
                        style={{ width: `${Math.max(2, (entry.pages / max) * 100)}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-16 text-right text-xs tabular-nums">
                      {entry.pages}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<BookOpen size={18} aria-hidden="true" />}
        title="Profil de lecture"
        description="Votre nom d'affichage et les livres lus avant votre inscription."
      >
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 sm:max-w-sm">
          <Field
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <Field
            label="Livres lus avant BookList"
            type="number"
            inputMode="numeric"
            min={0}
            helperText="Comptés dans votre total, sans avoir à les saisir un par un."
            value={initialBooks}
            onChange={(e) => setInitialBooks(e.target.value)}
          />
          <div>
            <Button type="submit" isLoading={isSavingProfile}>
              Enregistrer
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        icon={<Key size={18} aria-hidden="true" />}
        title="Sécurité"
        description="Changer votre mot de passe déconnecte vos autres sessions."
      >
        {isPasswordFormOpen ? (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4 sm:max-w-sm">
            <Field
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Field
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              helperText="8 caractères minimum."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex gap-3">
              <Button type="submit" isLoading={isChangingPassword}>
                Mettre à jour le mot de passe
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsPasswordFormOpen(false)}>
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsPasswordFormOpen(true)}
            className="self-start"
          >
            Changer le mot de passe
          </Button>
        )}
      </SectionCard>

      <SectionCard
        icon={<Laptop size={18} aria-hidden="true" />}
        title="Sessions actives"
        description="Les appareils actuellement connectés à votre compte."
      >
        {sessions === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <ul className="divide-border -mx-2 flex flex-col divide-y">
            {sessions.map((s) => {
              const isCurrent = s.token === session.session.token;
              return (
                <li key={s.id} className="flex items-center justify-between gap-4 px-2 py-3">
                  <div className="flex items-center gap-3">
                    <Desktop
                      size={20}
                      className="text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-card-foreground text-sm">{formatUserAgent(s.userAgent)}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatIp(s.ipAddress)} · {new Date(s.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  {isCurrent ? (
                    <span className="text-primary flex items-center gap-1.5 text-xs font-medium">
                      <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" />
                      Session actuelle
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleRevokeSession(s.token)}
                      aria-label="Révoquer cette session"
                    >
                      <Trash size={16} aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={<ShieldCheck size={18} aria-hidden="true" />}
        title="Données et confidentialité"
        description="Téléchargez une copie de vos données personnelles."
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.open("/api/account/export", "_blank")}
        >
          <Download size={16} aria-hidden="true" />
          Exporter mes données
        </Button>
      </SectionCard>

      <SectionCard
        icon={<DeviceMobile size={18} aria-hidden="true" />}
        title="Installer l'application"
        description="Ajoutez-la à votre écran d'accueil pour un accès rapide, comme une app native."
      >
        <PwaInstallSection />
      </SectionCard>

      <section className="border-destructive/30 bg-destructive/5 rounded-xl border p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="bg-destructive/10 text-destructive flex size-9 shrink-0 items-center justify-center rounded-lg">
            <WarningCircle size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-card-foreground text-base font-semibold">Zone de danger</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              La suppression de votre compte est définitive et irréversible.
            </p>
          </div>
        </div>
        {isConfirmingDelete ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-card-foreground text-sm">Confirmer la suppression définitive ?</p>
            <Button
              type="button"
              variant="destructive"
              isLoading={isDeleting}
              onClick={handleDeleteAccount}
            >
              Oui, supprimer
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsConfirmingDelete(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button type="button" variant="destructive" onClick={() => setIsConfirmingDelete(true)}>
            <Trash size={16} aria-hidden="true" />
            Supprimer mon compte
          </Button>
        )}
      </section>

      <BuyMeACoffeeButton />
    </div>
  );
}
