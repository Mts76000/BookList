/**
 * Renders nothing when NEXT_PUBLIC_BUYMEACOFFEE_SLUG isn't set — opt-in per project, not
 * baked into every project by default (see .env.example).
 *
 * Uses Buy Me a Coffee's static link, not their official <script> widget: that script relies
 * on document.write() to inject its iframe, which silently no-ops once the document has
 * finished loading — exactly what happens with any async/deferred script loading strategy
 * (next/script's afterInteractive/lazyOnload included). Verified the official snippet never
 * actually renders anything in this setup before switching.
 */
export function BuyMeACoffeeButton() {
  const slug = process.env.NEXT_PUBLIC_BUYMEACOFFEE_SLUG;
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "ce projet";
  if (!slug) return null;

  return (
    <section className="border-border bg-card rounded-xl border p-6 text-center">
      <h2 className="text-card-foreground text-base font-semibold">Soutenir {appName}</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Un café, c&apos;est le meilleur moyen de nous remercier.
      </p>
      <a
        href={`https://www.buymeacoffee.com/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-primary text-on-primary mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium shadow-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
      >
        <span aria-hidden="true">☕</span>
        Soutenir {appName}
      </a>
    </section>
  );
}
