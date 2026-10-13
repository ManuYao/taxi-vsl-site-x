// node --test lib/disponibilite.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { etatEffectif, validerDisponibilite } from "./disponibilite.js";
import { parisVersUtc } from "./paris.js";

const midi = (jour) => parisVersUtc(jour, "12:00");

test("pas de ligne, ligne illisible ou « online » : le service est ouvert", () => {
  for (const l of [null, undefined, "x", {}, { state: "online" }, { state: "inconnu" }]) {
    assert.equal(etatEffectif(l, midi("2026-10-14")).ouvert, true);
  }
});

test("hors ligne : fermé, avec le message", () => {
  const e = etatEffectif({ state: "offline", message: "  Pause déjeuner  " }, midi("2026-10-14"));
  assert.deepEqual(e, { ouvert: false, etat: "offline", message: "Pause déjeuner", jusquau: null });
});

test("vacances : fermé seulement entre les deux dates, bornes incluses", () => {
  const v = { state: "vacances", date_from: "2026-10-20", date_to: "2026-10-27", message: "De retour le 28" };
  assert.equal(etatEffectif(v, midi("2026-10-19")).ouvert, true); // pas commencé
  assert.equal(etatEffectif(v, midi("2026-10-20")).ouvert, false); // premier jour
  assert.equal(etatEffectif(v, midi("2026-10-24")).etat, "vacances");
  assert.equal(etatEffectif(v, midi("2026-10-27")).ouvert, false); // dernier jour inclus
  assert.equal(etatEffectif(v, midi("2026-10-28")).ouvert, true); // retour automatique
  assert.equal(etatEffectif(v, midi("2026-10-24")).jusquau, "2026-10-27");
});

test("vacances sans dates : fermé jusqu'à nouvel ordre ; sans date de fin : fermé dès le début", () => {
  assert.equal(etatEffectif({ state: "vacances" }, midi("2030-01-01")).ouvert, false);
  assert.equal(etatEffectif({ state: "vacances", date_from: "2026-10-20" }, midi("2027-05-01")).ouvert, false);
});

test("le jour est celui de Paris, même tard le soir (minuit)", () => {
  const v = { state: "vacances", date_from: "2026-10-20", date_to: "2026-10-20" };
  assert.equal(etatEffectif(v, parisVersUtc("2026-10-20", "23:59")).ouvert, false);
  assert.equal(etatEffectif(v, parisVersUtc("2026-10-21", "00:01")).ouvert, true);
});

test("validation : états, dates et message", () => {
  assert.equal(validerDisponibilite({ state: "x" }).ok, false);
  assert.equal(validerDisponibilite(null).ok, false);
  assert.equal(validerDisponibilite({ state: "vacances", date_from: "pas une date" }).ok, false);
  assert.equal(validerDisponibilite({ state: "vacances", date_from: "2026-10-20", date_to: "2026-10-10" }).ok, false);
  assert.equal(validerDisponibilite({ state: "offline", message: "x".repeat(301) }).ok, false);
  const ok = validerDisponibilite({ state: "vacances", date_from: "2026-10-20", date_to: "2026-10-27", message: "  Retour\nle 28 " });
  assert.deepEqual(ok, { ok: true, valeurs: { state: "vacances", date_from: "2026-10-20", date_to: "2026-10-27", message: "Retour le 28" } });
});

test("en ligne : dates et message effacés ; hors ligne : pas de dates", () => {
  assert.deepEqual(validerDisponibilite({ state: "online", date_from: "2026-10-20", message: "ancien" }).valeurs, { state: "online", date_from: null, date_to: null, message: null });
  assert.deepEqual(validerDisponibilite({ state: "offline", date_from: "2026-10-20", message: "Pause" }).valeurs, { state: "offline", date_from: null, date_to: null, message: "Pause" });
});
