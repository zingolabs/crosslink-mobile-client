/**
 * @format
 */

import fs from 'fs';
import path from 'path';

import fakeRpc from '../app/RPCModule/fakeRpc';

const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'app');
const FAKE_RPC = path.join(APP_DIR, 'RPCModule', 'fakeRpc.ts');
const KOTLIN = path.join(
  ROOT,
  'android/app/src/main/java/org/ZingoLabs/ZingoDelegator/RPCModule.kt',
);
const OBJC = path.join(ROOT, 'ios/RPCModuleBridge.m');

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const collect = (source: string, re: RegExp): Set<string> => {
  const names = new Set<string>();
  for (const match of source.matchAll(re)) {
    names.add(match[1]);
  }
  return names;
};

const jsCalls = (): Set<string> => {
  const names = new Set<string>();
  for (const file of walk(APP_DIR)) {
    if (file === FAKE_RPC) {
      continue;
    }
    const source = fs.readFileSync(file, 'utf8');
    for (const name of collect(source, /\bRPCModule\.([A-Za-z_$][\w$]*)\(/g)) {
      names.add(name);
    }
  }
  return names;
};

const androidMethods = (): Set<string> =>
  collect(
    fs.readFileSync(KOTLIN, 'utf8'),
    /@ReactMethod(?:\([^)]*\))?\s+(?:[\w\s]*\s)?fun\s+([A-Za-z_][\w]*)\s*\(/g,
  );

const iosMethods = (): Set<string> =>
  collect(
    fs.readFileSync(OBJC, 'utf8'),
    /RCT_EXTERN_METHOD\(\s*([A-Za-z_][\w]*)/g,
  );

const missingFrom = (
  called: Set<string>,
  provided: Set<string>,
): string[] => [...called].filter(name => !provided.has(name)).sort();

describe('RPCModule bridge parity', () => {
  const called = jsCalls();

  test('JS calls at least one bridge method', () => {
    expect(called.size).toBeGreaterThan(0);
  });

  test('Android exports every method JS calls', () => {
    expect(missingFrom(called, androidMethods())).toEqual([]);
  });

  test('iOS exports every method JS calls', () => {
    expect(missingFrom(called, iosMethods())).toEqual([]);
  });

  test('fakeRpc exposes every method JS calls', () => {
    const exposed = new Set(
      Object.keys(fakeRpc).filter(
        key => typeof (fakeRpc as Record<string, unknown>)[key] === 'function',
      ),
    );
    expect(missingFrom(called, exposed)).toEqual([]);
  });
});
