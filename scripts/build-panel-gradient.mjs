// Generates assets/images/panel-gradient.png: a pre-rendered, dithered
// vertical gradient used by SummaryPanel on Android.
//
// Why: Android's gradient shader (and CSS experimental_backgroundImage)
// bands badly on dark, low-contrast ramps. A tiny PNG with per-row error
// diffusion (fractional channel carry) stretches smoothly instead.
// Ported from zingolabs/0xramp-reference-app scripts/build-panel-gradient.mts.
//
// Usage: node scripts/build-panel-gradient.mjs
// Reads bgSurface -> bgChrome from app/theme/tokens.ts.
import { deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = resolve(SCRIPT_DIR, '..');
const TOKENS = join(REPO_DIR, 'app', 'theme', 'tokens.ts');
const OUT = join(REPO_DIR, 'assets', 'images', 'panel-gradient.png');

const WIDTH = 4;
const HEIGHT = 1024;

const table = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) {
    c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function parseHex(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function render(from, to, out) {
  const start = parseHex(from);
  const end = parseHex(to);
  const raw = Buffer.alloc(HEIGHT * (WIDTH * 3 + 1));
  const carry = [0, 0, 0];
  let offset = 0;

  for (let y = 0; y < HEIGHT; y += 1) {
    const t = HEIGHT === 1 ? 0 : y / (HEIGHT - 1);
    raw[offset] = 0;
    offset += 1;
    const row = [0, 0, 0];
    for (let channel = 0; channel < 3; channel += 1) {
      const exact =
        start[channel] + (end[channel] - start[channel]) * t + carry[channel];
      const quantized = Math.min(255, Math.max(0, Math.round(exact)));
      carry[channel] = exact - quantized;
      row[channel] = quantized;
    }
    for (let x = 0; x < WIDTH; x += 1) {
      raw[offset] = row[0];
      raw[offset + 1] = row[1];
      raw[offset + 2] = row[2];
      offset += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  writeFileSync(out, png);
  console.log(`${out} ${WIDTH}x${HEIGHT} ${png.length} bytes`);
}

function tokenColor(name) {
  const match = new RegExp(`${name}:\\s*'(#[0-9A-Fa-f]{6})'`).exec(tokens);
  if (!match) {
    throw new Error(`no ${name} token in app/theme/tokens.ts`);
  }
  return match[1];
}

const tokens = readFileSync(TOKENS, 'utf8');
render(tokenColor('bgSurface'), tokenColor('bgChrome'), OUT);
