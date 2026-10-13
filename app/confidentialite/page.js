import site from "@/site.config";
import PageLegale, { Bloc, Info } from "@/components/PageLegale";

export const metadata = {
  title: `Confidentialité · ${site.nom}`,
  description: `Comment ${site.nom} utilise et protège vos données personnelles.`,
  alternates: { canonical: "/confidentialite" },
};

export default function Confidentialite() {
  const l = site.legal;
  return (
    <PageLegale titre="Politique de confidentialité" misAJour="octobre 2026">
      <p>
        Cette page explique, simplement, quelles informations vous nous donnez quand vous réservez une course, pourquoi, et ce que vous pouvez en faire.
      </p>

      <Bloc titre="Qui est responsable de vos données ?">
        <p>
          <Info valeur={l.raisonSociale} indication="nom de l'entreprise à compléter" />, {" "}
          <Info valeur={l.adresse} indication="adresse à compléter" />. Contact : <Info valeur={l.email} indication="e-mail à compléter" /> ou {site.telephone.affiche}.
        </p>
      </Bloc>

      <Bloc titre="Quelles données, et pourquoi ?">
        <p>Quand vous envoyez une demande de réservation, nous recevons :</p>
        <ul>
          <li>votre <b>nom</b> et votre <b>numéro de téléphone</b> (obligatoires), votre <b>e-mail</b> (facultatif) ;</li>
          <li>l&apos;<b>adresse de départ</b>, l&apos;éventuel arrêt et l&apos;<b>adresse d&apos;arrivée</b> ;</li>
          <li>la <b>date et l&apos;heure</b>, le nombre de passagers, la présence de bagages, un numéro de vol ou de train (facultatif) ;</li>
          <li>la case « transport conventionné » : elle indique seulement qu&apos;une prescription existe. <b>Nous ne demandons aucune donnée de santé</b>, aucun motif médical, aucun document.</li>
        </ul>
        <p>
          Ces informations servent à <b>traiter votre demande</b>, à vous <b>rappeler pour confirmer</b>, à organiser le planning des chauffeurs et à tenir la comptabilité de l&apos;entreprise.
          Nous ne les utilisons ni pour de la publicité, ni pour du suivi de votre navigation, et nous ne les vendons pas.
        </p>
      </Bloc>

      <Bloc titre="Qui reçoit ces données ?">
        <p>Les chauffeurs de l&apos;entreprise, et les prestataires techniques qui font fonctionner le site :</p>
        <ul>
          <li><b>Supabase</b> : base de données où sont enregistrées les demandes (hébergement en Europe, <span className="tbd">à confirmer</span>).</li>
          <li><b>Netlify</b> : hébergement du site (États-Unis).</li>
          <li><b>Telegram</b> et <b>Resend</b> : alerte envoyée aux chauffeurs et e-mails (nom, téléphone et trajet de la demande).</li>
          <li><b>Cloudflare Turnstile</b> : protection contre les robots lors de l&apos;envoi du formulaire.</li>
          <li><b>IGN</b> (recherche d&apos;adresses, texte que vous tapez) et <b>OpenRouteService</b> (calcul de la distance, à partir des positions des adresses).</li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de l&apos;Union européenne. Les transferts sont encadrés par les garanties prévues par le RGPD
          (clauses contractuelles types ou cadre de protection des données UE–États-Unis) : <span className="tbd">à vérifier avant la mise en ligne</span>.
        </p>
      </Bloc>

      <Bloc titre="Combien de temps ?">
        <p>
          Vos demandes sont conservées <b><Info valeur={l.conservationAns ? `${l.conservationAns} ans` : ""} indication="durée à confirmer" /></b> après la course,
          puis supprimées. Les justificatifs comptables sont conservés pendant la durée légale.
        </p>
      </Bloc>

      <Bloc titre="Vos droits">
        <p>
          Vous pouvez demander à <b>voir</b>, <b>corriger</b> ou <b>supprimer</b> vos données, vous <b>opposer</b> à leur utilisation ou en demander la <b>limitation</b>,
          et récupérer vos données. Écrivez à <Info valeur={l.email} indication="e-mail à compléter" /> ou appelez le {site.telephone.affiche} : nous répondons dans un délai d&apos;un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>.
        </p>
      </Bloc>

      <Bloc titre="Cookies">
        <p>
          Ce site <b>n&apos;utilise aucun cookie de suivi ni de publicité</b>. Seuls des mécanismes techniques indispensables au fonctionnement
          (par exemple la protection contre les robots, ou la connexion des chauffeurs) peuvent enregistrer une information sur votre appareil.
          C&apos;est pourquoi aucune bannière de consentement n&apos;est affichée. <span className="tbd">À revérifier si des outils de mesure d&apos;audience sont ajoutés.</span>
        </p>
      </Bloc>

      <Bloc titre="Sécurité">
        <p>
          Les demandes ne sont consultables que par les personnes autorisées de l&apos;entreprise, après connexion. Les échanges avec le site sont chiffrés.
        </p>
      </Bloc>
    </PageLegale>
  );
}
