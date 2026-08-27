import { env } from "@/lib/env";

export default function LegalNoticePage() {
  return (
    <>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Mentions légales</h1>
      <p className="text-muted-foreground mt-2 text-xs">
        Contenu générique à adapter avec les informations réelles du projet — les valeurs entre
        crochets sont à compléter.
      </p>

      <div className="text-muted-foreground mt-8 flex flex-col gap-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">Éditeur du site</h2>
          <p>
            Le site {env.NEXT_PUBLIC_APP_NAME} ({env.NEXT_PUBLIC_APP_URL}) est édité par :
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            <li>[Nom / raison sociale de l&apos;éditeur]</li>
            <li>[Forme juridique — ex. entreprise individuelle, SASU, SARL]</li>
            <li>[Adresse du siège social]</li>
            <li>[Numéro SIRET / RCS, si applicable]</li>
            <li>
              Contact : <span className="text-foreground">{env.CONTACT_EMAIL}</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            Directeur de la publication
          </h2>
          <p>[Nom du directeur de la publication — généralement l&apos;éditeur lui-même].</p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <ul className="mt-2 flex flex-col gap-1">
            <li>[Nom de l&apos;hébergeur]</li>
            <li>[Adresse de l&apos;hébergeur]</li>
            <li>[Site web / contact de l&apos;hébergeur]</li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus présents sur {env.NEXT_PUBLIC_APP_NAME} (textes, images,
            logos, structure, code) est protégé par le droit de la propriété intellectuelle. Toute
            reproduction ou représentation, totale ou partielle, sans autorisation préalable, est
            interdite.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">Contact</h2>
          <p>
            Pour toute question relative à ces mentions légales, écrivez à{" "}
            <span className="text-foreground">{env.CONTACT_EMAIL}</span>.
          </p>
        </section>
      </div>
    </>
  );
}
