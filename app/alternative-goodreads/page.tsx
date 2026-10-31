import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { canonicalUrl, faqJsonLd, jsonLdScript } from "@/lib/seo";
import { buttonClasses } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { Footer } from "@/components/footer";
import { FREE_BOOK_LIMIT } from "@/lib/plans";

const description =
  "Quittez Goodreads sans rien perdre : importez votre bibliothèque Goodreads ou StoryGraph dans BookList, l'application de suivi de lecture en français.";

export const metadata: Metadata = {
  title: "Alternative à Goodreads en français : importez votre bibliothèque",
  description,
  alternates: { canonical: canonicalUrl("/alternative-goodreads") },
  openGraph: {
    title: "L'alternative française à Goodreads",
    description,
    url: canonicalUrl("/alternative-goodreads"),
  },
};

const GOODREADS_STEPS = [
  "Sur le site Goodreads, ouvrez « My Books », puis « Import and export » dans la colonne de gauche.",
  "Cliquez sur « Export Library » et téléchargez le fichier CSV une fois prêt.",
  "Dans BookList, ouvrez Ajouter, puis « Importer plusieurs livres (CSV) », et déposez le fichier tel quel.",
];

const STORYGRAPH_STEPS = [
  "Dans StoryGraph, ouvrez « Manage Account », puis « Export StoryGraph Library ».",
  "Téléchargez le fichier CSV généré.",
  "Déposez-le dans BookList, au même endroit : le format est reconnu tout seul.",
];

const IMPORTED = [
  "Le statut de chaque livre : lu, en cours, à lire, et abandonné depuis StoryGraph",
  "Vos notes et vos dates de lecture",
  "Vos étagères, et le format (papier, numérique, audio)",
  "Les sagas et numéros de tome indiqués dans les titres Goodreads",
  "L'ISBN, qui complète couverture et résumé quand le livre est connu",
];

const REASONS = [
  {
    title: "En français, de bout en bout",
    text: "Une application pensée pour les lecteurs francophones, avec les éditions françaises de vos livres.",
  },
  {
    title: "Scannez, c'est ajouté",
    text: "Le code-barres d'un livre suffit : l'appareil photo de votre téléphone le reconnaît.",
  },
  {
    title: "Vos sagas, tome par tome",
    text: "Le prochain tome à lire, toujours sous les yeux, et les tomes manquants proposés avec Premium.",
  },
  {
    title: "Objectifs, séries et bilan",
    text: "Un objectif annuel, une série de jours de lecture, et votre année résumée en une image à partager.",
  },
  {
    title: "Pas de publicité, pas de revente",
    text: "L'abonnement Premium est la seule source de revenus : vos données ne servent qu'à vous.",
  },
  {
    title: "Vos données vous appartiennent",
    text: "Exportez votre bibliothèque à tout moment, dans un fichier qui se réimporte tel quel.",
  },
];

const FAQ = [
  {
    question: "L'import est-il gratuit ?",
    answer: `Oui, et complet : toute votre bibliothèque est importée, même au-delà des ${FREE_BOOK_LIMIT} livres du compte gratuit.`,
  },
  {
    question: "Que se passe-t-il si j'importe deux fois le même fichier ?",
    answer:
      "Les livres déjà présents dans votre bibliothèque sont reconnus à leur ISBN et ne sont pas ajoutés en double.",
  },
  {
    question: "Dois-je supprimer mon compte Goodreads ?",
    answer:
      "Non. L'export ne modifie rien sur Goodreads : vous pouvez garder les deux le temps de vous faire à BookList.",
  },
  {
    question: "BookList fonctionne-t-il sur téléphone ?",
    answer:
      "Oui. BookList s'utilise dans le navigateur et s'installe sur l'écran d'accueil comme une application, sur iPhone comme sur Android.",
  },
];

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="card p-5 sm:p-6">
      <h3 className="font-serif text-xl text-stone-900">{title}</h3>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm text-stone-700">
            <span className="bg-accent-50 text-accent-700 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Guide pour les lecteurs qui quittent Goodreads ou StoryGraph : la recherche « alternative
 * à Goodreads » est l'une des principales portes d'entrée vers une application de suivi de
 * lecture. Tout ce qui y est décrit correspond à l'import réel (lib/import-formats.ts).
 */
export default function GoodreadsAlternativePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-stone-50">
      <PublicHeader />
      <main id="main-content">
        <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
          <p className="text-accent-700 text-sm font-medium">Goodreads, StoryGraph</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-balance text-stone-900 sm:text-5xl">
            L&apos;alternative française à Goodreads
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-500">
            Importez votre bibliothèque Goodreads ou StoryGraph dans BookList en une minute : vos
            livres, vos notes, vos dates de lecture et vos sagas vous suivent.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={buttonClasses("primary", "w-full sm:w-auto")}>
              Créer un compte gratuit
            </Link>
            <Link href="/#tarifs" className={buttonClasses("secondary", "w-full sm:w-auto")}>
              Voir les tarifs
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
          <h2 className="font-serif text-3xl text-stone-900">Importer en trois étapes</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Steps title="Depuis Goodreads" steps={GOODREADS_STEPS} />
            <Steps title="Depuis StoryGraph" steps={STORYGRAPH_STEPS} />
          </div>
          <div className="mt-6 rounded-[var(--radius-md)] border border-stone-200 bg-white p-5 sm:p-6">
            <h3 className="font-medium text-stone-900">Ce qui est repris</h3>
            <ul className="mt-3 space-y-2">
              {IMPORTED.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-stone-700">
                  <CheckCircle
                    className="text-moss-500 mt-0.5 h-4 w-4 shrink-0"
                    weight="fill"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-card border-y border-stone-200/70">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
            <h2 className="font-serif text-3xl text-stone-900">Pourquoi passer à BookList</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {REASONS.map((reason) => (
                <div key={reason.title}>
                  <h3 className="font-medium text-stone-900">{reason.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">{reason.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <h2 className="font-serif text-3xl text-stone-900">Questions fréquentes</h2>
          <div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900">
                  {item.question}
                  <span
                    className="text-xl leading-none text-stone-400 transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">{item.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/register" className={buttonClasses("primary")}>
              Importer ma bibliothèque
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqJsonLd(FAQ))} />
    </div>
  );
}
