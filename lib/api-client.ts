import type { ApiErrorCode } from "@/lib/api-response";

type ApiResult<T> =
  { ok: true; data: T; message?: string } | { ok: false; message: string; code?: ApiErrorCode };

const NETWORK_ERROR_MESSAGE = "Connexion impossible. Vérifiez votre réseau et réessayez.";
const UNEXPECTED_ERROR_MESSAGE = "Une erreur inattendue est survenue.";

/**
 * Appelle une route de l'API et déplie son enveloppe `{ success, data | error }`.
 *
 * Sans ce helper, chaque composant client répète le même bloc : sérialiser le corps, lire le
 * JSON, tester `success`, sortir le message d'erreur — et surtout oublie le cas où `fetch`
 * lui-même échoue (hors ligne, requête interrompue), qui laisse alors une exception non
 * gérée à l'écran. Le résultat est un objet discriminé : impossible de lire `data` sans avoir
 * vérifié `ok`.
 */
export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<ApiResult<T>> {
  const { json: body, ...requestInit } = init ?? {};

  try {
    const response = await fetch(url, {
      ...requestInit,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...requestInit.headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const payload = await response.json().catch(() => null);

    if (!payload || typeof payload !== "object") {
      return { ok: false, message: UNEXPECTED_ERROR_MESSAGE };
    }

    if (!("success" in payload) || payload.success !== true) {
      const error = (payload as { error?: { message?: string; code?: ApiErrorCode } }).error;
      return {
        ok: false,
        message: error?.message ?? UNEXPECTED_ERROR_MESSAGE,
        code: error?.code,
      };
    }

    const success = payload as { data: T; message?: string };
    return { ok: true, data: success.data, message: success.message };
  } catch {
    return { ok: false, message: NETWORK_ERROR_MESSAGE };
  }
}
