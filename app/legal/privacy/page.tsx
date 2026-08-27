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
            Cookies essentiels au fonctionnement de l&apos;application et de
            l&apos;authentification.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Finalités du traitement</h2>
        <p className="mt-2 text-stone-600">
          Les données sont utilisées uniquement pour permettre le fonctionnement du service
          (authentification, sauvegarde de votre bibliothèque, statistiques). Aucune donnée
          n&apos;est revendue ni utilisée à des fins publicitaires.
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
          n&apos;est conservé.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl text-stone-900">Vos droits</h2>
        <p className="mt-2 text-stone-600">
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Vous pouvez
          exporter vos données et supprimer votre compte depuis la page{" "}
          <Link href="/account" className="link">
            Compte
          </Link>
          , ou nous écrire par email.
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
          Seuls des cookies strictement nécessaires au fonctionnement de l&apos;authentification et
          de la PWA sont utilisés. Voir la{" "}
          <Link href="/legal/cookies" className="link">
            politique cookies
          </Link>
          .
        </p>
      </section>
    </>
  );
}
