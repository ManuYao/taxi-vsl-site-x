import site from "@/site.config";
import Link from "next/link";
import PageLegale, { Bloc, Info } from "@/components/PageLegale";

export const metadata = {
  title: `Mentions légales · ${site.nom}`,
  description: `Mentions légales du site de ${site.nom}.`,
  alternates: { canonical: "/mentions-legales" },
};

export default function MentionsLegales() {
  const l = site.legal;
  return (
    <PageLegale titre="Mentions légales" misAJour="octobre 2026">
      <Bloc titre="Éditeur du site">
        <ul>
          <li>Nom de l&apos;entreprise : <Info valeur={l.raisonSociale} /></li>
          <li>Forme juridique : <Info valeur={l.formeJuridique} /></li>
          <li>SIRET : <Info valeur={l.siret} /></li>
          <li>Adresse : <Info valeur={l.adresse} /></li>
          <li>Téléphone : <a href={`tel:${site.telephone.lien}`}>{site.telephone.affiche}</a></li>
          <li>E-mail : <Info valeur={l.email} /></li>
          <li>Responsable de la publication : <Info valeur={l.responsablePublication} /></li>
          <li>Licence de taxi / autorisation de stationnement ou agrément : <Info valeur={l.numeroLicence} /></li>
        </ul>
      </Bloc>

      <Bloc titre="Hébergement">
        <p>Ce site est hébergé par {l.hebergeur}.</p>
      </Bloc>

      {l.conceptionEmail && (
        <Bloc titre="Conception du site">
          <p>Contact pour tout problème technique sur le site : <a href={`mailto:${l.conceptionEmail}`}>{l.conceptionEmail}</a></p>
        </Bloc>
      )}

      <Bloc titre="Prix et réservations">
        <p>
          Les prix affichés sur le site sont des <b>estimations</b> calculées d&apos;après la distance et l&apos;heure de la course.
          Le prix final est celui du taximètre. Une demande de réservation en ligne n&apos;est confirmée que lorsque le chauffeur l&apos;accepte.
        </p>
      </Bloc>

      <Bloc titre="Transport conventionné">
        <p>
          La case « transport conventionné » indique seulement qu&apos;une prescription médicale existe. Aucune donnée de santé,
          aucun motif médical et aucune pièce jointe ne sont demandés ni conservés par ce site.
        </p>
      </Bloc>

      <Bloc titre="Médiation de la consommation">
        <p>
          En cas de litige, vous pouvez recourir gratuitement au médiateur de la consommation :{" "}
          <span className="tbd">nom et coordonnées du médiateur à compléter</span>.
        </p>
      </Bloc>

      <Bloc titre="Propriété intellectuelle">
        <p>
          Les textes, illustrations et le logo de ce site sont la propriété de l&apos;éditeur ou utilisés avec autorisation.
          Toute reproduction sans accord écrit est interdite.
        </p>
      </Bloc>

      <Bloc titre="Données et services tiers">
        <ul>
          <li>Recherche d&apos;adresses : Géoplateforme de l&apos;IGN (service public).</li>
          <li>Calcul d&apos;itinéraire : OpenRouteService, avec les données © contributeurs OpenStreetMap.</li>
          <li>Protection contre les robots : Cloudflare Turnstile.</li>
        </ul>
        <p>Pour la protection de vos données personnelles, consultez la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </Bloc>
    </PageLegale>
  );
}
