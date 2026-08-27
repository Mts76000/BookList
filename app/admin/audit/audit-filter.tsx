"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

interface AuditFilterProps {
  action?: string;
  /** Actions réellement présentes dans le journal, avec leur libellé lisible. */
  options: { value: string; label: string; count: number }[];
}

/**
 * Filtre du journal d'audit.
 *
 * Composant client parce qu'il navigue au changement : le `<select>` vivait auparavant dans
 * un `<form method="get">` sans bouton d'envoi, si bien que choisir une action ne filtrait
 * rien. Le filtre reste porté par l'URL, donc partageable et conservé au rechargement.
 */
export function AuditFilter({ action, options }: AuditFilterProps) {
  const router = useRouter();

  return (
    <Select
      label="Filtrer par action"
      value={action ?? ""}
      onChange={(e) => {
        const value = e.target.value;
        router.push(value ? `/admin/audit?action=${encodeURIComponent(value)}` : "/admin/audit");
      }}
      className="w-full sm:max-w-xs"
    >
      <option value="">Toutes les actions</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} ({option.count})
        </option>
      ))}
    </Select>
  );
}
