"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

type Target = "me" | "user" | "all";

const TARGETS: { value: Target; label: string; hint: string }[] = [
  { value: "me", label: "Moi", hint: "Pour tester sur vos appareils" },
  { value: "user", label: "Un lecteur", hint: "Par son e-mail" },
  { value: "all", label: "Tous", hint: "Tous les abonnés aux notifications" },
];

/** Formulaire d'envoi d'une notification push, avec un aperçu de son rendu. */
export function NotificationForm({ subscriberCount }: { subscriberCount: number }) {
  const { toast } = useToast();
  const [target, setTarget] = useState<Target>("me");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Un chapitre ce soir ?");
  const [body, setBody] = useState("Quelques pages suffisent pour prolonger votre série.");
  const [url, setUrl] = useState("/dashboard");
  const [confirmAll, setConfirmAll] = useState(false);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (target === "all" && !confirmAll) {
      setConfirmAll(true);
      return;
    }
    setIsSending(true);
    const result = await apiFetch("/api/admin/notifications", {
      method: "POST",
      json: { target, email, title, body, url },
    });
    setIsSending(false);
    setConfirmAll(false);
    toast(
      result.ok ? (result.message ?? "Envoyée.") : result.message,
      result.ok ? "success" : "error",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-stone-700">Destinataire</legend>
          <div className="grid grid-cols-3 gap-2">
            {TARGETS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={target === option.value}
                onClick={() => {
                  setTarget(option.value);
                  setConfirmAll(false);
                }}
                className={`rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition ${
                  target === option.value
                    ? "border-stone-900 bg-stone-900 text-stone-50"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span
                  className={`block text-xs ${target === option.value ? "text-stone-400" : "text-stone-500"}`}
                >
                  {option.value === "all" ? `${subscriberCount} abonné(s)` : option.hint}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {target === "user" && (
          <Field
            label="E-mail du lecteur"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <Field
          label="Titre"
          required
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          label="Message"
          required
          maxLength={240}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Field
          label="Page ouverte au clic"
          helperText="Un chemin de l'application, par exemple /dashboard ou /books."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" isLoading={isSending}>
            {target === "all" && confirmAll
              ? `Confirmer l'envoi à ${subscriberCount} abonné(s)`
              : "Envoyer"}
          </Button>
          {confirmAll && (
            <Button type="button" variant="ghost" onClick={() => setConfirmAll(false)}>
              Annuler
            </Button>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-stone-700">Aperçu</p>
        <div className="rounded-[var(--radius-md)] bg-stone-900/90 p-3 shadow-lg">
          <div className="flex gap-3 rounded-[var(--radius-sm)] bg-white/95 p-3">
            <span className="bg-accent-500 flex size-8 shrink-0 items-center justify-center rounded-lg font-serif text-sm text-white">
              B
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900">{title || "Titre"}</p>
              <p className="line-clamp-3 text-xs text-stone-600">{body || "Message"}</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
