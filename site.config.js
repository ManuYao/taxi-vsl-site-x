// Tout ce qui est propre au client vit ici. Ne jamais l'écrire en dur dans les composants.
// Valeurs provisoires (.tbd) : à remplacer quand le client envoie ses infos.
const site = {
  nom: "Taxi Lorem", // nom commercial à confirmer
  base: { ville: "Nemours", departement: "77", region: "Île-de-France", lat: 48.2633, lon: 2.7187 }, // Nemours (77140), donné par le client ; adresse exacte de la base à confirmer
  // Départements de la zone (la recherche d'adresses y est favorisée ; pages « Taxi en <département> » prévues)
  departements: [
    { code: "77", nom: "Seine-et-Marne" },
    { code: "45", nom: "Loiret" },
  ],
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

  // Communes desservies : toutes celles à moins de 20 km de Nemours (à vol d'oiseau, du centre de la base au centre de la commune),
  // soit environ 90 communes, presque toutes en Seine-et-Marne (77) et quelques-unes dans le Loiret (45).
  // Liste de départ à valider avec le client. Source : geo.api.gouv.fr (code postal, département, position du centre).
  // Chaque commune a sa page /taxi/<nom>. Triées de la plus proche à la plus éloignée de la base.
  communes: [
    { nom: "Nemours", cp: "77140", departement: "77", lat: 48.2633, lon: 2.7187 },
    { nom: "Darvault", cp: "77140", departement: "77", lat: 48.2757, lon: 2.7220 },
    { nom: "Saint-Pierre-lès-Nemours", cp: "77140", departement: "77", lat: 48.2647, lon: 2.6673 },
    { nom: "Moncourt-Fromonville", cp: "77140", departement: "77", lat: 48.2983, lon: 2.7153 },
    { nom: "Poligny", cp: "77167", departement: "77", lat: 48.2373, lon: 2.7590 },
    { nom: "Bagneaux-sur-Loing", cp: "77167", departement: "77", lat: 48.2206, lon: 2.7080 },
    { nom: "Nonville", cp: "77140", departement: "77", lat: 48.2894, lon: 2.7731 },
    { nom: "Treuzy-Levelay", cp: "77710", departement: "77", lat: 48.2713, lon: 2.7917 },
    { nom: "Grez-sur-Loing", cp: "77880", departement: "77", lat: 48.3078, lon: 2.6842 },
    { nom: "Ormesson", cp: "77167", departement: "77", lat: 48.2448, lon: 2.6487 },
    { nom: "Faÿ-lès-Nemours", cp: "77167", departement: "77", lat: 48.2265, lon: 2.6646 },
    { nom: "La Genevraye", cp: "77690", departement: "77", lat: 48.3164, lon: 2.7509 },
    { nom: "La Madeleine-sur-Loing", cp: "77570", departement: "77", lat: 48.2036, lon: 2.7015 },
    { nom: "Nanteau-sur-Lunain", cp: "77710", departement: "77", lat: 48.2529, lon: 2.8099 },
    { nom: "Châtenoy", cp: "77167", departement: "77", lat: 48.2311, lon: 2.6274 },
    { nom: "Villiers-sous-Grez", cp: "77760", departement: "77", lat: 48.3144, lon: 2.6396 },
    { nom: "Bourron-Marlotte", cp: "77780", departement: "77", lat: 48.3366, lon: 2.6982 },
    { nom: "Bougligny", cp: "77570", departement: "77", lat: 48.1958, lon: 2.6608 },
    { nom: "Souppes-sur-Loing", cp: "77460", departement: "77", lat: 48.1864, lon: 2.7426 },
    { nom: "Chevrainvilliers", cp: "77760", departement: "77", lat: 48.2460, lon: 2.6030 },
    { nom: "Villemer", cp: "77250", departement: "77", lat: 48.3015, lon: 2.8226 },
    { nom: "Montigny-sur-Loing", cp: "77690", departement: "77", lat: 48.3381, lon: 2.7572 },
    { nom: "Larchant", cp: "77760", departement: "77", lat: 48.2857, lon: 2.6000 },
    { nom: "Remauville", cp: "77710", departement: "77", lat: 48.2215, lon: 2.8285 },
    { nom: "Recloses", cp: "77760", departement: "77", lat: 48.3388, lon: 2.6441 },
    { nom: "Paley", cp: "77710", departement: "77", lat: 48.2387, lon: 2.8565 },
    { nom: "Chaintreaux", cp: "77460", departement: "77", lat: 48.1914, lon: 2.8154 },
    { nom: "Aufferville", cp: "77570", departement: "77", lat: 48.2028, lon: 2.6022 },
    { nom: "Maisoncelles-en-Gâtinais", cp: "77570", departement: "77", lat: 48.1837, lon: 2.6222 },
    { nom: "Villecerf", cp: "77250", departement: "77", lat: 48.3271, lon: 2.8439 },
    { nom: "Villemaréchal", cp: "77710", departement: "77", lat: 48.2731, lon: 2.8784 },
    { nom: "Guercheville", cp: "77760", departement: "77", lat: 48.2620, lon: 2.5569 },
    { nom: "Chenou", cp: "77570", departement: "77", lat: 48.1648, lon: 2.6525 },
    { nom: "Ury", cp: "77760", departement: "77", lat: 48.3410, lon: 2.6016 },
    { nom: "Garentreville", cp: "77890", departement: "77", lat: 48.2343, lon: 2.5581 },
    { nom: "La Chapelle-la-Reine", cp: "77760", departement: "77", lat: 48.3137, lon: 2.5690 },
    { nom: "Obsonville", cp: "77890", departement: "77", lat: 48.2140, lon: 2.5673 },
    { nom: "Moret-Loing-et-Orvanne", cp: "77250", departement: "77", lat: 48.3545, lon: 2.8233 },
    { nom: "Château-Landon", cp: "77570", departement: "77", lat: 48.1490, lon: 2.6976 },
    { nom: "Lorrez-le-Bocage-Préaux", cp: "77710", departement: "77", lat: 48.2423, lon: 2.8932 },
    { nom: "Dormelles", cp: "77130", departement: "77", lat: 48.3115, lon: 2.8906 },
    { nom: "Dordives", cp: "45680", departement: "45", lat: 48.1435, lon: 2.7741 },
    { nom: "Amponville", cp: "77760", departement: "77", lat: 48.2897, lon: 2.5295 },
    { nom: "Ichy", cp: "77890", departement: "77", lat: 48.2079, lon: 2.5440 },
    { nom: "Burcy", cp: "77760", departement: "77", lat: 48.2327, lon: 2.5266 },
    { nom: "Achères-la-Forêt", cp: "77760", departement: "77", lat: 48.3476, lon: 2.5653 },
    { nom: "Arville", cp: "77890", departement: "77", lat: 48.1819, lon: 2.5578 },
    { nom: "Égreville", cp: "77620", departement: "77", lat: 48.1857, lon: 2.8870 },
    { nom: "Mondreville", cp: "77570", departement: "77", lat: 48.1513, lon: 2.6003 },
    { nom: "Bransles", cp: "77620", departement: "77", lat: 48.1481, lon: 2.8318 },
    { nom: "Flagy", cp: "77940", departement: "77", lat: 48.3083, lon: 2.9172 },
    { nom: "Saint-Mammès", cp: "77670", departement: "77", lat: 48.3863, lon: 2.8205 },
    { nom: "Fromont", cp: "77760", departement: "77", lat: 48.2550, lon: 2.5056 },
    { nom: "Thomery", cp: "77810", departement: "77", lat: 48.4021, lon: 2.7729 },
    { nom: "Ville-Saint-Jacques", cp: "77130", departement: "77", lat: 48.3436, lon: 2.8994 },
    { nom: "Rumont", cp: "77760", departement: "77", lat: 48.2707, lon: 2.4966 },
    { nom: "Avon", cp: "77210", departement: "77", lat: 48.4124, lon: 2.7337 },
    { nom: "Thoury-Férottes", cp: "77940", departement: "77", lat: 48.3016, lon: 2.9390 },
    { nom: "Desmonts", cp: "45390", departement: "45", lat: 48.2249, lon: 2.4986 },
    { nom: "Villebéon", cp: "77710", departement: "77", lat: 48.2033, lon: 2.9277 },
    { nom: "Nargis", cp: "45210", departement: "45", lat: 48.1105, lon: 2.7397 },
    { nom: "Gironville", cp: "77890", departement: "77", lat: 48.1671, lon: 2.5383 },
    { nom: "Champagne-sur-Seine", cp: "77430", departement: "77", lat: 48.4072, lon: 2.8101 },
    { nom: "Le Vaudoué", cp: "77123", departement: "77", lat: 48.3468, lon: 2.5194 },
    { nom: "Chevannes", cp: "45210", departement: "45", lat: 48.1345, lon: 2.8532 },
    { nom: "Préfontaines", cp: "45490", departement: "45", lat: 48.1063, lon: 2.6889 },
    { nom: "Boissy-aux-Cailles", cp: "77760", departement: "77", lat: 48.3099, lon: 2.4897 },
    { nom: "Noisy-Rudignon", cp: "77940", departement: "77", lat: 48.3372, lon: 2.9331 },
    { nom: "Samoreau", cp: "77210", departement: "77", lat: 48.4205, lon: 2.7749 },
    { nom: "Fontainebleau", cp: "77300", departement: "77", lat: 48.4236, lon: 2.6817 },
    { nom: "Chevry-en-Sereine", cp: "77710", departement: "77", lat: 48.2460, lon: 2.9640 },
    { nom: "Vaux-sur-Lunain", cp: "77710", departement: "77", lat: 48.2143, lon: 2.9559 },
    { nom: "Chevry-sous-le-Bignon", cp: "45210", departement: "45", lat: 48.1444, lon: 2.8929 },
    { nom: "Vernou-la-Celle-sur-Seine", cp: "77670", departement: "77", lat: 48.4058, lon: 2.8510 },
    { nom: "Voulx", cp: "77940", departement: "77", lat: 48.2876, lon: 2.9688 },
    { nom: "Bromeilles", cp: "45390", departement: "45", lat: 48.1855, lon: 2.4906 },
    { nom: "Sceaux-du-Gâtinais", cp: "45490", departement: "45", lat: 48.1126, lon: 2.5920 },
    { nom: "La Grande-Paroisse", cp: "77130", departement: "77", lat: 48.3938, lon: 2.8918 },
    { nom: "Buthiers", cp: "77760", departement: "77", lat: 48.2902, lon: 2.4603 },
    { nom: "Vulaines-sur-Seine", cp: "77870", departement: "77", lat: 48.4335, lon: 2.7757 },
    { nom: "Orville", cp: "45390", departement: "45", lat: 48.2430, lon: 2.4582 },
    { nom: "Ferrières-en-Gâtinais", cp: "45210", departement: "45", lat: 48.0992, lon: 2.8122 },
    { nom: "Puiseaux", cp: "45390", departement: "45", lat: 48.2084, lon: 2.4679 },
    { nom: "Noisy-sur-École", cp: "77123", departement: "77", lat: 48.3733, lon: 2.5114 },
    { nom: "Varennes-sur-Seine", cp: "77130", departement: "77", lat: 48.3695, lon: 2.9317 },
    { nom: "Courtempierre", cp: "45490", departement: "45", lat: 48.0930, lon: 2.6396 },
    { nom: "Arbonne-la-Forêt", cp: "77630", departement: "77", lat: 48.4064, lon: 2.5561 },
    { nom: "Boulancourt", cp: "77760", departement: "77", lat: 48.2606, lon: 2.4483 },
    { nom: "Fontenay-sur-Loing", cp: "45210", departement: "45", lat: 48.0863, lon: 2.7690 },
  ],

  // Communes citées sous le titre de l'accueil (les plus connues de la zone).
  communesVedettes: ["Saint-Pierre-lès-Nemours", "Souppes-sur-Loing", "Château-Landon", "Moret-Loing-et-Orvanne", "Fontainebleau"],

  // Carte des zones, centrée sur la base et à l'échelle (le cercle en pointillés = rayonKm). Les communes dessinées
  // (position GPS, décalage du texte [dx, dy, ancre]) sont une sélection des plus connues ; la liste complète est sous la carte.
  carte: {
    rayonKm: 20,
    villes: [
      { nom: "Saint-Pierre-lès-Nemours", lat: 48.2647, lon: 2.6673, label: [-10, 5, "end"] },
      { nom: "Bourron-Marlotte", lat: 48.3366, lon: 2.6982, label: [-10, 5, "end"] },
      { nom: "Moret-Loing-et-Orvanne", lat: 48.3545, lon: 2.8233, label: [10, 5, "start"] },
      { nom: "Fontainebleau", lat: 48.4236, lon: 2.6817, label: [10, 5, "start"] },
      { nom: "La Chapelle-la-Reine", lat: 48.3137, lon: 2.569, label: [-10, 5, "end"] },
      { nom: "Souppes-sur-Loing", lat: 48.1864, lon: 2.7426, label: [-10, 5, "end"] },
      { nom: "Château-Landon", lat: 48.149, lon: 2.6976, label: [-10, 5, "end"] },
      { nom: "Dordives", lat: 48.1435, lon: 2.7741, label: [10, 5, "start"] },
      { nom: "Égreville", lat: 48.1857, lon: 2.887, label: [10, 5, "start"] },
      { nom: "Puiseaux", lat: 48.2084, lon: 2.4679, label: [10, 5, "start"] },
    ],
    // Grandes villes en bordure de carte : [nom, x, y] dans le dessin 560 x 400 (placées dans la direction réelle depuis la base)
    lointaines: [["Paris", 207, 22], ["Sens", 520, 244], ["Montargis", 289, 378], ["Orléans", 16, 377]],
  },

  // Destinations fréquentes : affichées dans la zone desservie (distance estimée depuis la base),
  // en raccourcis sous le champ Arrivée et, avec `phrase`, sur les pages des communes (« 12 km à l'hôpital »).
  // `libelle` = texte mis dans le champ (par défaut `nom`). Positions à vérifier avec le client (gare, hôpital).
  // Le service d'adresses ne connaît pas tous les aéroports ni toutes les gares de Paris : d'où ces raccourcis.
  destinations: [
    { nom: "Gare de Nemours", phrase: "à la gare de Nemours", libelle: "Gare de Nemours-Saint-Pierre, Saint-Pierre-lès-Nemours", lat: 48.2669, lon: 2.6869 },
    { nom: "Hôpital", phrase: "à l'hôpital", libelle: "Hôpital de Nemours, rue Édith Piaf, Nemours", lat: 48.2766, lon: 2.6953 },
    { nom: "Fontainebleau", libelle: "Gare de Fontainebleau-Avon, Fontainebleau", lat: 48.4059, lon: 2.7046 },
    { nom: "Melun", libelle: "Gare de Melun", lat: 48.5261, lon: 2.6549 },
    { nom: "Paris", lat: 48.857, lon: 2.352 },
    { nom: "Orly", phrase: "à l'aéroport d'Orly", libelle: "Aéroport d'Orly", lat: 48.726, lon: 2.365 },
    { nom: "Roissy-CDG", phrase: "à l'aéroport Roissy-CDG", libelle: "Aéroport Roissy-Charles-de-Gaulle", lat: 49.009, lon: 2.548 },
  ],

  // Infos affichées sur le site. Tout est provisoire (.tbd) tant que le client n'a pas confirmé.
  infos: {
    horaires: "7j/7, 5 h – 23 h",
    zone: "10 à 20 km autour",
    paiement: "Carte, espèces, tiers payant",
    zoneCourte: "Nemours et alentours",
  },
  exemplePrix: { trajet: "Nemours → Orly", montant: "≈ 148 €" }, // exemple du héros : ce que calcule le site avec les tarifs fictifs ci-dessous (≈ 72 km)

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
