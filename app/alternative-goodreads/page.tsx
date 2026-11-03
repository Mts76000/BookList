import type { Metadata } from "next";
import Link from "next/link";
import { Check, CheckCircle, X } from "@phosphor-icons/react/ssr";
import { canonicalUrl, faqJsonLd, jsonLdScript } from "@/lib/seo";
import { buttonClasses } from "@/components/ui/button";
import { PublicHeader } from "@/components/public-header";
import { Footer } from "@/components/footer";
import { FREE_BOOK_LIMIT, PREMIUM_PRICES, TRIAL_DAYS } from "@/lib/plans";

const description =
  "Quittez Goodreads sans rien perdre : importez livres, notes et dates en une minute. Application de lecture en français, sans pub, gratuite.";

export const metadata: Metadata = {
  // Complété en « … | BookList » par le modèle de titre de app/layout.tsx.
  title: "Alternative à Goodreads en français et gratuite",
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
  "Le texte de vos avis, et vos notes privées Goodreads, en notes du livre",
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

const COMPETITORS = ["Goodreads", "StoryGraph", "Babelio"] as const;

/**
 * Comparatif : seuls les critères où BookList se distingue, plus le scan pour montrer qu'on
 * ne perd rien en changeant. Publicité comparative : chaque case des autres applications doit
 * rester exacte et vérifiable (fiches App Store, pages d'aide et feuilles de route publiques,
 * vérifiées à la date de COMPARISON_CHECKED, à revoir quand elle vieillit).
 */
const COMPARISON_CHECKED = "novembre 2026";

/** `true` : oui ; `false` : non ; une chaîne : oui, avec cette précision. */
type Available = boolean | string;

const COMPARISON: {
  label: string;
  booklist: Available;
  others: Record<(typeof COMPETITORS)[number], Available>;
}[] = [
  {
    label: "Interface en français",
    booklist: true,
    others: { Goodreads: false, StoryGraph: false, Babelio: true },
  },
  {
    // Goodreads affiche de la publicité ; Babelio vend des espaces aux éditeurs.
    label: "Sans publicité",
    booklist: true,
    others: { Goodreads: false, StoryGraph: true, Babelio: false },
  },
  {
    // Babelio prévient des nouvelles sorties, mais ne cherche pas les tomes déjà parus que
    // vous n'avez pas ; StoryGraph n'a pas de suivi de séries (demande ouverte sur sa feuille
    // de route publique).
    label: "Tomes manquants de vos sagas trouvés et ajoutés en un clic",
    booklist: "Avec Premium",
    others: { Goodreads: false, StoryGraph: false, Babelio: false },
  },
  {
    label: "Scan du code-barres",
    booklist: true,
    others: { Goodreads: true, StoryGraph: true, Babelio: true },
  },
];

function Availability({ value, highlight = false }: { value: Available; highlight?: boolean }) {
  if (value === true)
    return (
      <Check
        className={`mx-auto h-5 w-5 ${highlight ? "text-accent-600" : "text-moss-500"}`}
        weight="bold"
        aria-label="Oui"
      />
    );
  if (value === false)
    return <X className="mx-auto h-4 w-4 text-stone-300" weight="bold" aria-label="Non" />;
  return <span className="text-xs font-medium text-stone-900 sm:text-sm">{value}</span>;
}

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
  {
    question: "Goodreads existe-t-il en français ?",
    answer:
      "Non, l'interface de Goodreads n'existe qu'en anglais. BookList est en français de bout en bout, et reprend en une minute toute votre bibliothèque Goodreads : livres, notes, avis, dates et étagères.",
  },
  {
    question: "Mes avis Goodreads sont-ils importés ?",
    answer:
      "Oui. Le texte de chaque avis et vos notes privées deviennent des notes du livre dans BookList, avec votre note en étoiles, le statut, la date de fin de lecture et vos étagères.",
  },
];

function Steps({ title, steps }: { title?: string; steps: string[] }) {
  return (
    <div className="card p-5 sm:p-6">
      {title && <h3 className="mb-4 font-serif text-xl text-stone-900">{title}</h3>}
      <ol className="space-y-3">
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
          <div className="mt-6">
            <Steps title="Depuis Goodreads" steps={GOODREADS_STEPS} />
          </div>
          <h2 className="mt-12 font-serif text-3xl text-stone-900">Vous venez de StoryGraph ?</h2>
          <div className="mt-6">
            <Steps steps={STORYGRAPH_STEPS} />
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

        <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
          <h2 className="font-serif text-3xl text-balance text-stone-900">
            La seule en français et sans publicité
          </h2>
          <p className="mt-3 max-w-2xl text-stone-500">
            Face à Goodreads, StoryGraph et Babelio, BookList est la seule application qui coche
            toutes les cases.
          </p>
          {/* Le tableau défile seul sur petit écran : la page, elle, ne défile jamais en largeur. */}
          <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Comparatif de BookList, Goodreads, StoryGraph et Babelio
              </caption>
              <thead>
                <tr className="border-b border-stone-200 text-xs font-medium tracking-wide text-stone-500 uppercase">
                  <th scope="col" className="w-[36%] py-3 pr-3 font-medium">
                    <span className="sr-only">Critère</span>
                  </th>
                  <th
                    scope="col"
                    className="text-accent-700 bg-accent-50/40 px-3 py-3 text-center font-medium"
                  >
                    BookList
                  </th>
                  {COMPETITORS.map((name) => (
                    <th key={name} scope="col" className="px-3 py-3 text-center font-medium">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-stone-100">
                    <th scope="row" className="py-3 pr-3 font-normal text-stone-600">
                      {row.label}
                    </th>
                    <td className="bg-accent-50/40 px-3 py-3 text-center">
                      <Availability value={row.booklist} highlight />
                    </td>
                    {COMPETITORS.map((name) => (
                      <td key={name} className="px-3 py-3 text-center">
                        <Availability value={row.others[name]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            D&apos;après les fiches App Store, les pages d&apos;aide et les feuilles de route
            publiques de chaque application, vérifiées en {COMPARISON_CHECKED}.
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
          <h2 className="font-serif text-3xl text-stone-900">Combien coûte BookList ?</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card p-5 sm:p-6">
              <h3 className="font-medium text-stone-900">Gratuit</h3>
              <p className="mt-2 font-serif text-4xl text-stone-900 tabular-nums">0 €</p>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                Jusqu&apos;à {FREE_BOOK_LIMIT} livres ajoutés un par un. L&apos;import de votre
                bibliothèque Goodreads ou StoryGraph est complet, même au-delà de {FREE_BOOK_LIMIT}{" "}
                livres.
              </p>
            </div>
            <div className="card p-5 sm:p-6">
              <h3 className="text-accent-700 font-medium">Premium</h3>
              <p className="mt-2 flex items-baseline gap-2 text-stone-900">
                <span className="font-serif text-4xl tabular-nums">
                  {PREMIUM_PRICES.yearly.perMonth}
                </span>
                <span className="text-sm text-stone-500">par mois</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-stone-500">
                Facturé {PREMIUM_PRICES.yearly.amount} par an, ou {PREMIUM_PRICES.monthly.amount} au
                mois sans engagement. {TRIAL_DAYS} jours d&apos;essai gratuit.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-stone-500">
            <Link href="/#tarifs" className="text-accent-700 font-medium hover:underline">
              Comparer les deux formules en détail
            </Link>
          </p>
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
