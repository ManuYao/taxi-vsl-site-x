// Mots de passe provisoires donnés par le patron à ses collaborateurs. Sans import du projet : testable avec node.
import { randomInt } from "node:crypto";

// Sans les caractères qui se confondent (0/o, 1/l/i) : le mot de passe se recopie ou se dicte facilement par téléphone.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

// "k7mx-q3ab-n8tp" : 12 caractères tirés au hasard par le générateur sécurisé de Node (environ 59 bits)
export function genererMotDePasse() {
  const groupe = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${groupe()}-${groupe()}-${groupe()}`;
}
