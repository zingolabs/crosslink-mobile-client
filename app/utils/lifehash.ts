import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { LifeHash, LifeHashVersion } from 'lifehash';

type Listener = (url: string) => void;

const cache = new Map<string, string>();
const listeners = new Map<string, Set<Listener>>();
const queue: string[] = [];
let draining = false;

const render = (input: string) => {
  const digest = sha256(utf8ToBytes(input));
  const img = LifeHash.makeFromDigest(
    digest,
    LifeHashVersion.version2,
    1,
    true,
  );
  return img.toDataUrl();
};

export function lifehashDataUrlFromStringSync(input: string) {
  const hit = cache.get(input);
  if (hit) {
    return hit;
  }
  const url = render(input);
  cache.set(input, url);
  return url;
}

export const lifehashCached = (input: string) => cache.get(input);

const STEP_BUDGET_MS = 6;

const step = () => {
  const started = Date.now();
  while (queue.length > 0) {
    const next = queue.shift() as string;
    const url = lifehashDataUrlFromStringSync(next);
    listeners.get(next)?.forEach(cb => cb(url));
    listeners.delete(next);
    if (Date.now() - started >= STEP_BUDGET_MS) {
      setTimeout(step, 0);
      return;
    }
  }
  draining = false;
};

const drain = () => {
  if (draining) {
    return;
  }
  draining = true;
  InteractionManager.runAfterInteractions(step);
};

const enqueue = (input: string) => {
  if (!cache.has(input) && !queue.includes(input)) {
    queue.push(input);
  }
};

export function warmLifehashes(inputs: string[]) {
  inputs.forEach(enqueue);
  if (queue.length > 0) {
    drain();
  }
}

export function useLifehash(input: string): string {
  const [url, setUrl] = useState(() => (input && cache.get(input)) || '');

  useEffect(() => {
    if (!input) {
      setUrl('');
      return;
    }
    const hit = cache.get(input);
    if (hit) {
      setUrl(hit);
      return;
    }
    const set = listeners.get(input) ?? new Set<Listener>();
    set.add(setUrl);
    listeners.set(input, set);
    queue.unshift(input);
    drain();
    return () => {
      set.delete(setUrl);
    };
  }, [input]);

  return url;
}
