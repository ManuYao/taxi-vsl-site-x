// Règles d'une demande de réservation : validation (Zod) et texte des alertes envoyées au chauffeur.
// Sans import du projet (hors pricing.js) : testable avec node.
import { z } from "zod";
import { lireDate, lireHeure } from "./pricing.js";

// Retire les caractères de contrôle, les caractères invisibles (dont l'inversion du sens d'écriture) et les espaces en trop : un nom ne doit pas pouvoir casser
// un message Telegram ou un e-mail (retours à la ligne, caractères invisibles).
export const nettoyer = (s) => String(s ?? "").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ").replace(/\s+/g, " ").trim();
const texte = (max, min = 0) => z.string().max(max * 4).transform(nettoyer).pipe(z.string().min(min).max(max));

export const chiffres = (t) => String(t ?? "").replace(/\D/g, "");

// "0612345678" -> "06 12 34 56 78" ; un autre format est gardé tel quel (« +33 6 12 … »)
export function formaterTelephone(t) {
  const c = chiffres(t);
  return /^0\d{9}$/.test(c) ? c.replace(/(\d{2})(?=\d)/g, "$1 ") : nettoyer(t);
}

// Un lieu : le texte vient toujours ; les coordonnées seulement si le client a choisi une suggestion.
const lieu = z
  .object({
    label: texte(300, 2),
    lat: z.number().min(41).max(52).optional(),
    lon: z.number().min(-5.5).max(10).optional(),
  })
  .refine((l) => (l.lat === undefined) === (l.lon === undefined), { message: "coordonnées incomplètes" });

export function schemaReservation({ maxPassagers }) {
  return z.object({
    requestId: z.uuid(), // identifiant de cette demande, pour ne pas l'enregistrer deux fois
    depart: lieu,
    arrivee: lieu,
    arret: lieu.nullish(),
    date: z.string().refine((d) => lireDate(d) !== null),
    heure: z.string().refine((h) => lireHeure(h) !== null),
    passagers: z.number().int().min(1).max(maxPassagers),
    bagages: z.boolean(),
    conventionne: z.boolean(),
    refTrajet: texte(60).optional(),
    nom: texte(100, 1),
    telephone: z.string().max(40).refine((t) => chiffres(t).length >= 10 && chiffres(t).length <= 15),
    email: z.union([z.literal(""), z.email().max(200)]).optional(),
    jeton: z.string().min(1).max(4096), // jeton Turnstile
    piege: z.string().max(200).optional(), // champ caché : un humain ne le remplit jamais
  });
}

const MESSAGES = {
  requestId: "Demande invalide. Rechargez la page.",
  depart: "Le départ n'est pas valide.",
  arrivee: "L'arrivée n'est pas valide.",
  arret: "L'arrêt en chemin n'est pas valide.",
  date: "La date n'est pas valide.",
  heure: "L'heure n'est pas valide.",
  passagers: "Le nombre de passagers n'est pas valide.",
  nom: "Il manque votre nom.",
  telephone: "Le numéro de téléphone semble incomplet.",
  email: "L'adresse e-mail ne semble pas valide.",
  refTrajet: "Le numéro de vol ou de train est trop long.",
};

// Message court pour le client, sans jamais renvoyer la valeur reçue ni le détail technique
export function messageErreurReservation(echec) {
  return MESSAGES[echec.issues[0]?.path?.[0]] ?? "Demande invalide.";
}

// ---------------------------------------------------------------------------------------------
// Alertes au chauffeur
// ---------------------------------------------------------------------------------------------
const echapper = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// r : { nom, telephone, quand, depart, arret?, arrivee, passagers, bagages, conventionne, refTrajet?,
//       estimation?: { prix, km, duree, tarif, approximatif } | null }
export function composerAlertes(r) {
  const options = [
    `${r.passagers} passager${r.passagers > 1 ? "s" : ""}`,
    r.bagages ? "bagages" : null,
    r.conventionne ? "transport conventionné" : null,
  ].filter(Boolean);

  const prix = r.estimation
    ? `≈ ${r.estimation.prix} € (${r.estimation.km} km${r.estimation.duree ? `, ${r.estimation.duree}` : ""}, tarif de ${r.estimation.tarif})${r.estimation.approximatif ? ", distance approximative" : ""}`
    : "à confirmer par téléphone (adresse écrite à la main)";

  const lignes = [
    ["Client", `${r.nom}, ${r.telephone}`],
    ["Quand", r.quand],
    ["De", r.depart],
    r.arret ? ["Arrêt", r.arret] : null,
    ["À", r.arrivee],
    ["Passagers", options.join(", ")],
    r.refTrajet ? ["Vol / train", r.refTrajet] : null,
    ["Prix estimé", prix],
  ].filter(Boolean);

  const telegram = [
    "🚖 <b>Nouvelle demande de course</b>",
    "",
    `👤 <b>${echapper(r.nom)}</b> · ${echapper(r.telephone)}`,
    `🕒 ${echapper(r.quand)}`,
    `📍 De : ${echapper(r.depart)}`,
    r.arret ? `↪️ Arrêt : ${echapper(r.arret)}` : null,
    `🏁 À : ${echapper(r.arrivee)}`,
    `👥 ${echapper(options.join(", "))}`,
    r.refTrajet ? `🎫 Vol / train : ${echapper(r.refTrajet)}` : null,
    `💶 ${echapper(prix)}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const texteMail = `Nouvelle demande de course\n\n${lignes.map(([k, v]) => `${k} : ${v}`).join("\n")}\n`;
  const htmlMail = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#141819">
<h2 style="margin:0 0 12px">Nouvelle demande de course</h2>
<table style="border-collapse:collapse">${lignes
    .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5a6366;vertical-align:top">${echapper(k)}</td><td style="padding:4px 0"><b>${echapper(v)}</b></td></tr>`)
    .join("")}</table>
<p style="margin:16px 0 0"><a href="tel:${echapper(chiffres(r.telephone).replace(/^0/, "+33"))}" style="display:inline-block;background:#1E5B43;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Appeler ${echapper(r.nom)}</a></p>
</div>`;

  return {
    sujet: `Nouvelle course : ${r.nom}, ${r.quand}`,
    telegram,
    texte: texteMail,
    html: htmlMail,
  };
}
