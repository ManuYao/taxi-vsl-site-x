// node --test lib/niveaux.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { niveauxAttribuables, peutChangerNiveau, peutGerer, roleDuNiveau } from "./niveaux.js";

const patron = { id: "p", niveau: 2 };
const manager = { id: "m", niveau: 1 };
const manager2 = { id: "m2", niveau: 1 };
const chauffeur = { id: "c", niveau: 0 };

test("on gère seulement un niveau strictement inférieur", () => {
  assert.equal(peutGerer(patron, manager), true);
  assert.equal(peutGerer(patron, chauffeur), true);
  assert.equal(peutGerer(manager, chauffeur), true);
  assert.equal(peutGerer(manager, manager2), false);
  assert.equal(peutGerer(manager, patron), false);
  assert.equal(peutGerer(chauffeur, chauffeur), false);
});

test("personne ne se gère soi-même, le patron est intouchable", () => {
  assert.equal(peutGerer(patron, patron), false);
  assert.equal(peutGerer(manager, { id: "m", niveau: 0 }), false);
  assert.equal(peutGerer(manager, patron), false);
});

test("niveaux attribuables et changement de niveau", () => {
  assert.deepEqual(niveauxAttribuables(2), [0, 1]);
  assert.deepEqual(niveauxAttribuables(1), [0]);
  assert.deepEqual(niveauxAttribuables(0), []);
  assert.equal(peutChangerNiveau(patron, manager), true);
  assert.equal(peutChangerNiveau(manager, chauffeur), false);
});

test("compatibilité avec l'ancien rôle", () => {
  assert.equal(roleDuNiveau(2), "patron");
  assert.equal(roleDuNiveau(1), "chauffeur");
  assert.equal(roleDuNiveau(0), "chauffeur");
});
