// node --test lib/communes.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { distanceLisible, kmRoute, slugCommune, trouverCommune, voisines } from "./communes.js";

const communes = [
  { nom: "Montargis", lat: 47.9983, lon: 2.7354 },
  { nom: "Amilly", lat: 47.979, lon: 2.7843 },
  { nom: "Châlette-sur-Loing", lat: 48.0191, lon: 2.7205 },
  { nom: "Saint-Germain-des-Prés", lat: 47.9671, lon: 2.8362 },
  { nom: "Ladon", lat: 48.0076, lon: 2.5296 },
];

test("adresses : sans accents, sans apostrophes, tirets propres", () => {
  assert.equal(slugCommune("Châlette-sur-Loing"), "chalette-sur-loing");
  assert.equal(slugCommune("Saint-Germain-des-Prés"), "saint-germain-des-pres");
  assert.equal(slugCommune("Ferrières-en-Gâtinais"), "ferrieres-en-gatinais");
  assert.equal(slugCommune("L'Étang  Neuf"), "letang-neuf");
  assert.equal(slugCommune("  Amilly  "), "amilly");
});

test("chaque commune a une adresse unique et retrouvable", () => {
  const slugs = communes.map((c) => slugCommune(c.nom));
  assert.equal(new Set(slugs).size, communes.length);
  assert.equal(trouverCommune(communes, "chalette-sur-loing").nom, "Châlette-sur-Loing");
  assert.equal(trouverCommune(communes, "inconnue"), null);
  assert.equal(trouverCommune(communes, "Amilly"), null); // la majuscule n'est pas une adresse valide
});

test("distances par la route : ordre de grandeur réaliste", () => {
  const km = kmRoute(communes[0], communes[1]); // Montargis → Amilly
  assert.ok(km > 4 && km < 9, String(km));
  assert.equal(kmRoute(communes[0], communes[0]), 0);
});

test("distance lisible", () => {
  assert.equal(distanceLisible(0.4), "à moins de 2 km");
  assert.equal(distanceLisible(7.4), "à 7 km");
  assert.equal(distanceLisible(23), "à environ 25 km");
});

test("communes voisines : les plus proches d'abord, sans la commune elle-même", () => {
  const v = voisines(communes, communes[0], 3);
  assert.equal(v.length, 3);
  assert.equal(v.some((c) => c.nom === "Montargis"), false);
  assert.deepEqual(v.map((c) => c.nom), ["Châlette-sur-Loing", "Amilly", "Saint-Germain-des-Prés"]);
  assert.ok(v[0].km <= v[1].km && v[1].km <= v[2].km);
});
