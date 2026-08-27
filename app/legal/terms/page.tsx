import { env } from "@/lib/env";

export default function TermsPage() {
  return (
    <>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Conditions générales d&apos;utilisation
      </h1>
      <p className="text-muted-foreground mt-2 text-xs">
        Contenu générique à adapter avec les caractéristiques réelles du projet — les valeurs entre
        crochets sont à compléter.
      </p>

      <div className="text-muted-foreground mt-8 flex flex-col gap-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">1. Objet</h2>
          <p>
            Les présentes conditions générales d&apos;utilisation (« CGU ») régissent l&apos;accès
            et l&apos;utilisation du service {env.NEXT_PUBLIC_APP_NAME} ({env.NEXT_PUBLIC_APP_URL}),
            édité par [Nom / raison sociale de l&apos;éditeur] (voir les{" "}
            <a href="/legal/notice" className="text-primary font-medium hover:underline">
              mentions légales
            </a>
            ).
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">2. Acceptation des CGU</h2>
          <p>
            La création d&apos;un compte sur {env.NEXT_PUBLIC_APP_NAME} implique l&apos;acceptation
            pleine et entière des présentes CGU. Si vous n&apos;acceptez pas ces conditions, vous ne
            devez pas utiliser le service.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            3. Accès au service et compte utilisateur
          </h2>
          <p>
            L&apos;accès à certaines fonctionnalités nécessite la création d&apos;un compte, associé
            à une adresse email vérifiée. Vous êtes responsable de la confidentialité de vos
            identifiants et de toute activité effectuée depuis votre compte. Vous pouvez consulter
            vos sessions actives et supprimer votre compte à tout moment depuis la page{" "}
            <a href="/account" className="text-primary font-medium hover:underline">
              Mon compte
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            4. Obligations de l&apos;utilisateur
          </h2>
          <p>Vous vous engagez à :</p>
          <ul className="mt-2 list-disc pl-5">
            <li>fournir des informations exactes lors de votre inscription ;</li>
            <li>ne pas usurper l&apos;identité d&apos;un tiers ;</li>
            <li>
              ne pas utiliser le service à des fins illégales, frauduleuses ou portant atteinte aux
              droits d&apos;autrui ;
            </li>
            <li>
              ne pas tenter de contourner les mesures de sécurité du service (rate limiting,
              anti-bot, authentification).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            5. Propriété intellectuelle
          </h2>
          <p>
            Le service, sa structure, son code et ses contenus restent la propriété exclusive de
            [Nom / raison sociale de l&apos;éditeur]. Aucune disposition des présentes CGU ne
            saurait être interprétée comme une cession de droits de propriété intellectuelle.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            6. Disponibilité et responsabilité
          </h2>
          <p>
            Le service est fourni « en l&apos;état ». L&apos;éditeur met en œuvre les moyens
            raisonnables pour assurer la disponibilité et la sécurité du service, sans garantie
            d&apos;absence d&apos;interruption ou d&apos;erreur. L&apos;éditeur ne saurait être tenu
            responsable des dommages indirects résultant de l&apos;utilisation du service.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">7. Résiliation</h2>
          <p>
            Vous pouvez supprimer votre compte à tout moment depuis la page{" "}
            <a href="/account" className="text-primary font-medium hover:underline">
              Mon compte
            </a>
            . L&apos;éditeur se réserve le droit de suspendre ou supprimer un compte en cas de
            manquement grave aux présentes CGU.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">8. Modification des CGU</h2>
          <p>
            Les présentes CGU peuvent être modifiées à tout moment. Les utilisateurs seront informés
            de toute modification substantielle. La poursuite de l&apos;utilisation du service après
            modification vaut acceptation des nouvelles CGU.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            9. Droit applicable et litiges
          </h2>
          <p>
            Les présentes CGU sont soumises au droit [pays, ex. français]. En cas de litige, une
            solution amiable sera recherchée avant toute action judiciaire, portée devant les
            tribunaux compétents de [ville / juridiction].
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">10. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU, écrivez à{" "}
            <span className="text-foreground">{env.CONTACT_EMAIL}</span>.
          </p>
        </section>
      </div>
    </>
  );
}
