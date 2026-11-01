import { sha256 } from '@noble/hashes/sha2.js';

import { WORDLIST } from './wordlist';
import { SEED_LENGTH } from './seed';

const INDEX = new Map(WORDLIST.map((w, i) => [w, i]));
const ENTROPY_BITS = (SEED_LENGTH * 11 * 32) / 33;
const CHECK_BITS = SEED_LENGTH * 11 - ENTROPY_BITS;

export const checksumOk = (words: string[]): boolean => {
  if (words.length !== SEED_LENGTH) {
    return false;
  }
  let bits = '';
  for (const word of words) {
    const i = INDEX.get(word);
    if (i === undefined) {
      return false;
    }
    bits += i.toString(2).padStart(11, '0');
  }
  const entropy = new Uint8Array(ENTROPY_BITS / 8);
  for (let b = 0; b < entropy.length; b++) {
    entropy[b] = parseInt(bits.slice(b * 8, b * 8 + 8), 2);
  }
  const hash = sha256(entropy);
  const expected = hash[0].toString(2).padStart(8, '0').slice(0, CHECK_BITS);
  return bits.slice(ENTROPY_BITS) === expected;
};
