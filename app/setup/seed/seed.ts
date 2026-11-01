import { WORDLIST } from './wordlist';

export const SEED_LENGTH = 24;

const WORDS = new Set<string>(WORDLIST);

export type WordState = 'empty' | 'partial' | 'valid' | 'invalid';

export type ParsedPhrase = {
  words: string[];
  birthday: string | null;
};

export const isSeedWord = (word: string): boolean => WORDS.has(word);

export const tokenize = (raw: string): string[] =>
  raw
    .toLowerCase()
    .replace(/[\n\r,;]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

export const parsePhrase = (raw: string): ParsedPhrase => {
  const tokens = tokenize(raw);
  const tail = tokens[SEED_LENGTH];
  const birthday = tail && /^\d+$/.test(tail) ? tail : null;
  return { words: tokens.slice(0, SEED_LENGTH), birthday };
};

export const suggest = (prefix: string, limit = 3): string[] => {
  if (!prefix) {
    return [];
  }
  const out: string[] = [];
  for (const word of WORDLIST) {
    if (word.startsWith(prefix)) {
      out.push(word);
      if (out.length === limit) {
        break;
      }
    }
  }
  return out;
};

export const uniqueCompletion = (prefix: string): string | null => {
  if (prefix.length < 4) {
    return null;
  }
  const matches = suggest(prefix, 2);
  return matches.length === 1 ? matches[0] : null;
};

export const exactOnly = (word: string): boolean =>
  isSeedWord(word) && suggest(word, 2).length === 1;

export const wordState = (word: string, editing = false): WordState => {
  if (!word) {
    return 'empty';
  }
  if (isSeedWord(word)) {
    return 'valid';
  }
  if (editing && suggest(word, 1).length > 0) {
    return 'partial';
  }
  return 'invalid';
};

export const isComplete = (words: string[]): boolean =>
  words.length === SEED_LENGTH && words.every(isSeedWord);

export const invalidCount = (words: string[]): number =>
  words.filter(w => w && !isSeedWord(w)).length;

export const pad2 = (index: number): string =>
  String(index + 1).padStart(2, '0');

export const cleanHeight = (raw: string): string => raw.replace(/\D+/g, '');

export const fillFrom = (
  words: string[],
  start: number,
  incoming: string[],
): string[] => {
  const next = Array.from({ length: SEED_LENGTH }, (_, i) => words[i] ?? '');
  incoming.forEach((word, i) => {
    if (start + i < SEED_LENGTH) {
      next[start + i] = word;
    }
  });
  return next;
};

export const firstEmpty = (words: string[]): number => {
  const i = words.findIndex(w => !w);
  return i === -1 ? SEED_LENGTH : i;
};
