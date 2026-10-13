// E-mail envoyé au client quand le chauffeur accepte ou refuse sa demande. Sans import du projet : testable avec node.
import { dateLisibleParis } from "./paris.js";

const echapper = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// accepte : true (course confirmée) ou false (refusée)
// course : { nom, pickupAt (ISO), depart, arrivee } ; entreprise : { nom, telephone }
export function composerReponseClient({ accepte, course, entreprise }) {
  const quand = dateLisibleParis(new Date(course.pickupAt));
  const trajet = `${course.depart} → ${course.arrivee}`;

  const sujet = accepte ? `Votre course est confirmée : ${quand}` : "Votre demande de course";
  const paragraphes = accepte
    ? [
        `Bonjour ${course.nom},`,
        `Bonne nouvelle : votre course est confirmée.`,
        `${quand}\n${trajet}`,
        `Le chauffeur vous contactera si besoin. Pour toute question ou modification, appelez le ${entreprise.telephone}.`,
      ]
    : [
        `Bonjour ${course.nom},`,
        `Nous ne pouvons malheureusement pas assurer la course demandée (${quand}, ${trajet}).`,
        `Vous pouvez nous appeler au ${entreprise.telephone} : nous chercherons une autre solution avec vous.`,
      ];

  const texte = `${paragraphes.join("\n\n")}\n\n${entreprise.nom}\n`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.55;color:#141819;max-width:520px">${paragraphes
    .map((p) => `<p style="margin:0 0 14px">${echapper(p).replace(/\n/g, "<br>")}</p>`)
    .join("")}<p style="margin:18px 0 0;color:#5a6366">${echapper(entreprise.nom)}</p></div>`;

  return { sujet, texte, html };
}
