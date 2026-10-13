// Données structurées pour Google. Le « < » est échappé : un texte venant de la configuration ne peut pas fermer la balise.
export default function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
