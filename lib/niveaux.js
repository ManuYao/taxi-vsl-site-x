// Niveaux d'accès de l'équipe : 0 chauffeur, 1 manager, 2 patron. Sans import : utilisable côté serveur et navigateur.
export const NIVEAU_CHAUFFEUR = 0;
export const NIVEAU_MANAGER = 1;
export const NIVEAU_PATRON = 2;
export const NOMS_NIVEAUX = ["chauffeur", "manager", "patron"];

// Garde la compatibilité avec les contrôles existants (« role === "patron" »)
export const roleDuNiveau = (niveau) => (niveau >= NIVEAU_PATRON ? "patron" : "chauffeur");

// On ne gère que des personnes de niveau strictement inférieur au sien, jamais soi-même.
export function peutGerer(moi, cible) {
  return moi.niveau >= NIVEAU_MANAGER && cible.niveau < moi.niveau && cible.id !== moi.id;
}

// Niveaux qu'on peut donner à quelqu'un : strictement sous le sien.
export const niveauxAttribuables = (niveau) => [NIVEAU_CHAUFFEUR, NIVEAU_MANAGER].filter((n) => n < niveau);

// Seul le patron change le niveau d'une personne déjà dans l'équipe.
export const peutChangerNiveau = (moi, cible) => moi.niveau >= NIVEAU_PATRON && peutGerer(moi, cible);
