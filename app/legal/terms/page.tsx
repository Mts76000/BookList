import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";
import {
  FREE_BOOK_LIMIT,
  FREE_QUOTE_LIMIT,
  PREMIUM_FEATURES,
  PREMIUM_PRICES,
  TRIAL_DAYS,
} from "@/lib/plans";

export const metadata: Metadata = {
  title: "Conditions générales",
  description: "Conditions générales d'utilisation et de vente du service BookList.",
  alternates: { canonical: canonicalUrl("/legal/terms") },
};

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl text-stone-900 sm:text-4xl">
        Conditions générales d&apos;utilisation et de vente
      </h1>

      <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : 31 octobre 2026</p>
      <p className="mt-4 text-stone-600">
        Le service est édité par Mathis Lamotte (voir les{" "}
        <Link href="/legal/notice" className="link">
          mentions légales
        </Link>
        ). En créant un compte et en utilisant BookList, vous acceptez les conditions suivantes.
      </p>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Objet du service</h2>
        <p className="mt-2 text-stone-600">
          BookList est un outil en ligne permettant de suivre ses lectures, de conserver des notes,
          des statistiques et de gérer une bibliothèque personnelle. Il est proposé en deux formules
          : un compte gratuit et un abonnement payant, Premium.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Compte gratuit</h2>
        <p className="mt-2 text-stone-600">
          Le compte gratuit permet d&apos;ajouter jusqu&apos;à {FREE_BOOK_LIMIT} livres un par un et
          d&apos;enregistrer jusqu&apos;à {FREE_QUOTE_LIMIT} citations ; l&apos;import d&apos;une
          bibliothèque existante n&apos;est pas limité. Une fois une limite atteinte, ce qui est
          déjà enregistré reste consultable, modifiable et exportable ; seul l&apos;ajout est
          réservé à Premium.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Abonnement Premium</h2>
        <p className="mt-2 text-stone-600">
          Premium ajoute notamment : {PREMIUM_FEATURES.map((f) => f.title.toLowerCase()).join(", ")}
          . Il est proposé au prix de {PREMIUM_PRICES.monthly.amount} par mois ou{" "}
          {PREMIUM_PRICES.yearly.amount} par an, prix toutes taxes comprises, payables
          d&apos;avance.
        </p>
        <p className="mt-2 text-stone-600">
          Le paiement est traité par Stripe. L&apos;abonnement est renouvelé automatiquement à la
          fin de chaque période, au tarif en vigueur, jusqu&apos;à sa résiliation. Toute
          modification de tarif est annoncée au moins 30 jours avant de s&apos;appliquer.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Essai gratuit</h2>
        <p className="mt-2 text-stone-600">
          Une première souscription à Premium peut commencer par un essai gratuit de {TRIAL_DAYS}{" "}
          jours, une seule fois par compte. Le moyen de paiement est enregistré à la souscription
          mais rien n&apos;est prélevé pendant l&apos;essai. Sans résiliation avant son terme,
          l&apos;abonnement choisi démarre automatiquement et le premier paiement est prélevé le
          jour de la fin de l&apos;essai.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Résiliation</h2>
        <p className="mt-2 text-stone-600">
          Vous pouvez résilier à tout moment, sans frais ni justification, depuis la page{" "}
          <Link href="/account/premium" className="link">
            Premium
          </Link>{" "}
          de votre compte (bouton « Gérer mon abonnement »). La résiliation prend effet à la fin de
          la période en cours : Premium reste actif jusque-là, et aucun nouveau prélèvement n&apos;a
          lieu. Votre bibliothèque est conservée et repasse aux conditions du compte gratuit.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Droit de rétractation</h2>
        <p className="mt-2 text-stone-600">
          Premium est accessible dès le paiement. En le souscrivant, vous demandez son exécution
          immédiate et reconnaissez perdre votre droit de rétractation de 14 jours, conformément à
          l&apos;article L221-28 du Code de la consommation. À titre commercial, un remboursement
          intégral reste accordé sur simple demande à l&apos;adresse de contact dans les 14 jours
          suivant votre premier paiement.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Création de compte</h2>
        <p className="mt-2 text-stone-600">
          Vous devez fournir une adresse e-mail valide et un mot de passe sécurisé, ou utiliser la
          connexion Google. Vous êtes responsable de la confidentialité de vos identifiants.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Données et contenu</h2>
        <p className="mt-2 text-stone-600">
          Les livres, notes et commentaires que vous saisissez vous appartiennent. Vous ne devez pas
          publier de contenu illégal, injurieux, discriminatoire ou portant atteinte aux droits de
          tiers.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Suppression de compte</h2>
        <p className="mt-2 text-stone-600">
          Vous pouvez supprimer votre compte à tout moment depuis la page{" "}
          <Link href="/account/donnees" className="link">
            Données et suppression
          </Link>
          . Cette action supprime vos contenus personnels et anonymise votre compte, conformément au
          RGPD.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Responsabilités</h2>
        <p className="mt-2 text-stone-600">
          L&apos;éditeur met tout en œuvre pour assurer la disponibilité du service et la sauvegarde
          de vos données, sans pouvoir garantir une disponibilité continue. Il ne saurait être tenu
          responsable des interruptions dues à la maintenance, à un cas de force majeure ou à une
          utilisation non conforme du service. Ces stipulations ne limitent pas les droits que vous
          tenez du Code de la consommation, notamment la garantie légale de conformité des contenus
          et services numériques.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Modification des conditions</h2>
        <p className="mt-2 text-stone-600">
          Les conditions peuvent évoluer. Toute modification importante est annoncée par e-mail au
          moins 30 jours avant de s&apos;appliquer ; un abonné qui la refuse peut résilier avant
          cette date, sans frais.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Réclamations et médiation</h2>
        <p className="mt-2 text-stone-600">
          Pour toute réclamation, écrivez à{" "}
          <a href="mailto:contact@mathis-lamotte.fr" className="link">
            contact@mathis-lamotte.fr
          </a>
          . Si aucune solution n&apos;est trouvée, vous pouvez recourir gratuitement au médiateur de
          la consommation, ou à la plateforme européenne de règlement des litiges en ligne (
          <a href="https://ec.europa.eu/consumers/odr" className="link" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          ).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Droit applicable</h2>
        <p className="mt-2 text-stone-600">
          Les présentes conditions sont soumises au droit français. En cas de litige, et après une
          tentative de résolution amiable, les tribunaux français sont compétents ; un consommateur
          peut saisir la juridiction de son lieu de résidence.
        </p>
      </section>
    </>
  );
}
