import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et traitement des données personnelles de BookList.",
  alternates: {
    canonical: "/politique-confidentialite",
  },
}

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Politique de confidentialité</h1>

      <p className="mt-4 text-stone-600">
        BookList s&apos;engage à protéger la vie privée de ses utilisateurs. Cette politique décrit
        quelles données sont collectées, comment elles sont utilisées, conservées et vos droits.
      </p>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Responsable du traitement</h2>
        <p className="mt-2 text-stone-600">
          Le responsable du traitement est [Nom du responsable], joignable à{" "}
          <a href="mailto:contact@mathis-lamotte.fr" className="btn-text">contact@mathis-lamotte.fr</a>.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Données collectées</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-stone-600">
          <li>Adresse e-mail et mot de passe (haché) pour l&apos;authentification.</li>
          <li>Nom d&apos;affichage et paramètres de profil, si renseignés.</li>
          <li>Données de lecture : livres ajoutés, notes, commentaires, sessions et statistiques.</li>
          <li>Cookies essentiels au fonctionnement de l&apos;application et de l&apos;authentification.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Finalités du traitement</h2>
        <p className="mt-2 text-stone-600">
          Les données sont utilisées uniquement pour permettre le fonctionnement du service
          (authentification, sauvegarde de votre bibliothèque, statistiques). Aucune donnée n&apos;est
          revendue ni utilisée à des fins publicitaires.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Base légale</h2>
        <p className="mt-2 text-stone-600">
          Le traitement repose sur l&apos;exécution du contrat d&apos;utilisation (CGU) et, pour certaines
          fonctionnalités, sur votre consentement.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Conservation</h2>
        <p className="mt-2 text-stone-600">
          Les comptes actifs sont conservés tant que vous les utilisez. En cas de suppression de
          compte, vos données personnelles sont anonymisées ou effacées conformément au RGPD,
          sous réserve des obligations légales de conservation.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Vos droits</h2>
        <p className="mt-2 text-stone-600">
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
          de limitation, d&apos;opposition et de portabilité. Vous pouvez exercer ces droits depuis la
          page profil ou par email.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Sécurité</h2>
        <p className="mt-2 text-stone-600">
          Les mots de passe sont hachés avec bcrypt, les communications sont chiffrées en HTTPS et
          des headers de sécurité (CSP, HSTS, rate limiting) sont appliqués.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Cookies</h2>
        <p className="mt-2 text-stone-600">
          Seuls des cookies strictement nécessaires au fonctionnement de l&apos;authentification et de
          la PWA sont utilisés. Voir la <a href="/politique-cookies" className="btn-text">politique cookies</a>.
        </p>
      </section>

      <p className="mt-10 text-sm text-stone-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>
    </>
  )
}
