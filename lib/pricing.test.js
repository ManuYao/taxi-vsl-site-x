// Tests du prix estimé (lib/pricing.js) et du calcul de distance (lib/routing.js, ORS simulé).
// Lancer : node --test lib/pricing.test.js
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { REGLE_NUIT, calculerPrix, choisirTarif, libelleDuree, lireDate, lireHeure } from "./pricing.js";
import { itineraire, itineraireApproximatif, kmVolDOiseau, viderCache } from "./routing.js";

// Le site affiche dureeLisible(minutes) (lib/dates.js) : on vérifie plus bas que libelleDuree écrit la même chose.
// Import facultatif, pour ne pas casser ces tests si ce fichier change.
const dates = await import("./dates.js").catch(() => null);

// Mêmes valeurs que site.config.js à la création (fictives, à confirmer avec le client).
// Copiées ici pour que les tests ne bougent pas quand le client donnera ses vrais tarifs.
const TARIFS = { priseEnCharge: 4, kmJour: 2, kmNuit: 2.5, minimum: 8 };

// Jours de référence (jour de la semaine vérifié avec .NET, indépendamment du code testé)
const MARDI = "2026-10-13";
const SAMEDI = "2026-10-17";
const DIMANCHE = "2026-10-18";
const LUNDI = "2026-10-19";

describe("lireDate", () => {
  it("donne le jour de la semaine (0 = dimanche)", () => {
    assert.equal(lireDate(MARDI).jourSemaine, 2);
    assert.equal(lireDate(SAMEDI).jourSemaine, 6);
    assert.equal(lireDate(DIMANCHE).jourSemaine, 0);
    assert.equal(lireDate(LUNDI).jourSemaine, 1);
    assert.equal(lireDate("2024-02-29").jourSemaine, 4); // année bissextile
    assert.equal(lireDate("2000-01-01").jourSemaine, 6);
    assert.deepEqual(lireDate("2026-10-13"), { annee: 2026, mois: 10, jour: 13, jourSemaine: 2 });
  });

  it("ne dépend pas du fuseau horaire du serveur", () => {
    const avant = process.env.TZ;
    try {
      // À Los Angeles, new Date("2026-10-18").getDay() donnerait samedi (6) : le calcul doit rester en UTC.
      for (const tz of ["UTC", "Europe/Paris", "America/Los_Angeles", "Pacific/Kiritimati"]) {
        process.env.TZ = tz;
        assert.equal(lireDate(DIMANCHE).jourSemaine, 0, tz);
        assert.equal(choisirTarif(DIMANCHE, "12:00"), "nuit", tz);
        assert.equal(choisirTarif(MARDI, "12:00"), "jour", tz);
        assert.equal(choisirTarif(MARDI, "19:00"), "nuit", tz);
      }
    } finally {
      if (avant === undefined) delete process.env.TZ;
      else process.env.TZ = avant;
    }
  });

  it("refuse ce qui n'est pas une vraie date du calendrier", () => {
    const faux = [
      "2026-02-31", "2025-02-29", "2026-13-01", "2026-00-10", "2026-10-00", "2026-10-32",
      "26-10-13", "2026-1-3", "2026/10/13", "2026-10-13T10:00", " 2026-10-13", "2026-10-13 ", "0050-01-01",
      "", null, undefined, 20261013, {},
    ];
    for (const f of faux) assert.equal(lireDate(f), null, String(f));
  });
});

describe("lireHeure", () => {
  it("lit HH:MM", () => {
    assert.deepEqual(lireHeure("07:05"), { heures: 7, minutes: 5 });
    assert.deepEqual(lireHeure("00:00"), { heures: 0, minutes: 0 });
    assert.deepEqual(lireHeure("23:59"), { heures: 23, minutes: 59 });
  });

  it("refuse les autres formats", () => {
    const faux = ["24:00", "7:00", "07:60", "07:00:00", "0700", "07h00", "07:5", " 07:00", "", null, undefined, 700];
    for (const f of faux) assert.equal(lireHeure(f), null, String(f));
  });
});

describe("choisirTarif", () => {
  it("jour ou nuit autour de 7 h et de 19 h", () => {
    const cas = [
      ["00:00", "nuit"],
      ["06:59", "nuit"],
      ["07:00", "jour"],
      ["12:00", "jour"],
      ["18:59", "jour"],
      ["19:00", "nuit"],
      ["23:59", "nuit"],
    ];
    for (const [heure, attendu] of cas) assert.equal(choisirTarif(MARDI, heure), attendu, heure);
  });

  it("dimanche : tarif de nuit toute la journée", () => {
    for (const heure of ["00:00", "07:00", "12:00", "18:59", "19:00"]) {
      assert.equal(choisirTarif(DIMANCHE, heure), "nuit", heure);
    }
  });

  it("samedi et lundi restent au tarif de jour en journée", () => {
    assert.equal(choisirTarif(SAMEDI, "12:00"), "jour");
    assert.equal(choisirTarif(LUNDI, "07:00"), "jour");
    assert.equal(choisirTarif(LUNDI, "06:59"), "nuit");
  });

  it("le changement d'heure ne change rien (dimanches du 29 mars et du 25 octobre 2026)", () => {
    assert.equal(choisirTarif("2026-03-28", "12:00"), "jour");
    assert.equal(choisirTarif("2026-03-29", "12:00"), "nuit");
    assert.equal(choisirTarif("2026-03-30", "12:00"), "jour");
    assert.equal(choisirTarif("2026-10-24", "12:00"), "jour");
    assert.equal(choisirTarif("2026-10-25", "12:00"), "nuit");
    assert.equal(choisirTarif("2026-10-26", "12:00"), "jour");
  });

  it("la règle se change facilement", () => {
    assert.equal(choisirTarif(DIMANCHE, "12:00", { ...REGLE_NUIT, dimanche: false }), "jour");
    const regle = { avant: 6, apres: 20, dimanche: false };
    assert.equal(choisirTarif(MARDI, "05:59", regle), "nuit");
    assert.equal(choisirTarif(MARDI, "06:00", regle), "jour");
    assert.equal(choisirTarif(MARDI, "19:30", regle), "jour");
    assert.equal(choisirTarif(MARDI, "20:00", regle), "nuit");
  });

  it("la règle actuelle est celle du CLAUDE.md, et elle est figée", () => {
    assert.deepEqual(REGLE_NUIT, { avant: 7, apres: 19, dimanche: true });
    assert.throws(() => {
      REGLE_NUIT.avant = 6;
    }, TypeError);
  });

  it("refuse une date ou une heure invalide", () => {
    assert.throws(() => choisirTarif("2026-02-31", "12:00"), RangeError);
    assert.throws(() => choisirTarif(MARDI, "25:00"), RangeError);
    assert.throws(() => choisirTarif(undefined, "12:00"), RangeError);
  });
});

describe("libelleDuree", () => {
  it("écrit la durée en toutes lettres courtes, arrondie à 5 minutes", () => {
    assert.equal(libelleDuree(40), "40 min");
    assert.equal(libelleDuree(95), "1 h 35");
    assert.equal(libelleDuree(120), "2 h");
    assert.equal(libelleDuree(62), "1 h"); // 62 -> 60
    assert.equal(libelleDuree(63), "1 h 05"); // 63 -> 65
    assert.equal(libelleDuree(94), "1 h 35"); // 94 -> 95
    assert.equal(libelleDuree(0), "5 min"); // jamais moins de 5 minutes
    assert.equal(libelleDuree(2), "5 min");
  });

  it("renvoie null quand la durée est inconnue", () => {
    for (const v of [undefined, null, NaN, -1, Infinity, "40"]) assert.equal(libelleDuree(v), null, String(v));
  });

  const ignorer = !dates?.dureeLisible && "dureeLisible absente";
  it("donne le même texte que dureeLisible de lib/dates.js", { skip: ignorer }, () => {
    for (const m of [0, 3, 40, 62, 63, 94, 95, 120, 134, 600]) {
      assert.equal(libelleDuree(m), dates.dureeLisible(m), String(m));
    }
  });
});

describe("calculerPrix", () => {
  const base = { date: MARDI, heure: "12:00", tarifs: TARIFS };

  it("exemple de la maquette : 107 km de jour = 218 €", () => {
    assert.deepEqual(calculerPrix({ ...base, km: 107, minutes: 94 }), {
      prixCents: 21800,
      prix: 218,
      tarif: "jour",
      duree: "1 h 35",
    });
  });

  it("applique le minimum sur une très courte course", () => {
    for (const km of [0, 0.1, 0.5, 1.9, 2]) {
      const r = calculerPrix({ ...base, km });
      assert.equal(r.prixCents, 800, `${km} km`); // 4 € + 2 €/km reste à 8 € ou moins : on facture le minimum
      assert.equal(r.prix, 8);
    }
    assert.equal(calculerPrix({ ...base, km: 2.1 }).prixCents, 820); // 4 + 4,20 : au-dessus du minimum
  });

  it("le minimum vaut aussi la nuit", () => {
    const nuit = { ...base, heure: "22:00" };
    assert.equal(calculerPrix({ ...nuit, km: 1.5 }).prixCents, 800); // 4 + 3,75 = 7,75
    assert.equal(calculerPrix({ ...nuit, km: 1.6 }).prixCents, 800); // 4 + 4,00
    assert.equal(calculerPrix({ ...nuit, km: 1.7 }).prixCents, 825); // 4 + 4,25
  });

  it("la nuit coûte plus cher au km, la prise en charge reste la même", () => {
    const jour = calculerPrix({ ...base, km: 107 });
    const nuit = calculerPrix({ ...base, heure: "19:00", km: 107 });
    assert.equal(jour.tarif, "jour");
    assert.equal(nuit.tarif, "nuit");
    assert.equal(nuit.prixCents, 27150); // 4 + 107 × 2,50 = 271,50
    assert.equal(nuit.prix, 272); // 271,50 arrondi à l'euro (vers le haut)
    assert.equal(calculerPrix({ ...base, heure: "06:59", km: 107 }).prixCents, 27150);
    assert.equal(calculerPrix({ ...base, heure: "07:00", km: 107 }).prixCents, 21800);
    assert.equal(calculerPrix({ ...base, heure: "18:59", km: 107 }).prixCents, 21800);
  });

  it("le dimanche suit le tarif de nuit, même à midi", () => {
    const r = calculerPrix({ ...base, date: DIMANCHE, km: 107 });
    assert.equal(r.tarif, "nuit");
    assert.equal(r.prixCents, 27150);
    assert.equal(calculerPrix({ ...base, date: SAMEDI, km: 107 }).prixCents, 21800);
    assert.equal(calculerPrix({ ...base, date: LUNDI, km: 107 }).prixCents, 21800);
  });

  it("avec un arrêt : km = départ→arrêt + arrêt→arrivée", () => {
    const depart = 12.3; // départ → arrêt
    const arrivee = 8.1; // arrêt → arrivée
    const avecArret = calculerPrix({ ...base, km: depart + arrivee });
    assert.equal(avecArret.prixCents, 4480); // 4 + 20,4 × 2 = 44,80
    assert.equal(avecArret.prix, 45);
    assert.deepEqual(avecArret, calculerPrix({ ...base, km: 20.4 }));
    // Le détour coûte plus cher qu'un trajet direct de la même longueur de base
    assert.ok(avecArret.prixCents > calculerPrix({ ...base, km: depart }).prixCents);
  });

  it("calcule en centimes entiers, sans erreur de flottant", () => {
    // 0,29 × 100 = 28,999999999999996 et 1,15 × 100 = 114,99999999999999 en flottants
    const t = { priseEnCharge: 0.29, kmJour: 1.15, kmNuit: 1.15, minimum: 0 };
    assert.equal(calculerPrix({ ...base, tarifs: t, km: 1 }).prixCents, 144); // 29 + 115
    assert.equal(calculerPrix({ ...base, tarifs: { ...t, priseEnCharge: 4.35, kmJour: 0 }, km: 5 }).prixCents, 435);
    // 0,1 + 0,2 vaut 0,30000000000000004 en flottants
    assert.equal(calculerPrix({ ...base, km: 0.1 + 0.2 + 10 }).prixCents, calculerPrix({ ...base, km: 10.3 }).prixCents);
    // Quel que soit le trajet, le prix en centimes est un entier et `prix` est le même prix arrondi à l'euro
    for (let dixiemes = 0; dixiemes <= 2000; dixiemes++) {
      for (const heure of ["12:00", "22:00"]) {
        const r = calculerPrix({ ...base, heure, km: dixiemes / 10 });
        assert.ok(Number.isInteger(r.prixCents), `${dixiemes / 10} km`);
        assert.equal(r.prix, Math.round(r.prixCents / 100), `${dixiemes / 10} km`);
      }
    }
  });

  it("arrondit le prix affiché à l'euro, la moitié vers le haut", () => {
    const t = { priseEnCharge: 0.5, kmJour: 1, kmNuit: 1, minimum: 0 };
    const prix = (km) => calculerPrix({ ...base, tarifs: t, km });
    assert.equal(prix(218).prixCents, 21850);
    assert.equal(prix(218).prix, 219); // 218,50 -> 219
    assert.equal(prix(217.9).prix, 218); // 218,40 -> 218
    assert.equal(prix(218.1).prix, 219); // 218,60 -> 219
    assert.equal(prix(217.9).prixCents, 21840); // le prix exact en centimes reste précis
  });

  it("prend la distance au dixième de km", () => {
    assert.equal(calculerPrix({ ...base, km: 107.04 }).prixCents, calculerPrix({ ...base, km: 107 }).prixCents);
    assert.equal(calculerPrix({ ...base, km: 107.06 }).prixCents, 21820); // 107,1 km : 4 + 214,20
    assert.equal(calculerPrix({ ...base, km: 106.9 }).prixCents, 21780);
  });

  it("le libellé de durée est facultatif", () => {
    assert.equal(calculerPrix({ ...base, km: 10 }).duree, null);
    assert.equal(calculerPrix({ ...base, km: 10, minutes: 25 }).duree, "25 min");
  });

  it("ne modifie pas les tarifs reçus et ignore les champs en plus (ex. `confirmes`)", () => {
    const tarifs = Object.freeze({ ...TARIFS, confirmes: false });
    assert.equal(calculerPrix({ ...base, tarifs, km: 107 }).prixCents, 21800);
  });

  it("refuse les entrées invalides au lieu de renvoyer NaN", () => {
    for (const km of [-1, NaN, Infinity, "107", undefined, null]) {
      assert.throws(() => calculerPrix({ ...base, km }), RangeError, String(km));
    }
    assert.throws(() => calculerPrix({ ...base, tarifs: undefined, km: 10 }), RangeError);
    assert.throws(() => calculerPrix({ ...base, tarifs: { ...TARIFS, kmNuit: undefined }, km: 10 }), RangeError);
    assert.throws(() => calculerPrix({ ...base, tarifs: { ...TARIFS, minimum: -8 }, km: 10 }), RangeError);
    assert.throws(() => calculerPrix({ ...base, tarifs: { ...TARIFS, kmJour: "2" }, km: 10 }), RangeError);
    assert.throws(() => calculerPrix({ ...base, date: "2026-02-31", km: 10 }), RangeError);
    assert.throws(() => calculerPrix({ ...base, heure: "24:00", km: 10 }), RangeError);
  });
});

// --- Distance et durée (lib/routing.js) : OpenRouteService est simulé, aucun appel réseau ---

const MONTARGIS = { lat: 47.997, lon: 2.733 };
const AMILLY = { lat: 47.975, lon: 2.77 };
const ORLY = { lat: 48.726, lon: 2.365 };

describe("kmVolDOiseau", () => {
  it("donne les bonnes distances", () => {
    assert.equal(kmVolDOiseau(MONTARGIS, MONTARGIS), 0);
    // Valeurs de référence calculées à part, avec la loi des cosinus
    assert.ok(Math.abs(kmVolDOiseau(MONTARGIS, ORLY) - 85.5) < 0.1);
    const paris = { lat: 48.8566, lon: 2.3522 };
    const lyon = { lat: 45.764, lon: 4.8357 };
    assert.ok(Math.abs(kmVolDOiseau(paris, lyon) - 391.5) < 0.5);
    assert.equal(kmVolDOiseau(MONTARGIS, ORLY), kmVolDOiseau(ORLY, MONTARGIS));
  });
});

describe("itineraireApproximatif", () => {
  it("Montargis → Orly : environ 107 km et 218 €, comme la maquette", () => {
    const r = itineraireApproximatif([MONTARGIS, ORLY]);
    assert.deepEqual(r, { km: 106.9, minutes: 94, approximatif: true });
    const prix = calculerPrix({ km: r.km, minutes: r.minutes, date: MARDI, heure: "08:30", tarifs: TARIFS });
    assert.equal(prix.prixCents, 21780);
    assert.equal(prix.prix, 218);
    assert.equal(prix.duree, "1 h 35"); // « 107 km · environ 1 h 35 » dans la maquette
  });

  it("avec un arrêt : départ→arrêt + arrêt→arrivée, donc plus long que le trajet direct", () => {
    const direct = itineraireApproximatif([MONTARGIS, ORLY]);
    const avecArret = itineraireApproximatif([MONTARGIS, AMILLY, ORLY]);
    const somme = kmVolDOiseau(MONTARGIS, AMILLY) * 1.25 + kmVolDOiseau(AMILLY, ORLY) * 1.25;
    assert.equal(avecArret.km, Math.round(somme * 10) / 10);
    assert.equal(avecArret.km, 115.5); // valeur de référence calculée à part : 4,6 + 110,9 km
    assert.ok(avecArret.km > direct.km);
    assert.ok(avecArret.minutes > direct.minutes);
    const p = (r) => calculerPrix({ km: r.km, date: MARDI, heure: "12:00", tarifs: TARIFS }).prixCents;
    assert.ok(p(avecArret) > p(direct));
  });

  it("petit trajet : durée plus lente au km (45 km/h) et 5 minutes de départ", () => {
    assert.deepEqual(itineraireApproximatif([MONTARGIS, AMILLY]), { km: 4.6, minutes: 11, approximatif: true });
  });

  it("deux points identiques : 0 km, 5 minutes", () => {
    assert.deepEqual(itineraireApproximatif([MONTARGIS, MONTARGIS]), { km: 0, minutes: 5, approximatif: true });
  });
});

describe("itineraire (OpenRouteService simulé)", () => {
  const PARCOURS = [MONTARGIS, ORLY];
  const reponseOrs = (distance, duration) => Response.json({ routes: [{ summary: { distance, duration } }] });
  const simulerFetch = (t, impl) => t.mock.method(globalThis, "fetch", impl);
  const taire = (t) => t.mock.method(console, "warn", () => {});

  beforeEach(() => viderCache());

  it("sans clé : estimation à vol d'oiseau, sans aucun appel réseau", async (t) => {
    taire(t);
    const f = simulerFetch(t, async () => {
      throw new Error("ne doit pas être appelé");
    });
    const r = await itineraire(PARCOURS, { cle: "" });
    assert.deepEqual(r, itineraireApproximatif(PARCOURS));
    assert.equal(r.approximatif, true);
    assert.equal(f.mock.callCount(), 0);
  });

  it("avec une clé : appelle ORS (longitude d'abord) et lit la distance et la durée", async (t) => {
    const f = simulerFetch(t, async () => reponseOrs(107345.2, 4812.6));
    const r = await itineraire(PARCOURS, { cle: "cle-de-test" });
    assert.deepEqual(r, { km: 107.3, minutes: 80, approximatif: false });

    assert.equal(f.mock.callCount(), 1);
    const [url, init] = f.mock.calls[0].arguments;
    assert.equal(url, "https://api.openrouteservice.org/v2/directions/driving-car/json");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "cle-de-test"); // la clé telle quelle, sans « Bearer »
    assert.equal(init.headers["Content-Type"], "application/json");
    assert.ok(init.signal instanceof AbortSignal); // délai maximum
    const corps = JSON.parse(init.body);
    assert.deepEqual(corps.coordinates, [[2.733, 47.997], [2.365, 48.726]]); // [lon, lat]
    assert.equal(corps.instructions, false);
    assert.equal(corps.geometry, false);
  });

  it("avec un arrêt : trois points dans l'ordre départ, arrêt, arrivée", async (t) => {
    const f = simulerFetch(t, async () => reponseOrs(115000, 6000));
    const r = await itineraire([MONTARGIS, AMILLY, ORLY], { cle: "k" });
    assert.deepEqual(r, { km: 115, minutes: 100, approximatif: false });
    const corps = JSON.parse(f.mock.calls[0].arguments[1].body);
    assert.deepEqual(corps.coordinates, [[2.733, 47.997], [2.77, 47.975], [2.365, 48.726]]);
  });

  it("lit la clé dans ORS_API_KEY quand aucune clé n'est donnée", async (t) => {
    const avant = process.env.ORS_API_KEY;
    t.after(() => {
      if (avant === undefined) delete process.env.ORS_API_KEY;
      else process.env.ORS_API_KEY = avant;
    });
    process.env.ORS_API_KEY = "cle-env";
    const f = simulerFetch(t, async () => reponseOrs(5000, 420));
    const r = await itineraire(PARCOURS);
    assert.equal(r.approximatif, false);
    assert.equal(f.mock.calls[0].arguments[1].headers.Authorization, "cle-env");
  });

  it("repli à vol d'oiseau si ORS échoue, sans jamais écrire la clé dans les journaux", async (t) => {
    const warn = taire(t);
    const echecs = {
      "quota du jour (403)": async () => new Response("{}", { status: 403 }),
      "quota de la minute (429)": async () => new Response("{}", { status: 429 }),
      "point introuvable (404)": async () => new Response("{}", { status: 404 }),
      "panne (500)": async () => new Response("oups", { status: 500 }),
      "erreur HTTP même si le corps ressemble à un succès": async () =>
        Response.json({ routes: [{ summary: { distance: 1000, duration: 60 } }] }, { status: 403 }),
      "réseau coupé": async () => {
        throw new TypeError("fetch failed");
      },
      "réponse qui n'est pas du JSON": async () => new Response("<html>", { status: 200 }),
      "pas d'itinéraire": async () => Response.json({ routes: [] }),
      "distance illisible": async () => Response.json({ routes: [{ summary: { distance: "107", duration: 10 } }] }),
    };
    let echec;
    simulerFetch(t, (...args) => echec(...args));
    for (const [nom, impl] of Object.entries(echecs)) {
      viderCache();
      echec = impl;
      assert.deepEqual(await itineraire(PARCOURS, { cle: "cle-secrete" }), itineraireApproximatif(PARCOURS), nom);
    }
    for (const appel of warn.mock.calls) assert.ok(!appel.arguments.join(" ").includes("cle-secrete"));
  });

  it("repli si ORS ne répond pas dans le délai", async (t) => {
    taire(t);
    // un serveur qui ne répond jamais : la requête ne se termine que si le signal d'annulation se déclenche
    simulerFetch(t, (url, init) => new Promise((_, rejeter) => {
      init.signal.addEventListener("abort", () => rejeter(init.signal.reason));
    }));
    const debut = Date.now();
    const r = await itineraire(PARCOURS, { cle: "k", delaiMs: 25 });
    assert.equal(r.approximatif, true);
    assert.ok(Date.now() - debut < 2000);
  });

  it("le cache évite de redemander la même route, mais pas une route approximative", async (t) => {
    taire(t);
    const f = simulerFetch(t, async () => reponseOrs(107000, 4800));
    await itineraire(PARCOURS, { cle: "k" });
    const encore = await itineraire(PARCOURS, { cle: "k" });
    assert.equal(f.mock.callCount(), 1);
    assert.equal(encore.approximatif, false);
    await itineraire([ORLY, MONTARGIS], { cle: "k" }); // autre sens : autre route
    assert.equal(f.mock.callCount(), 2);

    // Un échec n'est pas mis en cache : la demande suivante retente ORS
    viderCache();
    const g = simulerFetch(t, async () => new Response("{}", { status: 500 }));
    assert.equal((await itineraire(PARCOURS, { cle: "k" })).approximatif, true);
    assert.equal((await itineraire(PARCOURS, { cle: "k" })).approximatif, true);
    assert.equal(g.mock.callCount(), 2);
  });

  it("le cache reste borné : au-delà de 200 trajets, le plus ancien est oublié", async (t) => {
    const f = simulerFetch(t, async () => reponseOrs(10000, 600));
    const trajet = (i) => [{ lat: 47 + i / 1000, lon: 2.7 }, ORLY];
    for (let i = 0; i < 201; i++) await itineraire(trajet(i), { cle: "k" });
    assert.equal(f.mock.callCount(), 201);
    await itineraire(trajet(200), { cle: "k" }); // le plus récent est encore en mémoire
    assert.equal(f.mock.callCount(), 201);
    await itineraire(trajet(0), { cle: "k" }); // le plus ancien a été retiré : nouvel appel
    assert.equal(f.mock.callCount(), 202);
  });

  it("le cache expire au bout d'une heure", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: 0 });
    const f = simulerFetch(t, async () => reponseOrs(107000, 4800));
    await itineraire(PARCOURS, { cle: "k" });
    t.mock.timers.tick(59 * 60 * 1000);
    await itineraire(PARCOURS, { cle: "k" });
    assert.equal(f.mock.callCount(), 1);
    t.mock.timers.tick(2 * 60 * 1000);
    await itineraire(PARCOURS, { cle: "k" });
    assert.equal(f.mock.callCount(), 2);
  });

  it("refuse un nombre de points ou des coordonnées invalides", async () => {
    await assert.rejects(itineraire([MONTARGIS], { cle: "" }), RangeError);
    await assert.rejects(itineraire([MONTARGIS, AMILLY, ORLY, MONTARGIS], { cle: "" }), RangeError);
    await assert.rejects(itineraire(undefined, { cle: "" }), RangeError);
    await assert.rejects(itineraire([MONTARGIS, { lat: NaN, lon: 2 }], { cle: "" }), RangeError);
    await assert.rejects(itineraire([MONTARGIS, { lat: 95, lon: 2 }], { cle: "" }), RangeError);
    await assert.rejects(itineraire([MONTARGIS, { lat: "48", lon: "2" }], { cle: "" }), RangeError);
  });
});
