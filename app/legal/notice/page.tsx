import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales et informations éditeur du site BookList.",
  alternates: { canonical: canonicalUrl("/legal/notice") },
};

export default function LegalNoticePage() {
  return (
    <>
      <h1 className="text-3xl text-stone-900 sm:text-4xl">Mentions légales</h1>
      <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : 31 octobre 2026</p>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Éditeur du site</h2>
        <p className="mt-2 text-stone-600">
          Le site BookList est édité par Mathis Lamotte, également directeur de la publication.
          <br />
          Email :{" "}
          <a href="mailto:contact@mathis-lamotte.fr" className="link">
            contact@mathis-lamotte.fr
          </a>
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Hébergement</h2>
        <p className="mt-2 text-stone-600">
          Le site est hébergé par Hostinger International Ltd., 61 Lordou Vironos Street, 6023
          Larnaca, Chypre (
          <a href="https://www.hostinger.fr" className="link" rel="noopener noreferrer">
            hostinger.fr
          </a>
          ).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Propriété intellectuelle</h2>
        <p className="mt-2 text-stone-600">
          L&apos;ensemble des éléments composant le site (textes, graphismes, logiciels,
          photographies, images, icônes, etc.) sont la propriété exclusive de l&apos;éditeur ou de
          ses partenaires. Toute reproduction, représentation ou adaptation, totale ou partielle,
          est interdite sans autorisation écrite préalable.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Contact</h2>
        <p className="mt-2 text-stone-600">
          Pour toute question relative aux mentions légales, vous pouvez nous contacter à
          l&apos;adresse suivante :{" "}
          <a href="mailto:contact@mathis-lamotte.fr" className="link">
            contact@mathis-lamotte.fr
          </a>
          .
        </p>
      </section>
    </>
  );
}
