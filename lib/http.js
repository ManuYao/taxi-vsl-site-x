// Petits outils pour les routes de l'API. Sans import : testable avec node.

// Adresse IP du visiteur, d'après les en-têtes posés par l'hébergeur (null si inconnue).
export function ipDuClient(request) {
  const h = request.headers;
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
}

// Lit le corps de la requête en s'arrêtant dès que la taille maximale (en octets) est dépassée.
// Renvoie le texte, ou null si c'est trop gros.
export async function lireTexteLimite(request, max) {
  if (Number(request.headers.get("content-length")) > max) return null;
  if (!request.body) return "";
  const lecteur = request.body.getReader();
  const decodeur = new TextDecoder();
  let texte = "";
  let octets = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    octets += value.byteLength;
    if (octets > max) {
      await lecteur.cancel();
      return null;
    }
    texte += decodeur.decode(value, { stream: true });
  }
  return texte + decodeur.decode();
}

// Limite par clé (en général l'adresse IP), en mémoire : elle vaut par instance du serveur.
// Elle freine un script qui boucle ; elle ne remplace pas l'anti-spam (Turnstile).
// Renvoie une fonction : clé -> nombre de secondes à attendre (0 si la demande peut passer).
export function creerLimiteur({ max, fenetreMs, taillePleine = 2000 }) {
  const visites = new Map(); // clé -> { debut, nombre }
  return function secondesAAttendre(cle) {
    const maintenant = Date.now();
    if (visites.size >= taillePleine) {
      for (const [k, v] of visites) if (maintenant - v.debut >= fenetreMs) visites.delete(k);
      if (visites.size >= taillePleine) visites.clear(); // plutôt que de grossir sans fin
    }
    const v = visites.get(cle);
    if (!v || maintenant - v.debut >= fenetreMs) {
      visites.set(cle, { debut: maintenant, nombre: 1 });
      return 0;
    }
    v.nombre += 1;
    return v.nombre > max ? Math.ceil((v.debut + fenetreMs - maintenant) / 1000) : 0;
  };
}
