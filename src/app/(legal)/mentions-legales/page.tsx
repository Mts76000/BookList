import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales et informations éditeur du site BookList.",
  alternates: {
    canonical: "/mentions-legales",
  },
}

export default function MentionsLegalesPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Mentions légales</h1>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Éditeur du site</h2>
        <p className="mt-2 text-stone-600">
          Le site BookList est édité par Mathis Lamotte.
          <br />
          Email : <a href="mailto:contact@mathis-lamotte.fr" className="btn-text">contact@mathis-lamotte.fr</a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Hébergement</h2>
        <p className="mt-2 text-stone-600">
          Le site est hébergé par Hostinger.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Propriété intellectuelle</h2>
        <p className="mt-2 text-stone-600">
          L&apos;ensemble des éléments composant le site (textes, graphismes, logiciels, photographies,
          images, icônes, etc.) sont la propriété exclusive de l&apos;éditeur ou de ses partenaires.
          Toute reproduction, représentation ou adaptation, totale ou partielle, est interdite sans
          autorisation écrite préalable.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Contact</h2>
        <p className="mt-2 text-stone-600">
          Pour toute question relative aux mentions légales, vous pouvez nous contacter à l&apos;adresse
          suivante : <a href="mailto:contact@mathis-lamotte.fr" className="btn-text">contact@mathis-lamotte.fr</a>.
        </p>
      </section>

      <p className="mt-10 text-sm text-stone-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>
    </>
  )
}
