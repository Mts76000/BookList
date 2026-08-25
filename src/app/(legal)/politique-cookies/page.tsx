import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politique cookies",
  description: "Politique relative aux cookies et traceurs utilisés par BookList.",
  alternates: {
    canonical: "/politique-cookies",
  },
}

export default function PolitiqueCookiesPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Politique cookies</h1>

      <p className="mt-4 text-stone-600">
        BookList utilise des cookies et des technologies similaires pour assurer le bon
        fonctionnement du service.
      </p>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Que sont les cookies ?</h2>
        <p className="mt-2 text-stone-600">
          Les cookies sont de petits fichiers texte stockés sur votre appareil lors de la visite d&apos;un
          site. Ils permettent de mémoriser des informations utiles.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Cookies utilisés</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600">
          <li>
            <strong>Cookies essentiels</strong> : nécessaires à l&apos;authentification (NextAuth) et au
            fonctionnement de l&apos;application. Ils ne peuvent pas être désactivés sans perdre l&apos;accès
            au compte.
          </li>
          <li>
            <strong>Préférences</strong> : mémorisent votre choix concernant la bannière de cookies.
          </li>
          <li>
            <strong>Service worker (PWA)</strong> : permet le fonctionnement hors ligne de
            l&apos;application. Ce n&apos;est pas un cookie, mais un stockage local.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Cookies tiers et suivi</h2>
        <p className="mt-2 text-stone-600">
          BookList n&apos;utilise pas de cookies de publicité, de réseaux sociaux ou d&apos;analytics tiers.
          Aucune donnée n&apos;est transmise à des fins de tracking commercial.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Gestion du consentement</h2>
        <p className="mt-2 text-stone-600">
          Lors de votre première visite, une bannière vous informe de l&apos;utilisation des cookies.
          Les cookies essentiels sont activés par défaut car ils sont indispensables au service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Vie privée</h2>
        <p className="mt-2 text-stone-600">
          Pour en savoir plus sur le traitement de vos données, consultez la{" "}
          <a href="/politique-confidentialite" className="btn-text">politique de confidentialité</a>.
        </p>
      </section>

      <p className="mt-10 text-sm text-stone-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>
    </>
  )
}
