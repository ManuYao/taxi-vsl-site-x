// node --test lib/paris.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { parisVersUtc, dateLisibleParis, heureParis, jourParis, libelleJour } from "./paris.js";

const iso = (date, heure) => parisVersUtc(date, heure)?.toISOString();

test("été : Paris = UTC + 2", () => {
  assert.equal(iso("2026-10-14", "12:00"), "2026-10-14T10:00:00.000Z");
  assert.equal(iso("2026-07-01", "00:30"), "2026-06-30T22:30:00.000Z");
});

test("hiver : Paris = UTC + 1", () => {
  assert.equal(iso("2026-01-15", "12:00"), "2026-01-15T11:00:00.000Z");
  assert.equal(iso("2026-12-31", "23:59"), "2026-12-31T22:59:00.000Z");
});

test("passage à l'heure d'été (dimanche 29 mars 2026, 2 h -> 3 h)", () => {
  assert.equal(iso("2026-03-29", "01:30"), "2026-03-29T00:30:00.000Z"); // encore l'heure d'hiver
  assert.equal(iso("2026-03-29", "03:30"), "2026-03-29T01:30:00.000Z"); // déjà l'heure d'été
  assert.equal(iso("2026-03-29", "12:00"), "2026-03-29T10:00:00.000Z");
});

test("passage à l'heure d'hiver (dimanche 25 octobre 2026, 3 h -> 2 h)", () => {
  assert.equal(iso("2026-10-25", "01:30"), "2026-10-24T23:30:00.000Z"); // encore l'heure d'été
  assert.equal(iso("2026-10-25", "03:30"), "2026-10-25T02:30:00.000Z"); // déjà l'heure d'hiver
  assert.equal(iso("2026-10-25", "12:00"), "2026-10-25T11:00:00.000Z");
});

test("refuse les dates et heures impossibles ou mal écrites", () => {
  for (const [d, h] of [
    ["2026-02-31", "10:00"],
    ["2026-13-01", "10:00"],
    ["2026-10-14", "24:00"],
    ["2026-10-14", "10:60"],
    ["14/10/2026", "10:00"],
    ["2026-10-14", "9:00"],
    [null, "10:00"],
    ["2026-10-14", undefined],
  ]) {
    assert.equal(parisVersUtc(d, h), null, `${d} ${h}`);
  }
});

test("date lisible, en heure de Paris", () => {
  assert.equal(dateLisibleParis(parisVersUtc("2026-10-14", "14:30")), "mercredi 14 octobre à 14 h 30");
  assert.equal(dateLisibleParis(parisVersUtc("2026-01-05", "07:05")), "lundi 5 janvier à 07 h 05");
});

test("heure et jour de Paris, libellés relatifs (minuit compris)", () => {
  const nuit = parisVersUtc("2026-10-14", "23:30"); // 21:30 UTC : déjà le « 14 » à Paris, même si la machine est en UTC
  assert.equal(jourParis(nuit), "2026-10-14");
  assert.equal(heureParis(nuit), "23 h 30");
  const apresMinuit = parisVersUtc("2026-10-15", "00:15"); // 22:15 UTC la veille
  assert.equal(jourParis(apresMinuit), "2026-10-15");

  const maintenant = parisVersUtc("2026-10-14", "09:00");
  assert.equal(libelleJour(nuit, maintenant), "Aujourd'hui");
  assert.equal(libelleJour(apresMinuit, maintenant), "Demain");
  assert.equal(libelleJour(parisVersUtc("2026-10-16", "10:00"), maintenant), "Vendredi 16 octobre");
  // fin de mois et passage à l'heure d'hiver : « demain » reste correct
  assert.equal(libelleJour(parisVersUtc("2026-11-01", "08:00"), parisVersUtc("2026-10-31", "20:00")), "Demain");
  assert.equal(libelleJour(parisVersUtc("2026-10-26", "08:00"), parisVersUtc("2026-10-25", "23:00")), "Demain");
});
