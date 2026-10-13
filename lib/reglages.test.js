// node --test lib/reglages.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { fusionnerTarifs, lireMontant, validerTarifs } from "./reglages.js";

const parDefaut = { confirmes: false, priseEnCharge: 4, kmJour: 2, kmNuit: 2.5, minimum: 8 };

test("montants : virgule ou point, arrondi au centime, le reste refusé", () => {
  assert.equal(lireMontant("2,5"), 2.5);
  assert.equal(lireMontant(" 2.50 "), 2.5);
  assert.equal(lireMontant(3), 3);
  assert.equal(lireMontant("1,999"), 2);
  for (const mauvais of ["", "abc", "-1", "1e3", "2,5,1", null, undefined, NaN, Infinity, "12345"]) assert.equal(lireMontant(mauvais), null, String(mauvais));
});

test("tarifs valides acceptés (chiffres écrits à la française)", () => {
  const r = validerTarifs({ priseEnCharge: "3,50", kmJour: "1,85", kmNuit: "2,40", minimum: "9" });
  assert.deepEqual(r, { ok: true, tarifs: { priseEnCharge: 3.5, kmJour: 1.85, kmNuit: 2.4, minimum: 9 } });
});

test("tarifs refusés avec un message précis", () => {
  assert.match(validerTarifs({ priseEnCharge: "x", kmJour: 1, kmNuit: 2, minimum: 8 }).erreur, /prise en charge/);
  assert.match(validerTarifs({ priseEnCharge: 3, kmJour: 1, kmNuit: 2 }).erreur, /minimum/);
  assert.match(validerTarifs({ priseEnCharge: 3, kmJour: 99, kmNuit: 100, minimum: 8 }).erreur, /beaucoup trop élevé/);
  assert.match(validerTarifs({ priseEnCharge: 3, kmJour: 2.5, kmNuit: 2, minimum: 8 }).erreur, /nuit/);
  assert.equal(validerTarifs(null).ok, false);
});

test("fusion : sans réglage valide on garde ceux du site ; avec, ils sont confirmés", () => {
  assert.deepEqual(fusionnerTarifs(parDefaut, null), parDefaut);
  assert.deepEqual(fusionnerTarifs(parDefaut, { priseEnCharge: "pas un nombre" }), parDefaut);
  assert.deepEqual(fusionnerTarifs(parDefaut, { priseEnCharge: 3, kmJour: 1.5, kmNuit: 2, minimum: 7 }), { priseEnCharge: 3, kmJour: 1.5, kmNuit: 2, minimum: 7, confirmes: true });
});
