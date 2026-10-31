import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Données collectées par BookList, finalités, conservation et vos droits.",
  alternates: { canonical: canonicalUrl("/legal/privacy") },
};

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl text-stone-900 sm:text-4xl">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-stone-500">Dernière mise à jour : 31 octobre 2026</p>

      <p className="mt-4 text-stone-600">
        BookList s&apos;engage à protéger la vie privée de ses utilisateurs. Cette politique décrit
        quelles données sont collectées, comment elles sont utilisées, conservées et vos droits.
      </p>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Responsable du traitement</h2>
        <p className="mt-2 text-stone-600">
          Le responsable du traitement est Mathis Lamotte, joignable à{" "}
          <a href="mailto:contact@mathis-lamotte.fr" className="link">
            contact@mathis-lamotte.fr
          </a>
          .
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Données collectées</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600">
          <li>Adresse e-mail et mot de passe (haché) pour l&apos;authentification.</li>
          <li>
            Si vous vous connectez avec Google, les informations de profil transmises par Google :
            nom, adresse e-mail et photo de profil.
          </li>
          <li>Nom d&apos;affichage et paramètres de profil, si renseignés.</li>
          <li>
            Données de lecture : livres ajoutés, notes, commentaires et statistiques de lecture.
          </li>
          <li>
            Journal des actions sensibles (changement de mot de passe, suppression de compte) avec
            adresse IP et navigateur, à des fins de sécurité.
          </li>
          <li>
            Si vous activez les rappels de lecture : l&apos;adresse d&apos;abonnement aux
            notifications fournie par votre navigateur, supprimée dès que vous les désactivez.
          </li>
          <li>
            Si vous souscrivez à Premium : l&apos;état de votre abonnement (formule, date de
            renouvellement). Le paiement est traité par Stripe, qui reçoit votre e-mail et vos
            informations de paiement ; BookList ne voit ni ne stocke jamais votre numéro de carte.
          </li>
          <li>
            Cookies essentiels au fonctionnement de l&apos;application et de
            l&apos;authentification.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Finalités du traitement</h2>
        <p className="mt-2 text-stone-600">
          Les données sont utilisées uniquement pour permettre le fonctionnement du service
          (authentification, sauvegarde de votre bibliothèque, statistiques, gestion de
          l&apos;abonnement Premium). Aucune donnée n&apos;est revendue ni utilisée à des fins
          publicitaires.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Prestataires</h2>
        <p className="mt-2 text-stone-600">
          Les données ne sont transmises qu&apos;aux prestataires nécessaires au service, chacun
          pour sa seule mission :
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600">
          <li>Hostinger : hébergement du site et de la base de données.</li>
          <li>Resend : envoi des e-mails transactionnels (vérification, mot de passe).</li>
          <li>Stripe : paiement et gestion de l&apos;abonnement Premium.</li>
          <li>Google : connexion avec un compte Google, si vous la choisissez.</li>
          <li>Cloudflare Turnstile : protection anti-robots à l&apos;inscription.</li>
          <li>
            Le service de notifications de votre navigateur (Google, Apple ou Mozilla), si vous
            activez les rappels.
          </li>
        </ul>
        <p className="mt-2 text-stone-600">
          Certains de ces prestataires peuvent traiter des données hors de l&apos;Union européenne,
          notamment aux États-Unis ; ces transferts sont encadrés par le cadre de protection des
          données UE–États-Unis ou par les clauses contractuelles types de la Commission européenne.
          La recherche de livres interroge des catalogues publics (Google Books, Open Library, BnF)
          avec le seul texte ou ISBN recherché, sans donnée vous concernant.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Base légale</h2>
        <p className="mt-2 text-stone-600">
          Le traitement repose sur l&apos;exécution du contrat d&apos;utilisation (CGU) et, pour
          certaines fonctionnalités, sur votre consentement.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Conservation</h2>
        <p className="mt-2 text-stone-600">
          Les comptes actifs sont conservés tant que vous les utilisez. À la suppression de votre
          compte, vos livres, notes et activités de lecture sont effacés, et votre compte est
          anonymisé : votre adresse e-mail et votre nom sont remplacés, et aucun moyen de connexion
          n&apos;est conservé. Un abonnement Premium en cours est résilié au même moment. Les
          factures restent conservées par Stripe pendant la durée légale de conservation des pièces
          comptables.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Vos droits</h2>
        <p className="mt-2 text-stone-600">
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Vous pouvez
          exporter vos données et supprimer votre compte depuis la page{" "}
          <Link href="/account/donnees" className="link">
            Données et suppression
          </Link>
          , ou nous écrire par email. Si vous estimez que vos droits ne sont pas respectés, vous
          pouvez adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr" className="link" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Sécurité</h2>
        <p className="mt-2 text-stone-600">
          Les mots de passe sont hachés avec scrypt (les comptes créés avant la refonte utilisent
          bcrypt et sont convertis à leur prochaine connexion). Les communications sont chiffrées en
          HTTPS, et des en-têtes de sécurité (CSP, HSTS) ainsi qu&apos;une limitation du nombre de
          requêtes sont appliqués.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Cookies</h2>
        <p className="mt-2 text-stone-600">
          BookList n&apos;utilise ni cookie publicitaire ni traceur tiers : seulement des cookies
          nécessaires (connexion, préférences) et une mesure d&apos;audience auto-hébergée sans
          cookie. Voir la{" "}
          <Link href="/legal/cookies" className="link">
            politique cookies
          </Link>
          .
        </p>
      </section>
    </>
  );
}
