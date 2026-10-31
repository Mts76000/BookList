"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: (code: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileHandle {
  /** Demande un nouveau jeton : chaque jeton n'est accepté qu'une fois par Cloudflare. */
  reset: () => void;
}

interface TurnstileWidgetProps {
  siteKey: string;
  /** Reçoit le jeton, ou "" quand il n'est plus valable (expiré, réinitialisé, en erreur). */
  onVerify: (token: string) => void;
  ref?: Ref<TurnstileHandle>;
}

export function TurnstileWidget({ siteKey, onVerify, ref }: TurnstileWidgetProps) {
  const containerId = useId();
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  function reset() {
    setFailed(false);
    onVerifyRef.current("");
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }

  useImperativeHandle(ref, () => ({ reset }));

  useEffect(() => {
    function render() {
      const container = document.getElementById(containerId);
      if (!container || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => {
          setFailed(false);
          onVerifyRef.current(token);
        },
        // Sans ce callback, Turnstile lève une exception et le formulaire reste bloqué sans
        // explication. Il retente déjà seul ; on laisse en plus la main à l'utilisateur.
        "error-callback": () => {
          setFailed(true);
          onVerifyRef.current("");
        },
        // Un jeton expire au bout de 5 minutes : Turnstile en redemande un tout seul, il ne
        // faut plus envoyer l'ancien d'ici là.
        "expired-callback": () => onVerifyRef.current(""),
      });
    }

    if (window.turnstile) render();
    const interval = window.turnstile
      ? undefined
      : setInterval(() => window.turnstile && render(), 200);
    return () => {
      if (interval) clearInterval(interval);
      if (widgetIdRef.current) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [containerId, siteKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div id={containerId} />
      {failed ? (
        <p className="text-destructive text-xs" role="alert">
          La vérification anti-robot n&apos;a pas abouti. Un bloqueur de publicité, un VPN ou une
          extension de protection peut l&apos;empêcher.{" "}
          <button type="button" onClick={reset} className="font-medium underline">
            Réessayer
          </button>
        </p>
      ) : null}
    </>
  );
}
