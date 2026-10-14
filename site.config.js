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

  // Connexion de l'espace chauffeur : e-mail + mot de passe. La connexion par code reçu par e-mail demande un serveur
  // SMTP personnalisé chez Supabase (donc un nom de domaine vérifié) : à passer à true seulement une fois celui-ci en place.
  admin: { codeParEmail: false },

  // Adresse publique du site (sert aux liens canoniques, au plan du site et aux aperçus de partage).
  // Provisoire : à remplacer par le vrai nom de domaine. Peut aussi venir de la variable NEXT_PUBLIC_SITE_URL.
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://taxik.netlify.app",

  // Référencement Google. Tant que c'est false, le site demande aux moteurs de recherche de NE PAS l'indexer
  // (contenu provisoire, tarifs fictifs). Passer à true le jour de la mise en ligne définitive.
  indexation: false,

  // Mentions légales : tout est à fournir par le client (.tbd tant que ce n'est pas fait).
  legal: {
    raisonSociale: "", // ex. « Taxi Dupont » ou « SARL Dupont Transports »
    formeJuridique: "", // ex. « Entreprise individuelle », « SARL au capital de … € »
    siret: "",
    adresse: "",
    responsablePublication: "",
    email: "",
    numeroLicence: "", // licence de taxi / autorisation de stationnement, ou agrément VSL
    hebergeur: "Netlify, Inc. (États-Unis), https://www.netlify.com",
    conceptionEmail: "yaomanuit@gmail.com", // contact du créateur du site (affiché dans les mentions légales) ; "" pour ne rien afficher
    conservationAns: 3, // durée de conservation des demandes de course (à confirmer)
  },

  // Communes desservies (liste de départ issue de la maquette, à valider avec le client).
  // Position et code postal : géocodeur public de l'IGN. Chaque commune a sa page /taxi/<nom>.
  communes: [
    { nom: "Montargis", cp: "45200", lat: 47.9983, lon: 2.7354 },
    { nom: "Amilly", cp: "45200", lat: 47.979, lon: 2.7843 },
    { nom: "Châlette-sur-Loing", cp: "45120", lat: 48.0191, lon: 2.7205 },
    { nom: "Villemandeur", cp: "45700", lat: 47.9864, lon: 2.7018 },
    { nom: "Pannes", cp: "45700", lat: 48.0047, lon: 2.6759 },
    { nom: "Cepoy", cp: "45120", lat: 48.0497, lon: 2.7427 },
    { nom: "Corquilleroy", cp: "45120", lat: 48.0369, lon: 2.7079 },
    { nom: "Conflans-sur-Loing", cp: "45700", lat: 47.948, lon: 2.7887 },
    { nom: "Saint-Germain-des-Prés", cp: "45220", lat: 47.9671, lon: 2.8362 },
    { nom: "Chevillon-sur-Huillard", cp: "45700", lat: 47.9664, lon: 2.6269 },
    { nom: "Mormant-sur-Vernisson", cp: "45700", lat: 47.9425, lon: 2.7364 },
    { nom: "Solterre", cp: "45700", lat: 47.9139, lon: 2.7352 },
    { nom: "Girolles", cp: "45120", lat: 48.0686, lon: 2.726 },
    { nom: "Paucourt", cp: "45200", lat: 48.0363, lon: 2.7893 },
    { nom: "Chuelles", cp: "45220", lat: 48.0001, lon: 2.9702 },
    { nom: "Douchy-Montcorbon", cp: "45220", lat: 47.9535, lon: 3.0596 },
    { nom: "Dordives", cp: "45680", lat: 48.146, lon: 2.7816 },
    { nom: "Ferrières-en-Gâtinais", cp: "45210", lat: 48.11, lon: 2.8071 },
    { nom: "Courtenay", cp: "45320", lat: 48.0343, lon: 3.0617 },
    { nom: "Château-Renard", cp: "45220", lat: 47.9264, lon: 2.9238 },
    { nom: "Triguères", cp: "45220", lat: 47.9418, lon: 2.9935 },
    { nom: "Vimory", cp: "45700", lat: 47.9486, lon: 2.6853 },
    { nom: "Fontenay-sur-Loing", cp: "45210", lat: 48.0808, lon: 2.7704 },
    { nom: "Ladon", cp: "45270", lat: 48.0076, lon: 2.5296 },
    { nom: "Bellegarde", cp: "45270", lat: 47.9875, lon: 2.4439 },
    { nom: "Nogent-sur-Vernisson", cp: "45290", lat: 47.8359, lon: 2.7373 },
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

  // Destinations fréquentes : affichées dans la zone desservie (distance estimée depuis la base)
  // et en raccourcis sous le champ Arrivée. `libelle` = texte mis dans le champ (par défaut `nom`).
  // Le service d'adresses ne connaît pas tous les aéroports ni toutes les gares de Paris : d'où ces raccourcis.
  destinations: [
    { nom: "Gare de Montargis", lat: 48.0067, lon: 2.7428 },
    { nom: "Hôpital", libelle: "Centre hospitalier de l'agglomération montargoise, Amilly", lat: 47.9973, lon: 2.7726 },
    { nom: "Orléans", lat: 47.902, lon: 1.909 },
    { nom: "Paris", lat: 48.857, lon: 2.352 },
    { nom: "Orly", libelle: "Aéroport d'Orly", lat: 48.726, lon: 2.365 },
    { nom: "Roissy-CDG", libelle: "Aéroport Roissy-Charles-de-Gaulle", lat: 49.009, lon: 2.548 },
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
