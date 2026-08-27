import { env } from "@/lib/env";

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Politique de confidentialité
      </h1>
      <p className="text-muted-foreground mt-2 text-xs">
        Contenu générique à adapter avec les informations réelles du projet — les valeurs entre
        crochets sont à compléter.
      </p>

      <div className="text-muted-foreground mt-8 flex flex-col gap-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            1. Responsable du traitement
          </h2>
          <p>
            Le responsable du traitement des données collectées sur {env.NEXT_PUBLIC_APP_NAME} est
            [Nom / raison sociale de l&apos;éditeur] (voir les{" "}
            <a href="/legal/notice" className="text-primary font-medium hover:underline">
              mentions légales
            </a>
            ), joignable à <span className="text-foreground">{env.CONTACT_EMAIL}</span>.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">2. Données collectées</h2>
          <p>Dans le cadre de son fonctionnement, le service collecte :</p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <strong className="text-foreground">Données de compte</strong> : nom, adresse email,
              mot de passe (stocké sous forme hachée, jamais en clair) ;
            </li>
            <li>
              <strong className="text-foreground">Données de connexion</strong> : adresse IP, type
              d&apos;appareil et de navigateur, horodatage, dans le cadre de la gestion des sessions
              et de la sécurité (limitation du taux de requêtes, détection d&apos;abus) ;
            </li>
            <li>
              <strong className="text-foreground">Données d&apos;usage</strong> : statistiques de
              navigation anonymisées via Umami (voir ci-dessous), sans identifiant publicitaire ni
              cookie.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            3. Finalités et bases légales
          </h2>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <strong className="text-foreground">Fourniture du service</strong> (création et
              gestion du compte, authentification) — exécution du contrat (CGU acceptées à
              l&apos;inscription) ;
            </li>
            <li>
              <strong className="text-foreground">Sécurité</strong> (rate limiting, anti-bot,
              journal d&apos;audit des actions sensibles) — intérêt légitime ;
            </li>
            <li>
              <strong className="text-foreground">Communications transactionnelles</strong>{" "}
              (vérification d&apos;email, réinitialisation de mot de passe) — exécution du contrat ;
            </li>
            <li>
              <strong className="text-foreground">Mesure d&apos;audience</strong> (Umami, en
              production uniquement) — intérêt légitime, sans donnée personnelle identifiable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">4. Durée de conservation</h2>
          <p>
            Les données de compte sont conservées tant que le compte est actif. En cas de
            suppression de compte, les données sont effacées conformément au mécanisme décrit à la
            section 8. Les journaux techniques et de sécurité sont conservés [durée à préciser, ex.
            12 mois].
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            5. Destinataires des données
          </h2>
          <p>
            Vos données ne sont ni vendues ni louées. Elles peuvent être transmises aux
            sous-traitants suivants, dans la stricte mesure nécessaire au fonctionnement du service
            :
          </p>
          <ul className="mt-2 list-disc pl-5">
            <li>
              <strong className="text-foreground">[Nom de l&apos;hébergeur]</strong> : hébergement
              de l&apos;application et de la base de données ;
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> : envoi des emails transactionnels
              (vérification de compte, réinitialisation de mot de passe, notifications) ;
            </li>
            <li>
              <strong className="text-foreground">Cloudflare (Turnstile)</strong> : protection
              anti-bot du formulaire d&apos;inscription et de connexion ;
            </li>
            <li>
              <strong className="text-foreground">Google</strong> : uniquement si vous choisissez de
              vous connecter via Google (authentification OAuth) ;
            </li>
            <li>
              <strong className="text-foreground">Umami</strong> : mesure d&apos;audience
              respectueuse de la vie privée, sans cookie ni donnée personnelle identifiable, active
              uniquement en production.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">
            6. Transferts hors Union européenne
          </h2>
          <p>
            Certains sous-traitants (par exemple Resend, Cloudflare, Google) peuvent traiter des
            données en dehors de l&apos;Union européenne. Ces transferts sont, le cas échéant,
            encadrés par des clauses contractuelles types approuvées par la Commission européenne ou
            un mécanisme équivalent.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">7. Cookies</h2>
          <p>
            Le service utilise uniquement un cookie de session strictement nécessaire à
            l&apos;authentification (better-auth), pour lequel aucun consentement n&apos;est requis.
            Umami ne dépose aucun cookie.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">8. Vos droits</h2>
          <p>
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation, de portabilité et d&apos;opposition sur vos données.
            Vous pouvez exporter ou supprimer vos données à tout moment, sans avoir à nous
            contacter, depuis la page{" "}
            <a href="/account" className="text-primary font-medium hover:underline">
              Mon compte
            </a>
            . Pour toute autre demande, écrivez à{" "}
            <span className="text-foreground">{env.CONTACT_EMAIL}</span>. Vous disposez également du
            droit d&apos;introduire une réclamation auprès de la CNIL (
            <span className="text-foreground">www.cnil.fr</span>).
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">9. Sécurité</h2>
          <p>
            Les mots de passe sont hachés, les échanges chiffrés (HTTPS), et l&apos;accès aux
            fonctionnalités sensibles est protégé par une authentification et une limitation du taux
            de requêtes. Les actions sensibles (changement de mot de passe, suppression de compte)
            sont tracées dans un journal d&apos;audit.
          </p>
        </section>

        <section>
          <h2 className="text-foreground mb-2 text-base font-semibold">10. Contact</h2>
          <p>
            Pour toute question relative à cette politique de confidentialité ou à vos données
            personnelles, écrivez à <span className="text-foreground">{env.CONTACT_EMAIL}</span>.
          </p>
        </section>
      </div>
    </>
  );
}
