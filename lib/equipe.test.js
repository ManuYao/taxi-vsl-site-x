// node --test lib/equipe.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { genererMotDePasse } from "./equipe.js";

test("mot de passe provisoire : trois groupes de quatre caractères faciles à recopier", () => {
  for (let i = 0; i < 200; i++) {
    const mdp = genererMotDePasse();
    assert.match(mdp, /^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/);
    assert.equal(/[0o1li]/.test(mdp), false, mdp);
  }
});

test("mot de passe provisoire : tiré au hasard (pas de doublon sur 1000 tirages)", () => {
  const tirages = new Set(Array.from({ length: 1000 }, () => genererMotDePasse()));
  assert.equal(tirages.size, 1000);
});
