import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation du service BookList.",
  alternates: {
    canonical: "/conditions-utilisation",
  },
}

export default function ConditionsUtilisationPage() {
  return (
    <>
      <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Conditions d&apos;utilisation</h1>

      <p className="mt-4 text-stone-600">
        En créant un compte et en utilisant BookList, vous acceptez les conditions suivantes.
      </p>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Objet du service</h2>
        <p className="mt-2 text-stone-600">
          BookList est un outil en ligne gratuit permettant de suivre ses lectures, de conserver des
          notes, des statistiques et de gérer une bibliothèque personnelle.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Création de compte</h2>
        <p className="mt-2 text-stone-600">
          Vous devez fournir une adresse e-mail valide et un mot de passe sécurisé. Vous êtes
          responsable de la confidentialité de vos identifiants.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Données et contenu</h2>
        <p className="mt-2 text-stone-600">
          Les livres, notes et commentaires que vous saisissez vous appartiennent. Vous ne devez pas
          publier de contenu illégal, injurieux, discriminatoire ou portant atteinte aux droits de
          tiers.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Suppression de compte</h2>
        <p className="mt-2 text-stone-600">
          Vous pouvez supprimer votre compte à tout moment depuis la page Profil. Cette action
          anonymise votre compte et supprime vos contenus personnels conformément au RGPD.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Responsabilités</h2>
        <p className="mt-2 text-stone-600">
          BookList est fourni « en l&apos;état ». L&apos;éditeur ne saurait être tenu responsable de pertes de
          données, de dysfonctionnements indépendants de sa volonté ou d&apos;une utilisation non
          conforme du service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl text-stone-900">Modification des conditions</h2>
        <p className="mt-2 text-stone-600">
          Les conditions peuvent être modifiées à tout moment. L&apos;utilisation continue du service vaut
          acceptation des nouvelles conditions.
        </p>
      </section>

      <p className="mt-10 text-sm text-stone-400">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}</p>
    </>
  )
}
