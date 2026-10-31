"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Desktop, Download, SignOut, Trash } from "@phosphor-icons/react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useSession } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { formatUserAgent, formatIp } from "@/lib/format-session";
import { apiFetch } from "@/lib/api-client";

/**
 * Blocs interactifs des pages du compte. Chaque page (vue d'ensemble, sécurité, données)
 * est un Server Component qui vérifie la session puis assemble les blocs dont elle a
 * besoin : la page du compte n'est plus un seul long formulaire.
 */

interface SessionRow {
  id: string;
  token: string;
  createdAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Carte de section, avec un titre et une description facultative. */
export function SectionCard({
  title,
  description,
  tone = "default",
  children,
}: {
  title: string;
  description?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--radius-md)] border p-5 sm:p-6 ${
        tone === "danger" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" onClick={handleSignOut} className="w-full sm:w-auto">
      <SignOut size={16} aria-hidden="true" />
      Se déconnecter
    </Button>
  );
}

/** Prénom et livres lus avant l'inscription. */
export function ProfileForm({
  userName,
  initialBooksRead,
}: {
  userName: string;
  initialBooksRead: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(userName);
  const [initialBooks, setInitialBooks] = useState(String(initialBooksRead));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
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
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 sm:items-start">
      <Field
        label="Prénom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="given-name"
      />
      <Field
        label="Livres lus avant BookList"
        type="number"
        inputMode="numeric"
        min={0}
        helperText="Comptés dans votre total, sans les saisir un par un."
        value={initialBooks}
        onChange={(e) => setInitialBooks(e.target.value)}
      />
      <div className="sm:col-span-2">
        <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
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
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
        Changer le mot de passe
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:max-w-sm">
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
        <Button type="submit" isLoading={isSaving}>
          Mettre à jour
        </Button>
        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** Appareils connectés, avec révocation des autres sessions. */
export function SessionList() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    authClient.listSessions().then(({ data }) => {
      if (data) setSessions(data as SessionRow[]);
    });
  }, []);

  async function handleRevoke(token: string) {
    await authClient.revokeSession({ token });
    setSessions((prev) => prev?.filter((s) => s.token !== token) ?? null);
    toast("Session révoquée.", "success");
  }

  if (sessions === null) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <ul className="-mx-2 flex flex-col divide-y divide-stone-100">
      {sessions.map((s) => {
        const isCurrent = s.token === session?.session.token;
        return (
          <li key={s.id} className="flex items-center justify-between gap-4 px-2 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Desktop size={20} className="shrink-0 text-stone-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm text-stone-900">{formatUserAgent(s.userAgent)}</p>
                <p className="truncate text-xs text-stone-500">
                  {formatIp(s.ipAddress)} · {new Date(s.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
            {isCurrent ? (
              <span className="text-moss-700 flex shrink-0 items-center gap-1.5 text-xs font-medium">
                <span className="bg-moss-500 size-1.5 rounded-full" aria-hidden="true" />
                Cet appareil
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleRevoke(s.token)}
                aria-label="Révoquer cette session"
                className="shrink-0 px-3"
              >
                <Trash size={16} aria-hidden="true" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DataExport() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant="secondary"
        onClick={() => window.open("/api/books/export", "_blank")}
      >
        <Download size={16} aria-hidden="true" />
        Mes livres (CSV)
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => window.open("/api/account/export", "_blank")}
      >
        <Download size={16} aria-hidden="true" />
        Toutes mes données (JSON)
      </Button>
    </div>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await apiFetch("/api/account", { method: "DELETE" });
      if (!result.ok) {
        toast(result.message, "error");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isConfirming) {
    return (
      <Button type="button" variant="destructive" onClick={() => setIsConfirming(true)}>
        <Trash size={16} aria-hidden="true" />
        Supprimer mon compte
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-stone-900">Confirmer la suppression définitive ?</p>
      <Button type="button" variant="destructive" isLoading={isDeleting} onClick={handleDelete}>
        Oui, supprimer
      </Button>
      <Button type="button" variant="ghost" onClick={() => setIsConfirming(false)}>
        Annuler
      </Button>
    </div>
  );
}
