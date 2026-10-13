// Tout ce qui est propre au client vit ici. Ne jamais l'écrire en dur dans les composants.
// Valeurs provisoires (.tbd) : à remplacer quand le client envoie ses infos.
const site = {
  nom: "Taxi Lorem", // nom commercial à confirmer
  base: { ville: "Montargis", departement: "45", lat: 47.997, lon: 2.733 }, // base exacte à confirmer
  telephone: { affiche: "06 52 44 60 68", lien: "+33652446068" },
  whatsapp: "33652446068",

  // TEMPORAIRE : affiche un bouton pour cacher les contours des textes provisoires (.tbd).
  // Mettre false (ou retirer le composant TbdToggle) avant la mise en ligne.
  boutonTbd: true,

  // Liste de départ issue de la maquette, à valider avec le client
  communes: [
    "Montargis", "Amilly", "Châlette-sur-Loing", "Villemandeur", "Pannes", "Cepoy",
    "Corquilleroy", "Conflans-sur-Loing", "Saint-Germain-des-Prés", "Chevillon-sur-Huillard",
    "Mormant-sur-Vernisson", "Solterre", "Girolles", "Paucourt", "Chuelles",
    "Douchy-Montcorbon", "Dordives", "Ferrières-en-Gâtinais", "Courtenay", "Château-Renard",
    "Triguères", "Vimory", "Fontenay-sur-Loing", "Ladon", "Bellegarde", "Nogent-sur-Vernisson",
  ],

  // Carte des zones : communes dessinées (position GPS approximative, décalage du texte)
  carte: {
    rayonKm: 20,
    villes: [
      { nom: "Amilly", lat: 47.975, lon: 2.77, label: [10, 5, "start"] },
      { nom: "Châlette-sur-Loing", lat: 48.013, lon: 2.736, label: [10, -4, "start"] },
      { nom: "Villemandeur", lat: 47.987, lon: 2.711, label: [-10, 14, "end"] },
      { nom: "Corquilleroy", lat: 48.042, lon: 2.7, label: [-10, 5, "end"] },
      { nom: "Pannes", lat: 48.019, lon: 2.668, label: [-10, 5, "end"] },
      { nom: "Cepoy", lat: 48.048, lon: 2.738, label: [10, 5, "start"] },
      { nom: "Paucourt", lat: 48.028, lon: 2.794, label: [10, 5, "start"] },
      { nom: "Ferrières-en-Gâtinais", lat: 48.09, lon: 2.787, label: [10, 5, "start"] },
      { nom: "Château-Renard", lat: 47.933, lon: 2.928, label: [-10, 5, "end"] },
    ],
    // Grandes villes en bordure de carte : [nom, x, y] dans le dessin 560 x 400
    lointaines: [["Paris", 150, 22], ["Orléans", 16, 330], ["Gien", 190, 382], ["Sens", 544, 120]],
  },

  // Destinations fréquentes (distance estimée depuis la base)
  destinations: [
    { nom: "Gare de Montargis", lat: 48.004, lon: 2.737 },
    { nom: "Orléans", lat: 47.902, lon: 1.909 },
    { nom: "Paris", lat: 48.857, lon: 2.352 },
    { nom: "Orly", lat: 48.726, lon: 2.365 },
    { nom: "Roissy-CDG", lat: 49.009, lon: 2.548 },
  ],

  // Infos affichées sur le site. Tout est provisoire (.tbd) tant que le client n'a pas confirmé.
  infos: {
    horaires: "7j/7, 5 h – 23 h",
    zone: "10 à 20 km autour",
    paiement: "Carte, espèces, tiers payant",
    zoneCourte: "Montargis et alentours",
  },
  exemplePrix: { trajet: "Montargis → Orly", montant: "≈ 212 €" }, // exemple du héros : ce que calcule le site avec les tarifs fictifs ci-dessous

  reservation: { maxPassagers: 4 }, // à confirmer selon le véhicule

  tarifs: {
    // Fictifs : à confirmer avec le client (passer `confirmes` à true une fois validés)
    confirmes: false,
    priseEnCharge: 4.0,
    kmJour: 2.0,
    kmNuit: 2.5,
    minimum: 8.0,
  },
};

export default site;
