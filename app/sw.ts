/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { isOptimizedCoverUrl } from "../lib/cover-hosts";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";

// Déclare `injectionPoint` pour TypeScript : c'est la chaîne remplacée
// par le manifeste de précache réel au moment du build.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const turnstileNetworkOnly: RuntimeCaching = {
  matcher: ({ url }) => url.origin === "https://challenges.cloudflare.com",
  handler: new NetworkOnly(),
};

const crossOriginImageCache: RuntimeCaching = {
  matcher: ({ request, sameOrigin }) => !sameOrigin && request.destination === "image",
  handler: new CacheFirst({
    cacheName: "cross-origin-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
};

// Couvertures optimisées par Next.js (/_next/image) : une URL donnée renvoie toujours la
// même image, on la sert donc depuis le cache sans revalider. La règle par défaut de Serwist
// n'en garde que 64, moins qu'une bibliothèque moyenne.
const optimizedCoverCache: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === "/_next/image",
  handler: new CacheFirst({
    cacheName: "book-covers",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
};

// Une couverture saisie à la main peut venir de n'importe quel site (voir lib/cover-hosts.ts).
// Interceptée, elle serait récupérée par fetch() depuis le service worker, soumis à
// connect-src (next.config.ts) qui ne liste que les hôtes connus : l'image échouerait. Ce
// listener, déclaré avant ceux de Serwist, les arrête sans répondre : le navigateur charge
// alors l'image lui-même, sous img-src. La règle `cross-origin` de `defaultCache`
// intercepterait sinon toute requête vers un autre site.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (
    request.destination === "image" &&
    new URL(request.url).origin !== self.location.origin &&
    !isOptimizedCoverUrl(request.url)
  ) {
    event.stopImmediatePropagation();
  }
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    turnstileNetworkOnly,
    optimizedCoverCache,
    crossOriginImageCache,
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Rappels de lecture (voir app/api/cron/reading-reminders) : le serveur envoie
// `{ title, body, url }`, le clic ouvre la page indiquée.
self.addEventListener("push", (event) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
  event.waitUntil(
    self.registration.showNotification(data?.title ?? "BookList", {
      body: data?.body,
      icon: "/pwa-icon-192",
      badge: "/pwa-icon-192",
      data: { url: data?.url ?? "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/dashboard";
  event.waitUntil(self.clients.openWindow(url));
});
