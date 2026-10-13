// Tout ce qui est propre au client vit ici. Ne jamais l'écrire en dur dans les composants.
// Valeurs provisoires (.tbd) : à remplacer quand le client envoie ses infos.
const site = {
  nom: "Taxi Lorem", // nom commercial à confirmer
  base: { ville: "Montargis", departement: "45" }, // base exacte à confirmer
  telephone: { affiche: "06 52 44 60 68", lien: "+33652446068" },
  whatsapp: "33652446068",
  // Liste de départ issue de la maquette, à valider avec le client
  communes: ["Montargis", "Amilly", "Chalette-sur-Loing", "Villemandeur", "Pannes", "Châlette"],
  // Infos affichées sur le site. Tout est provisoire (.tbd) tant que le client n'a pas confirmé.
  infos: {
    horaires: "7j/7, 5 h – 23 h",
    zone: "10 à 20 km autour",
    paiement: "Carte, espèces, tiers payant",
    zoneCourte: "Montargis et alentours",
  },
  exemplePrix: { trajet: "Montargis → Orly", montant: "≈ 218 €" }, // exemple fictif du héros
  tarifs: {
    // Provisoires : à confirmer avec le client
    priseEnCharge: 3.0,
    kmJour: 1.1,
    kmNuit: 1.65,
    minimum: 8.0,
  },
};

export default site;
