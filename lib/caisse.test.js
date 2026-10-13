// node --test lib/caisse.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { centimesEnTexte, construireCsv, csvCellule, joursPrecedents, resumerCaisse, validerPaiement } from "./caisse.js";
import { parisVersUtc } from "./paris.js";

const iso = (jour, heure) => parisVersUtc(jour, heure).toISOString();
const p = (mode, euros, jour, heure = "12:00", status = "paid") => ({ mode, amount_cents: euros * 100, status, paid_at: status === "paid" ? iso(jour, heure) : null });
const maintenant = parisVersUtc("2026-10-14", "15:00");

test("jours précédents : fin de mois, changement d'heure", () => {
  assert.deepEqual(joursPrecedents("2026-10-14", 3), ["2026-10-12", "2026-10-13", "2026-10-14"]);
  assert.deepEqual(joursPrecedents("2026-11-02", 4), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  assert.equal(joursPrecedents("2026-10-26", 7)[0], "2026-10-20"); // passe par le 25 octobre (heure d'hiver)
});

test("résumé : aujourd'hui, par mode, mois, 7 jours, tiers payant en attente", () => {
  const paiements = [
    p("especes", 20, "2026-10-14"),
    p("carte", 35, "2026-10-14", "09:00"),
    p("especes", 10, "2026-10-13"),
    p("virement", 100, "2026-10-02"),
    p("carte", 50, "2026-09-30"), // mois précédent
    p("tiers_payant", 80, null, "00:00", "pending"),
    p("tiers_payant", 40, "2026-10-12", "10:00"), // tiers payant déjà reçu
  ];
  const r = resumerCaisse(paiements, maintenant);
  assert.equal(r.aujourdhui.total, 5500);
  assert.equal(r.aujourdhui.nombre, 2);
  assert.deepEqual(r.aujourdhui.parMode, { especes: 2000, carte: 3500, tiers_payant: 0, virement: 0 });
  assert.equal(r.mois.total, 5500 + 1000 + 10000 + 4000);
  assert.deepEqual(r.enAttente, { total: 8000, nombre: 1 });
  assert.equal(r.sept.length, 7);
  assert.equal(r.sept[6].jour, "2026-10-14");
  assert.equal(r.sept[6].total, 5500);
  assert.equal(r.sept.find((j) => j.jour === "2026-10-13").total, 1000);
  assert.equal(r.sept.find((j) => j.jour === "2026-10-12").total, 4000);
});

test("minuit à Paris : un paiement à 23 h 50 compte pour la veille, à 00 h 10 pour le lendemain", () => {
  const soir = p("especes", 10, "2026-10-14", "23:50");
  const nuit = p("especes", 7, "2026-10-15", "00:10");
  const le14 = resumerCaisse([soir, nuit], parisVersUtc("2026-10-14", "23:55"));
  assert.equal(le14.aujourdhui.total, 1000);
  const le15 = resumerCaisse([soir, nuit], parisVersUtc("2026-10-15", "08:00"));
  assert.equal(le15.aujourdhui.total, 700);
});

test("caisse vide", () => {
  const r = resumerCaisse([], maintenant);
  assert.equal(r.aujourdhui.total, 0);
  assert.equal(r.sept.every((j) => j.total === 0), true);
});

test("validation d'un paiement", () => {
  const id = "3f1b1c3e-5b57-4a53-9b0e-0d9a7a1c1a11";
  assert.deepEqual(validerPaiement({ bookingId: id, mode: "carte", montant: "25,50" }), { ok: true, valeurs: { bookingId: id, mode: "carte", amountCents: 2550 } });
  assert.equal(validerPaiement({ bookingId: id, mode: "carte", montant: 212 }).valeurs.amountCents, 21200);
  for (const mauvais of [{ montant: "" }, { montant: "0" }, { montant: "-5" }, { montant: "abc" }, { montant: "99999" }, { montant: "3001" }, { mode: "cheque" }, { bookingId: "x" }]) {
    assert.equal(validerPaiement({ bookingId: id, mode: "carte", montant: "20", ...mauvais }).ok, false, JSON.stringify(mauvais));
  }
});

test("montants en texte pour le CSV", () => {
  assert.equal(centimesEnTexte(21220), "212,20");
  assert.equal(centimesEnTexte(5), "0,05");
});

test("CSV : séparateur point-virgule, guillemets, retours à la ligne et formules neutralisés, BOM", () => {
  assert.equal(csvCellule("Martin"), "Martin");
  assert.equal(csvCellule("a;b"), '"a;b"');
  assert.equal(csvCellule('il a dit "oui"'), '"il a dit ""oui"""');
  assert.equal(csvCellule("ligne1\nligne2"), "ligne1 ligne2");
  assert.equal(csvCellule("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.equal(csvCellule("+33612345678"), "'+33612345678");
  assert.equal(csvCellule("@SUM(1)"), "'@SUM(1)");
  assert.equal(csvCellule(null), "");
  const csv = construireCsv(["Client", "Montant"], [["Mme Martin", "25,50"], ["=1+1", "10,00"]]);
  assert.equal(csv, "﻿Client;Montant\r\nMme Martin;25,50\r\n'=1+1;10,00\r\n");
});
