"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";

/** Clé publique VAPID : variable `NEXT_PUBLIC_*`, lue directement (pas de lib/env côté client). */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** La clé VAPID est publiée en base64url ; PushManager attend des octets. */
function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

/**
 * Rappel du soir quand on n'a pas encore lu dans la journée. L'abonnement vaut pour cet
 * appareil seulement : à activer sur chaque téléphone ou ordinateur voulu. Sur iPhone, les
 * notifications web ne fonctionnent qu'une fois l'application installée sur l'écran d'accueil.
 */
export function ReminderSettings() {
  const { toast } = useToast();
  const [state, setState] = useState<State>("loading");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    async function detect() {
      if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "on" : "off");
    }
    void detect();
  }, []);

  async function enable() {
    setIsBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY!),
      });
      const result = await apiFetch("/api/notifications/subscription", {
        method: "POST",
        json: subscription.toJSON(),
      });
      if (!result.ok) {
        await subscription.unsubscribe();
        toast(result.message, "error");
        return;
      }
      setState("on");
      toast("Rappels activés sur cet appareil.", "success");
    } catch {
      toast("Impossible d'activer les rappels sur ce navigateur.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function disable() {
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await apiFetch("/api/notifications/subscription", {
          method: "DELETE",
          json: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setIsBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="text-sm text-stone-500">
        Ce navigateur ne permet pas les notifications. Sur iPhone, installez d&apos;abord
        l&apos;application sur l&apos;écran d&apos;accueil.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-stone-500">
        Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur
        pour recevoir les rappels.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-stone-600">
        {state === "on"
          ? "Activés sur cet appareil : un rappel le soir si vous n'avez pas encore lu."
          : "Un rappel le soir si vous n'avez pas encore lu, pour garder votre série."}
      </p>
      <Button
        variant={state === "on" ? "secondary" : "primary"}
        onClick={state === "on" ? disable : enable}
        isLoading={isBusy}
        className="w-full shrink-0 sm:w-auto"
      >
        {state === "on" ? "Désactiver" : "Activer les rappels"}
      </Button>
    </div>
  );
}
