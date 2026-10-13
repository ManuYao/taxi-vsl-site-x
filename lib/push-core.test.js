// node --test lib/push-core.test.js
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import net from "node:net";
import { createRequire } from "node:module";
import { envoyerVersAbonnements, preparerPayload, TTL_SECONDES, DELAI_MS } from "./push-core.js";

const CLE_P256DH = "BPPUBLICKEY_p256dh_valeur_secrete_a_ne_pas_fuiter_0123456789_abcdefghijklmnopqrstuvwxyz_ABC";
const CLE_AUTH = "auth_secret_0123456789";
const CLE_PRIVEE = "PRIVATE_vapid_key_do_not_leak";
const abo = (n) => ({ endpoint: `https://push.example.test/${n}`, p256dh: CLE_P256DH, auth: CLE_AUTH });
const payload = { titre: "Nouvelle course", texte: "Mme Martin · demain 10 h · Montargis → Orly", url: "/admin", tag: "course-1" };

// Faux web-push : le comportement dépend de l'adresse de l'abonné
function fauxWebpush(comportements = {}) {
  const appels = [];
  return {
    appels,
    sendNotification(subscription, corps, options) {
      appels.push({ subscription, corps, options });
      const f = comportements[subscription.endpoint];
      return f ? f() : Promise.resolve({ statusCode: 201 });
    },
  };
}
const erreurHttp = (statusCode) => () =>
  Promise.reject(Object.assign(new Error(`Received unexpected response code ${CLE_PRIVEE}`), { statusCode, body: CLE_PRIVEE }));

const sansCle = (resultat) => {
  const t = JSON.stringify(resultat);
  for (const secret of [CLE_P256DH, CLE_AUTH, CLE_PRIVEE]) assert.ok(!t.includes(secret), "une clé apparaît dans le résultat");
};

test("succès : tous les appareils sont joints, avec TTL court et urgence haute", async () => {
  const webpush = fauxWebpush();
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1), abo(2)], payload });
  assert.deepEqual(r, { ok: true, envoyes: 2, expires: [], echecs: 0, raisons: {} });
  assert.equal(webpush.appels.length, 2);
  const { subscription, corps, options } = webpush.appels[0];
  assert.deepEqual(subscription, { endpoint: abo(1).endpoint, keys: { p256dh: CLE_P256DH, auth: CLE_AUTH } });
  assert.deepEqual(JSON.parse(corps), payload);
  assert.equal(options.TTL, TTL_SECONDES);
  assert.equal(options.TTL, 600);
  assert.equal(options.urgency, "high");
  assert.equal(options.timeout, DELAI_MS);
  sansCle(r);
});

test("les envois partent en parallèle (pas l'un après l'autre)", async () => {
  let enCours = 0;
  let maxEnCours = 0;
  const webpush = {
    async sendNotification() {
      enCours += 1;
      maxEnCours = Math.max(maxEnCours, enCours);
      await new Promise((r) => setTimeout(r, 30));
      enCours -= 1;
      return { statusCode: 201 };
    },
  };
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1), abo(2), abo(3)], payload });
  assert.equal(r.envoyes, 3);
  assert.equal(maxEnCours, 3);
});

test("404 et 410 : l'adresse est à supprimer, ce n'est pas un échec", async () => {
  const webpush = fauxWebpush({ [abo(1).endpoint]: erreurHttp(410), [abo(2).endpoint]: erreurHttp(404) });
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1), abo(2), abo(3)], payload });
  assert.equal(r.ok, true);
  assert.equal(r.envoyes, 1);
  assert.deepEqual(r.expires.sort(), [abo(1).endpoint, abo(2).endpoint]);
  assert.equal(r.echecs, 0);
  sansCle(r);
});

test("seulement des abonnements expirés : ok est faux, mais ils sont listés", async () => {
  const webpush = fauxWebpush({ [abo(1).endpoint]: erreurHttp(410) });
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1)], payload });
  assert.equal(r.ok, false);
  assert.equal(r.envoyes, 0);
  assert.deepEqual(r.expires, [abo(1).endpoint]);
});

test("autres codes HTTP (400, 401, 429, 500) : échec compté, adresse conservée", async () => {
  const webpush = fauxWebpush({
    [abo(1).endpoint]: erreurHttp(401),
    [abo(2).endpoint]: erreurHttp(429),
    [abo(3).endpoint]: erreurHttp(500),
    [abo(4).endpoint]: erreurHttp(401),
  });
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1), abo(2), abo(3), abo(4)], payload });
  assert.equal(r.ok, false);
  assert.equal(r.echecs, 4);
  assert.deepEqual(r.expires, []);
  assert.deepEqual(r.raisons, { "HTTP 401": 2, "HTTP 429": 1, "HTTP 500": 1 });
  sansCle(r);
});

test("délai dépassé : l'envoi est abandonné, sans bloquer les autres", async () => {
  const webpush = fauxWebpush({ [abo(1).endpoint]: () => new Promise(() => {}) }); // ne répond jamais
  const debut = Date.now();
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1), abo(2)], payload, options: { delaiMs: 60 } });
  assert.ok(Date.now() - debut < 1000, "trop long");
  assert.equal(r.ok, true);
  assert.equal(r.envoyes, 1);
  assert.equal(r.echecs, 1);
  assert.deepEqual(r.raisons, { "délai dépassé": 1 });
  assert.equal(webpush.appels[0].options.timeout, 60);
});

test("après un délai dépassé, une erreur tardive ne produit pas d'erreur non gérée", async () => {
  let rejeter;
  const webpush = fauxWebpush({ [abo(1).endpoint]: () => new Promise((_, rej) => (rejeter = rej)) });
  let nonGeree = null;
  const surRejet = (e) => (nonGeree = e);
  process.on("unhandledRejection", surRejet);
  try {
    await envoyerVersAbonnements({ webpush, abonnements: [abo(1)], payload, options: { delaiMs: 20 } });
    rejeter(new Error("tardif"));
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(nonGeree, null);
  } finally {
    process.off("unhandledRejection", surRejet);
  }
});

test("coupure de socket de web-push : compté comme délai dépassé", async () => {
  const webpush = fauxWebpush({ [abo(1).endpoint]: () => Promise.reject(new Error("Socket timeout")) });
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1)], payload });
  assert.deepEqual(r.raisons, { "délai dépassé": 1 });
});

test("erreur réseau : échec compté, texte de l'erreur jamais repris", async () => {
  const webpush = fauxWebpush({
    [abo(1).endpoint]: () => Promise.reject(Object.assign(new Error(`connect ECONNREFUSED ${abo(1).endpoint} ${CLE_PRIVEE}`), { code: "ECONNREFUSED" })),
    [abo(2).endpoint]: () => {
      throw new Error(`échec synchrone ${CLE_PRIVEE}`);
    },
  });
  const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1), abo(2)], payload });
  assert.equal(r.ok, false);
  assert.equal(r.echecs, 2);
  assert.deepEqual(r.raisons, { "réseau": 1, "erreur d'envoi": 1 });
  assert.deepEqual(r.expires, []);
  sansCle(r);
});

test("aucun abonné : rien n'est envoyé, aucune erreur", async () => {
  for (const abonnements of [[], undefined, null, "n'importe quoi"]) {
    const webpush = fauxWebpush();
    const r = await envoyerVersAbonnements({ webpush, abonnements, payload });
    assert.deepEqual(r, { ok: false, envoyes: 0, expires: [], echecs: 0, raisons: {}, raison: "aucun abonné" });
    assert.equal(webpush.appels.length, 0);
  }
});

test("abonnement incomplet ou en http : compté en échec, jamais envoyé ; les doublons ne partent qu'une fois", async () => {
  const webpush = fauxWebpush();
  const r = await envoyerVersAbonnements({
    webpush,
    abonnements: [{ endpoint: "http://non-securise.test/x", p256dh: "a", auth: "b" }, { endpoint: abo(1).endpoint }, null, abo(2), abo(2)],
    payload,
  });
  assert.equal(webpush.appels.length, 1);
  assert.equal(r.envoyes, 1);
  assert.equal(r.echecs, 3);
  assert.deepEqual(r.raisons, { "abonnement invalide": 3 });
});

test("payload invalide : rien n'est envoyé", async () => {
  for (const mauvais of [undefined, null, "texte", 42, [], {}, { titre: "" }, { titre: "   " }, { texte: "sans titre" }]) {
    const webpush = fauxWebpush();
    const r = await envoyerVersAbonnements({ webpush, abonnements: [abo(1)], payload: mauvais });
    assert.equal(r.ok, false);
    assert.equal(r.envoyes, 0);
    assert.equal(r.raison, "message invalide");
    assert.equal(webpush.appels.length, 0);
  }
});

test("paramètres absents ou web-push cassé : ne lève jamais", async () => {
  assert.equal((await envoyerVersAbonnements()).ok, false);
  assert.equal((await envoyerVersAbonnements({})).ok, false);
  assert.equal((await envoyerVersAbonnements({ webpush: {}, abonnements: [abo(1)], payload })).raison, "web-push indisponible");
  const r = await envoyerVersAbonnements({ webpush: fauxWebpush(), abonnements: [abo(1)], payload, options: { delaiMs: "n'importe quoi", ttlSecondes: -5, urgence: "urgent" } });
  assert.equal(r.envoyes, 1); // options invalides : valeurs par défaut
});

test("options : TTL et urgence personnalisables", async () => {
  const webpush = fauxWebpush();
  await envoyerVersAbonnements({ webpush, abonnements: [abo(1)], payload, options: { ttlSecondes: 120, urgence: "normal" } });
  assert.equal(webpush.appels[0].options.TTL, 120);
  assert.equal(webpush.appels[0].options.urgency, "normal");
});

test("preparerPayload : nettoie, tronque, et garde l'adresse dans le site", () => {
  assert.deepEqual(preparerPayload({ titre: "T", texte: "x" }), { titre: "T", texte: "x", url: "/admin", tag: "" });
  assert.equal(preparerPayload({ titre: "T", url: "https://evil.example/x" }).url, "/admin");
  assert.equal(preparerPayload({ titre: "T", url: "//evil.example/x" }).url, "/admin");
  assert.equal(preparerPayload({ titre: "T", url: "/\\evil.example" }).url, "/admin");
  assert.equal(preparerPayload({ titre: "T", url: "javascript:alert(1)" }).url, "/admin");
  assert.equal(preparerPayload({ titre: "T", url: "/admin?course=1" }).url, "/admin?course=1");
  assert.equal(preparerPayload({ titre: "Ligne1\nLigne2‮", texte: "a\r\n\tb" }).titre, "Ligne1 Ligne2");
  assert.equal(preparerPayload({ titre: "T", texte: "a\r\n\tb" }).texte, "a b");
  const long = preparerPayload({ titre: "x".repeat(500), texte: "y".repeat(500), tag: "z".repeat(500) });
  assert.equal(Array.from(long.titre).length, 80);
  assert.equal(Array.from(long.texte).length, 240);
  assert.equal(Array.from(long.tag).length, 80);
  assert.ok(long.titre.endsWith("…"));
  // un emoji n'est pas coupé en deux
  const emojis = preparerPayload({ titre: "🚖".repeat(200) }).titre;
  assert.ok(!/[\uD800-\uDBFF]$/.test(emojis.slice(0, -1)));
  assert.equal(Array.from(emojis).length, 80);
});

test("le message envoyé tient largement dans la limite d'une notification (4 Ko)", async () => {
  const webpush = fauxWebpush();
  const enorme = { titre: "🚖".repeat(500), texte: "é".repeat(2000), url: "/" + "a".repeat(2000), tag: "t".repeat(2000) };
  await envoyerVersAbonnements({ webpush, abonnements: [abo(1)], payload: enorme });
  assert.ok(Buffer.byteLength(webpush.appels[0].corps) < 2000);
});

// ---- Avec le vrai module web-push (sans envoi sur Internet) ----
const require = createRequire(import.meta.url);
const vraiWebpush = require("web-push");

// Un vrai abonnement de navigateur : clé publique P-256 (65 octets) + secret d'authentification (16 octets)
function vraiAbonnement(endpoint) {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  return { endpoint, p256dh: ecdh.getPublicKey().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url") };
}

test("web-push accepte nos options et pose TTL 600 s et urgence haute", () => {
  const vapid = vraiWebpush.generateVAPIDKeys();
  vraiWebpush.setVapidDetails("mailto:test@example.com", vapid.publicKey, vapid.privateKey);
  const a = vraiAbonnement("https://fcm.googleapis.com/fcm/send/essai");
  const d = vraiWebpush.generateRequestDetails(
    { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
    JSON.stringify(preparerPayload(payload)),
    { TTL: TTL_SECONDES, urgency: "high", timeout: DELAI_MS },
  );
  assert.equal(d.headers.TTL, 600);
  assert.equal(d.headers.Urgency, "high");
  assert.equal(d.timeout, DELAI_MS);
  assert.match(d.headers.Authorization, /^vapid /);
  assert.equal(d.headers["Content-Encoding"], "aes128gcm");
});

test("vrai web-push, connexion refusée : échec « réseau », rien ne fuit", async () => {
  const vapid = vraiWebpush.generateVAPIDKeys();
  vraiWebpush.setVapidDetails("mailto:test@example.com", vapid.publicKey, vapid.privateKey);
  const a = vraiAbonnement("https://127.0.0.1:1/refuse");
  const r = await envoyerVersAbonnements({ webpush: vraiWebpush, abonnements: [a], payload });
  assert.equal(r.ok, false);
  assert.deepEqual(r.raisons, { "réseau": 1 });
  assert.ok(!JSON.stringify(r).includes(a.p256dh) && !JSON.stringify(r).includes(vapid.privateKey));
});

test("vrai web-push, serveur muet : coupé au délai prévu", async () => {
  const muet = net.createServer(() => {}); // accepte la connexion et ne répond jamais
  await new Promise((ok) => muet.listen(0, "127.0.0.1", ok));
  try {
    const vapid = vraiWebpush.generateVAPIDKeys();
    vraiWebpush.setVapidDetails("mailto:test@example.com", vapid.publicKey, vapid.privateKey);
    const a = vraiAbonnement(`https://127.0.0.1:${muet.address().port}/muet`);
    const debut = Date.now();
    const r = await envoyerVersAbonnements({ webpush: vraiWebpush, abonnements: [a], payload, options: { delaiMs: 200 } });
    assert.ok(Date.now() - debut < 2000);
    assert.equal(r.ok, false);
    assert.deepEqual(r.raisons, { "délai dépassé": 1 });
  } finally {
    muet.closeAllConnections?.();
    muet.close();
  }
});
