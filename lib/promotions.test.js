// node --test lib/promotions.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { appliquerRemise, choisirPromotion, estGareOuAeroport, validerPromotion } from "./promotions.js";

const promo = (o) => ({ name: "P", percent: 10, scope: "all", code: null, starts_on: null, ends_on: null, active: true, ...o });
const ctx = { km: 20, depart: "Montargis", arrivee: "Amilly", jour: "2026-10-15" };

test("gares et aéroports reconnus dans le texte des adresses", () => {
  for (const t of ["Gare de Montargis", "Aéroport d'Orly", "Aéroport Roissy-Charles-de-Gaulle", "Gare TGV de Lyon", "orly", "Aérogare 2"]) assert.equal(estGareOuAeroport(t), true, t);
  for (const t of ["Montargis", "12 rue Dorée, Amilly", "Centre hospitalier", "Garenne 45200", "Bagarre"]) assert.equal(estGareOuAeroport(t), false, t);
});

test("aucune promotion : rien ne s'applique", () => {
  assert.deepEqual(choisirPromotion([], ctx), { promo: null, codeInvalide: false });
  assert.deepEqual(choisirPromotion(undefined, ctx), { promo: null, codeInvalide: false });
});

test("promotion sans code : s'applique toute seule, dans ses dates (bornes incluses)", () => {
  const p = promo({ starts_on: "2026-10-15", ends_on: "2026-10-20" });
  assert.equal(choisirPromotion([p], ctx).promo, p);
  assert.equal(choisirPromotion([p], { ...ctx, jour: "2026-10-14" }).promo, null);
  assert.equal(choisirPromotion([p], { ...ctx, jour: "2026-10-20" }).promo, p);
  assert.equal(choisirPromotion([p], { ...ctx, jour: "2026-10-21" }).promo, null);
  assert.equal(choisirPromotion([promo({ active: false })], ctx).promo, null);
});

test("promotion avec code : seulement si le client le saisit (sans tenir compte des majuscules)", () => {
  const p = promo({ code: "AUTOMNE10" });
  assert.equal(choisirPromotion([p], ctx).promo, null);
  assert.deepEqual(choisirPromotion([p], ctx, " automne10 "), { promo: p, codeInvalide: false });
  const mauvais = choisirPromotion([p], ctx, "AUTRE");
  assert.deepEqual(mauvais, { promo: null, codeInvalide: true });
});

test("code périmé ou qui ne vaut pas pour ce trajet : code invalide", () => {
  const perime = promo({ code: "VIEUX", ends_on: "2026-09-30" });
  assert.equal(choisirPromotion([perime], ctx, "VIEUX").codeInvalide, true);
  const gares = promo({ code: "GARE15", scope: "gares_aeroports", percent: 15 });
  assert.equal(choisirPromotion([gares], ctx, "GARE15").codeInvalide, true);
  assert.equal(choisirPromotion([gares], { ...ctx, arrivee: "Gare de Montargis" }, "GARE15").promo, gares);
});

test("portée : gares et aéroports (départ ou arrivée), longue distance à partir de 50 km", () => {
  const g = promo({ scope: "gares_aeroports" }), l = promo({ scope: "longue_distance" });
  assert.equal(choisirPromotion([g], ctx).promo, null);
  assert.equal(choisirPromotion([g], { ...ctx, depart: "Gare de Montargis" }).promo, g);
  assert.equal(choisirPromotion([g], { ...ctx, arrivee: "Aéroport d'Orly" }).promo, g);
  assert.equal(choisirPromotion([l], { ...ctx, km: 49.9 }).promo, null);
  assert.equal(choisirPromotion([l], { ...ctx, km: 50 }).promo, l);
});

test("la meilleure remise gagne, les remises ne s'additionnent pas", () => {
  const a = promo({ name: "A", percent: 10 }), b = promo({ name: "B", percent: 20, code: "BIG" }), c = promo({ name: "C", percent: 15 });
  assert.equal(choisirPromotion([a, b, c], ctx).promo, c); // B demande un code
  assert.equal(choisirPromotion([a, b, c], ctx, "BIG").promo, b);
});

test("remise : arrondi au centime", () => {
  assert.deepEqual(appliquerRemise(21220, 10), { prixCents: 19098, avantCents: 21220 });
  assert.deepEqual(appliquerRemise(800, 15), { prixCents: 680, avantCents: 800 });
  assert.equal(appliquerRemise(1001, 33).prixCents, 671);
});

test("validation d'une promotion saisie par le patron", () => {
  const bonne = { name: "  Automne \n 2026 ", percent: 10, scope: "all", code: " automne10 ", starts_on: "2026-10-01", ends_on: "2026-11-30" };
  assert.deepEqual(validerPromotion(bonne), { ok: true, valeurs: { name: "Automne 2026", percent: 10, scope: "all", code: "AUTOMNE10", starts_on: "2026-10-01", ends_on: "2026-11-30", active: true } });
  assert.equal(validerPromotion({ ...bonne, name: "  " }).ok, false);
  for (const percent of [0, 91, 12.5, "abc", null]) assert.equal(validerPromotion({ ...bonne, percent }).ok, false, String(percent));
  assert.equal(validerPromotion({ ...bonne, scope: "tout" }).ok, false);
  assert.equal(validerPromotion({ ...bonne, code: "a b" }).ok, false);
  assert.equal(validerPromotion({ ...bonne, code: "x" }).ok, false);
  assert.equal(validerPromotion({ ...bonne, starts_on: "2026-02-31" }).ok, false);
  assert.equal(validerPromotion({ ...bonne, starts_on: "2026-12-01", ends_on: "2026-11-01" }).ok, false);
  assert.equal(validerPromotion({ ...bonne, code: "", starts_on: "", ends_on: undefined, active: false }).valeurs.active, false);
  assert.equal(validerPromotion({ ...bonne, code: "" }).valeurs.code, null);
});
