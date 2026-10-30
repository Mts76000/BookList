"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import { CHALLENGE_KINDS, type ChallengeKind } from "@/lib/challenges";

const KIND_IDS = Object.keys(CHALLENGE_KINDS) as ChallengeKind[];

/** Formulaire de création d'un défi personnel (Premium). */
export function ChallengeForm({ year }: { year: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ChallengeKind>("genre");
  const [target, setTarget] = useState("");
  const [filter, setFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    const result = await apiFetch("/api/challenges", {
      method: "POST",
      json: { title, kind, target, filter },
    });
    setIsSaving(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    toast("Défi créé.", "success");
    setTitle("");
    setTarget("");
    setFilter("");
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" onClick={() => setIsOpen(true)} className="w-full sm:w-auto">
        Créer un défi
      </Button>
    );
  }

  const needsFilter = CHALLENGE_KINDS[kind].needsFilter;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-5 sm:p-6">
      <h3 className="text-sm font-medium text-stone-900">Nouveau défi {year}</h3>
      <Field
        label="Nom du défi"
        required
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex : Un classique par mois"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Ce qui compte"
          value={kind}
          onChange={(e) => setKind(e.target.value as ChallengeKind)}
        >
          {KIND_IDS.map((id) => (
            <option key={id} value={id}>
              {CHALLENGE_KINDS[id].label}
            </option>
          ))}
        </Select>
        <Field
          label={`Objectif (${CHALLENGE_KINDS[kind].unit})`}
          type="number"
          inputMode="numeric"
          min={1}
          required
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Ex : 12"
        />
      </div>
      {needsFilter && (
        <Field
          label={kind === "genre" ? "Genre" : "Auteur"}
          required
          maxLength={200}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={kind === "genre" ? "Ex : Classique" : "Ex : Agatha Christie"}
          helperText={
            kind === "genre"
              ? "Tel qu'il apparaît sur vos livres, sans tenir compte des majuscules."
              : "Un nom partiel suffit."
          }
        />
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">
          Créer
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsOpen(false)}
          className="w-full sm:w-auto"
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function DeleteChallengeButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await apiFetch(`/api/challenges/${id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!result.ok) {
      toast(result.message, "error");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label={`Supprimer le défi ${title}`}
      className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-stone-400 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
    >
      <Trash size={16} aria-hidden="true" />
    </button>
  );
}
