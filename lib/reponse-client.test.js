// node --test lib/reponse-client.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { composerReponseClient } from "./reponse-client.js";

const base = {
  course: { nom: "Mme Martin", pickupAt: "2026-10-14T12:30:00.000Z", depart: "Montargis", arrivee: "Aéroport d'Orly" },
  entreprise: { nom: "Taxi Lorem", telephone: "06 52 44 60 68" },
};

test("course annulée : excuses, date, trajet et téléphone pour reprogrammer", () => {
  const m = composerReponseClient({ statut: "annulee", ...base });
  assert.match(m.sujet, /annulée/);
  for (const t of [m.texte, m.html]) {
    assert.match(t, /mercredi 14 octobre à 14 h 30/);
    assert.match(t, /06 52 44 60 68/);
  }
  assert.doesNotMatch(m.texte, /confirmée/);
});

test("course acceptée : confirmation avec date de Paris, trajet et téléphone", () => {
  const m = composerReponseClient({ statut: "acceptee", ...base });
  assert.match(m.sujet, /confirmée/);
  for (const t of [m.texte, m.html]) {
    assert.match(t, /mercredi 14 octobre à 14 h 30/); // 12:30 UTC = 14:30 à Paris en octobre
    assert.match(t, /Montargis → Aéroport d/);
    assert.match(t, /06 52 44 60 68/);
    assert.match(t, /Mme Martin/);
  }
});

test("course refusée : message aimable avec le téléphone pour trouver une solution", () => {
  const m = composerReponseClient({ statut: "refusee", ...base });
  assert.doesNotMatch(m.sujet, /confirmée/);
  assert.match(m.texte, /ne pouvons malheureusement pas/);
  assert.match(m.texte, /06 52 44 60 68/);
});

test("le texte du client est échappé dans la version HTML", () => {
  const m = composerReponseClient({ statut: "acceptee", ...base, course: { ...base.course, nom: "<script>x</script>", depart: "A & B" } });
  assert.equal(m.html.includes("<script>"), false);
  assert.match(m.html, /A &amp; B/);
});
