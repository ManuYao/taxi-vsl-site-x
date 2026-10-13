// node --test lib/reservation.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { schemaReservation, messageErreurReservation, formaterTelephone, composerAlertes, nettoyer } from "./reservation.js";

const schema = schemaReservation({ maxPassagers: 4 });
const valide = () => ({
  requestId: "3f1b1c3e-5b57-4a53-9b0e-0d9a7a1c1a11",
  depart: { label: "Montargis", lat: 47.997, lon: 2.733 },
  arrivee: { label: "Aéroport d'Orly", lat: 48.726, lon: 2.365 },
  date: "2026-10-15",
  heure: "10:00",
  passagers: 2,
  bagages: false,
  conventionne: false,
  nom: "Mme Martin",
  telephone: "06 12 34 56 78",
  jeton: "jeton-de-test",
});
const echec = (corps) => {
  const r = schema.safeParse(corps);
  assert.equal(r.success, false);
  return r.error;
};

test("une demande complète est acceptée", () => {
  const r = schema.safeParse(valide());
  assert.equal(r.success, true, r.error?.message);
  assert.equal(r.data.nom, "Mme Martin");
});

test("l'e-mail, l'arrêt, le vol et les coordonnées sont facultatifs", () => {
  const sansCoord = { ...valide(), depart: { label: "Chez moi, 3 rue des Lilas" }, email: "", refTrajet: "AF1234", arret: null };
  assert.equal(schema.safeParse(sansCoord).success, true);
  assert.equal(schema.safeParse({ ...valide(), email: "martin@exemple.fr" }).success, true);
});

test("messages d'erreur courts, sans détail technique", () => {
  assert.equal(messageErreurReservation(echec({ ...valide(), nom: "   " })), "Il manque votre nom.");
  assert.equal(messageErreurReservation(echec({ ...valide(), telephone: "0612" })), "Le numéro de téléphone semble incomplet.");
  assert.equal(messageErreurReservation(echec({ ...valide(), email: "pas-un-mail" })), "L'adresse e-mail ne semble pas valide.");
  assert.equal(messageErreurReservation(echec({ ...valide(), date: "2026-02-31" })), "La date n'est pas valide.");
  assert.equal(messageErreurReservation(echec({ ...valide(), passagers: 5 })), "Le nombre de passagers n'est pas valide.");
  assert.equal(messageErreurReservation(echec({ ...valide(), requestId: "123" })), "Demande invalide. Rechargez la page.");
  assert.equal(messageErreurReservation(echec({ ...valide(), arrivee: { label: "Orly", lat: 48.7 } })), "L'arrivée n'est pas valide.");
  assert.equal(messageErreurReservation(echec({ ...valide(), depart: { label: "Madrid", lat: 40.4, lon: -3.7 } })), "Le départ n'est pas valide.");
});

test("les champs inconnus sont ignorés (pas de prix imposé par le navigateur)", () => {
  const r = schema.safeParse({ ...valide(), prix: 1, est_price_cents: 100, status: "accepted" });
  assert.equal(r.success, true);
  assert.equal("prix" in r.data, false);
  assert.equal("status" in r.data, false);
});

test("les caractères de contrôle et retours à la ligne sont retirés", () => {
  const r = schema.safeParse({ ...valide(), nom: "Mme\nMartin\u0000‮  X" });
  assert.equal(r.success, true);
  assert.equal(r.data.nom, "Mme Martin X");
  assert.equal(nettoyer("a\r\n\tb"), "a b");
});

test("trop long : refusé plutôt que coupé", () => {
  echec({ ...valide(), nom: "x".repeat(101) });
  echec({ ...valide(), depart: { label: "x".repeat(301) } });
});

test("formatage du téléphone", () => {
  assert.equal(formaterTelephone("0612345678"), "06 12 34 56 78");
  assert.equal(formaterTelephone("06.12.34.56.78"), "06 12 34 56 78");
  assert.equal(formaterTelephone("+33 6 12 34 56 78"), "+33 6 12 34 56 78");
});

const alerteBase = {
  nom: "Mme Martin",
  telephone: "06 12 34 56 78",
  quand: "mercredi 14 octobre à 14 h 30",
  depart: "Montargis",
  arrivee: "Aéroport d'Orly",
  passagers: 2,
  bagages: true,
  conventionne: false,
  estimation: { prix: 212, km: 104, duree: "1 h 10", tarif: "jour", approximatif: false },
};

test("alerte : contenu utile pour le chauffeur", () => {
  const a = composerAlertes(alerteBase);
  for (const t of [a.telegram, a.texte, a.html]) {
    assert.match(t, /Mme Martin/);
    assert.match(t, /06 12 34 56 78/);
    assert.match(t, /Orly/);
    assert.match(t, /212/);
  }
  assert.match(a.sujet, /Mme Martin/);
  assert.match(a.telegram, /2 passagers, bagages/);
  assert.match(a.html, /href="tel:\+33612345678"/);
});

test("alerte : sans estimation, le chauffeur est prévenu qu'il doit confirmer le prix", () => {
  const a = composerAlertes({ ...alerteBase, estimation: null, arret: "Amilly", refTrajet: "TGV 6789", conventionne: true });
  assert.match(a.telegram, /à confirmer par téléphone/);
  assert.match(a.telegram, /Arrêt : Amilly/);
  assert.match(a.telegram, /TGV 6789/);
  assert.match(a.telegram, /transport conventionné/);
});

test("alerte : le texte saisi par le client ne peut pas injecter de HTML", () => {
  const a = composerAlertes({ ...alerteBase, nom: '<b onclick="x">Eve</b> & <i>', depart: "<script>alert(1)</script>" });
  assert.equal(a.telegram.includes("<script>"), false);
  assert.equal(a.html.includes("<script>"), false);
  assert.match(a.telegram, /&lt;script&gt;/);
  assert.match(a.html, /&lt;b onclick=&quot;x&quot;&gt;Eve&lt;\/b&gt; &amp; &lt;i&gt;/);
});
