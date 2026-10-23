// Renders the empty-state chalk art to PNG, offline, so the app ships images
// instead of drawing at runtime. Same paper-tooth algorithm as ChalkText.
//
//   node prototypes/txList/art/generate.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const LOOPS = join(OUT, 'loops');
const PT = 240;
const STILL_DPR = 3;
const LOOP_DPR = 2;
const LOOP_SECONDS = 2;
const MASTER_FPS = 24;
const FPS_OPTIONS = [4, 6, 8, 12, 24];
const MAX_COLS = 8;
const INK = [0xe4, 0xe1, 0xd8];
const CANVAS = '0b0b0b';
const TAU = Math.PI * 2;

const hash = (x, y, seed) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = t => t * t * (3 - 2 * t);
const vnoise = (x, y, seed) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const smoothstep = (e0, e1, v) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
const clamp01 = v => Math.min(1, Math.max(0, v));

// Geometry in points, origin at the centre, y down.
const seg = (ax, ay, bx, by) => ({ ax, ay, bx, by });
const polyline = pts => pts.slice(1).map((p, i) => seg(...pts[i], ...p));
const closed = pts => polyline([...pts, pts[0]]);
const sample = (fn, n, t0 = 0, t1 = 1) =>
  Array.from({ length: n + 1 }, (_, i) => fn(t0 + ((t1 - t0) * i) / n));
const circle = (cx, cy, r, n = 96) =>
  closed(
    sample(
      t => [cx + r * Math.cos(t), cy + r * Math.sin(t)],
      n,
      0,
      Math.PI * 2,
    ).slice(0, -1),
  );
const rot = (x, y, a) => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
];

const segDist = (px, py, s) => {
  const vx = s.bx - s.ax;
  const vy = s.by - s.ay;
  const wx = px - s.ax;
  const wy = py - s.ay;
  const l2 = vx * vx + vy * vy || 1;
  const t = clamp01((wx * vx + wy * vy) / l2);
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  return Math.sqrt(dx * dx + dy * dy);
};

// Each shape is a function of the loop phase t in [0, 1) and returns a list
// of strokes: { segs, width (pt), strength? }. Every motion is periodic in
// t so the last frame hands off to the first.
const SHAPES = {
  ring: t => [{ segs: circle(0, 0, 72 + 5 * Math.sin(TAU * t)), width: 3 }],
  pair: t => {
    const dx = 30 + 12 * Math.sin(TAU * t);
    return [
      { segs: circle(-dx, 0, 52), width: 2.8 },
      { segs: circle(dx, 0, 52), width: 2.8 },
    ];
  },
  spiral: t => [
    {
      segs: polyline(
        sample(u => {
          const a = u * TAU * 2.6 + TAU * t;
          const r = 8 + 68 * u;
          return [r * Math.cos(a), r * Math.sin(a)];
        }, 260),
      ),
      width: 2.8,
    },
  ],
  wave: t => [
    {
      segs: polyline(
        sample(
          u => [-96 + 192 * u, 26 * Math.sin(u * Math.PI * 3 - TAU * t)],
          160,
        ),
      ),
      width: 3,
    },
    {
      segs: polyline(
        sample(
          u => [
            -96 + 192 * u,
            26 * Math.sin(u * Math.PI * 3 + 1.2 - TAU * t) + 30,
          ],
          160,
        ),
      ),
      width: 2,
    },
  ],
  dashes: t => {
    const xs = [-78, -52, -26, 0, 26, 52, 78];
    return xs.map((x, i) => {
      const h = 30 + hash(i, 3, 9) * 60 + 22 * Math.sin(TAU * t + i * 0.9);
      const y = -20 + hash(i, 7, 9) * 50;
      return { segs: [seg(x, y - h / 2, x, y + h / 2)], width: 3.2 };
    });
  },
  frame: t => {
    const a = ((10 + 90 * t) * Math.PI) / 180;
    const pts = [
      [-62, -62],
      [62, -62],
      [62, 62],
      [-62, 62],
    ].map(([x, y]) => rot(x, y, a));
    return [{ segs: closed(pts), width: 3 }];
  },
  triangle: t => {
    const pts = sample(u => {
      const a = -Math.PI / 2 + u * TAU + (TAU / 3) * t;
      return [74 * Math.cos(a), 74 * Math.sin(a) + 10];
    }, 3).slice(0, 3);
    return [{ segs: closed(pts), width: 3 }];
  },
  orbit: t => {
    const a = (-22 * Math.PI) / 180;
    const ring = closed(
      sample(
        u => rot(84 * Math.cos(u), 30 * Math.sin(u), a),
        120,
        0,
        TAU,
      ).slice(0, -1),
    );
    const [sx, sy] = rot(84 * Math.cos(TAU * t), 30 * Math.sin(TAU * t), a);
    return [
      { segs: ring, width: 2.6 },
      { segs: circle(0, 0, 14, 48), width: 14 },
      { segs: circle(sx, sy, 2, 24), width: 7 },
    ];
  },
  arcs: t =>
    [0, 1, 2].map(i => {
      const p = (i / 3 + t) % 1;
      const r = 26 + p * 58;
      return {
        segs: polyline(
          sample(
            u => [r * Math.cos(u), r * Math.sin(u)],
            80,
            Math.PI * 1.15,
            Math.PI * 1.85,
          ),
        ),
        width: 2.8,
        strength: Math.sin(Math.PI * p),
      };
    }),
  knot: t => [
    {
      segs: polyline(
        sample(u => {
          const a = u * TAU;
          return [
            82 * Math.sin(a * 2 + TAU * t),
            60 * Math.sin(a * 3 + Math.PI / 2),
          ];
        }, 400),
      ),
      width: 2.6,
    },
  ],
};

const distanceField = (segs, dpr) => {
  const SIZE = PT * dpr;
  const field = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    const py = y / dpr - PT / 2;
    for (let x = 0; x < SIZE; x++) {
      const px = x / dpr - PT / 2;
      let d = Infinity;
      for (const s of segs) {
        const v = segDist(px, py, s);
        if (v < d) {
          d = v;
        }
      }
      field[y * SIZE + x] = d;
    }
  }
  return field;
};

const coverageAt = (field, SIZE, dpr, halfWidthPx, x, y) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) {
    return 0;
  }
  const d = field[y * SIZE + x] * dpr;
  return clamp01(halfWidthPx + 0.5 - d);
};

/** One frame as RGBA rows, each prefixed with the PNG filter byte. */
const renderFrame = (strokes, seed, dpr, frame) => {
  const SIZE = PT * dpr;
  const out = new Float32Array(SIZE * SIZE);
  const cell = Math.max(dpr * 0.6, 1);
  const rough = 1.4 * dpr;
  strokes.forEach((stroke, si) => {
    const field = distanceField(stroke.segs, dpr);
    const half = (stroke.width * dpr) / 2;
    const strength = stroke.strength ?? 1;
    const layers = [
      {
        half: half * 2.6,
        pressure: 0.16 * strength,
        grain: 1.3,
        s: seed + si * 11 + 500,
      },
      { half, pressure: 0.92 * strength, grain: 1, s: seed + si * 11 },
    ];
    for (const L of layers) {
      const boil = L.s + frame * 3;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const gx = Math.floor(x / cell);
          const gy = Math.floor(y / cell);
          const fine = hash(gx, gy, L.s);
          const clump = vnoise(gx / 3.5, gy / 3.5, L.s + 7);
          const clump2 = vnoise(gx / 9, gy / 9, L.s + 100);
          const raw = clamp01(fine * 0.5 + clump * 0.35 + clump2 * 0.15);
          const tooth = 0.5 + (raw - 0.5) * L.grain;
          const ex = vnoise(gx / 2.5, gy / 2.5, boil + 50) - 0.5;
          const ey = vnoise(gx / 2.5 + 40, gy / 2.5, boil + 51) - 0.5;
          const c = coverageAt(
            field,
            SIZE,
            dpr,
            L.half,
            Math.round(x + ex * 2 * rough),
            Math.round(y + ey * 2 * rough),
          );
          if (c === 0) {
            continue;
          }
          const cCenter = coverageAt(field, SIZE, dpr, L.half, x, y);
          const core = 1 - 0.45 * (1 - cCenter);
          const deposit = L.pressure * c * core;
          const lit = smoothstep(tooth - 0.2, tooth + 0.2, deposit);
          const i = y * SIZE + x;
          out[i] = Math.max(out[i], lit);
        }
      }
    }
  });
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  let o = 0;
  for (let y = 0; y < SIZE; y++) {
    raw[o++] = 0;
    for (let x = 0; x < SIZE; x++) {
      const a = out[y * SIZE + x];
      if (a < 0.004) {
        o += 4;
        continue;
      }
      const tone = 0.9 + 0.1 * hash(x, y, seed);
      raw[o++] = INK[0] * tone;
      raw[o++] = INK[1] * tone;
      raw[o++] = INK[2] * tone;
      raw[o++] = Math.round(a * 255);
    }
  }
  return raw;
};

const renderStill = (name, make, seed) => {
  const SIZE = PT * STILL_DPR;
  writeFileSync(
    join(OUT, `${name}.png`),
    png(SIZE, SIZE, renderFrame(make(0), seed, STILL_DPR, 0)),
  );
  console.log(`${name}.png`);
};

/** Largest column count up to MAX_COLS that tiles the frames with no gap. */
const columnsFor = frames => {
  for (let c = Math.min(MAX_COLS, frames); c > 1; c--) {
    if (frames % c === 0) {
      return c;
    }
  }
  return 1;
};

/** Tiles frames into a grid sheet, row-major, cols per row. */
const sheet = (frames, SIZE, cols) => {
  const rows = frames.length / cols;
  const rowBytes = SIZE * 4 + 1;
  const outRow = cols * SIZE * 4 + 1;
  const out = Buffer.alloc(rows * SIZE * outRow);
  frames.forEach((frame, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    for (let y = 0; y < SIZE; y++) {
      const src = y * rowBytes + 1;
      const dst = (r * SIZE + y) * outRow + 1 + c * SIZE * 4;
      frame.copy(out, dst, src, src + SIZE * 4);
    }
  });
  return out;
};

const index = [];

/**
 * A loop: a 2 s cycle rendered at MASTER_FPS, then written as one grid
 * sprite sheet per playback rate by keeping every n-th frame, so the app
 * steps through the sheet at that rate and the cycle length never changes.
 * Plus an mp4 of the master frames on the canvas colour, via ffmpeg.
 */
const renderLoop = (name, make, seed) => {
  const SIZE = PT * LOOP_DPR;
  const total = LOOP_SECONDS * MASTER_FPS;
  const tmp = mkdtempSync(join(tmpdir(), `chalk-${name}-`));
  const master = [];
  for (let f = 0; f < total; f++) {
    const raw = renderFrame(make(f / total), seed, LOOP_DPR, f);
    master.push(raw);
    writeFileSync(
      join(tmp, `f${String(f).padStart(2, '0')}.png`),
      png(SIZE, SIZE, raw),
    );
  }
  mkdirSync(LOOPS, { recursive: true });
  const sheets = {};
  for (const fps of FPS_OPTIONS) {
    const step = MASTER_FPS / fps;
    const frames = master.filter((_, i) => i % step === 0);
    const cols = columnsFor(frames.length);
    const file = `${name}-${fps}.png`;
    writeFileSync(
      join(LOOPS, file),
      png(
        cols * SIZE,
        (frames.length / cols) * SIZE,
        sheet(frames, SIZE, cols),
      ),
    );
    sheets[fps] = { file, frames: frames.length, cols };
  }
  index.push({ name, sheets });
  const mp4 = join(LOOPS, `${name}.mp4`);
  const ff = spawnSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(MASTER_FPS),
    '-i',
    join(tmp, 'f%02d.png'),
    '-f',
    'lavfi',
    '-i',
    `color=c=${CANVAS}:s=${SIZE}x${SIZE}:r=${MASTER_FPS}`,
    '-filter_complex',
    '[1:v][0:v]overlay=shortest=1,format=yuv420p',
    '-c:v',
    'libx264',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    mp4,
  ]);
  const video = ff.status === 0 ? ` ${name}.mp4` : ' (ffmpeg skipped)';
  console.log(`loops/${name}-{${FPS_OPTIONS.join(',')}}.png${video}`);
};

/** The sheet map the app imports, so it never drifts from the files. */
const writeIndex = () => {
  const lines = [
    '// Generated by generate.mjs. Do not edit.',
    `export const LOOP_SECONDS = ${LOOP_SECONDS};`,
    `export const FPS_OPTIONS = [${FPS_OPTIONS.join(', ')}] as const;`,
    'export type LoopFps = (typeof FPS_OPTIONS)[number];',
    'export type Sheet = { source: number; frames: number; cols: number };',
    'export const LOOPS: Record<string, Record<LoopFps, Sheet>> = {',
  ];
  for (const { name, sheets } of index) {
    lines.push(`  ${name}: {`);
    for (const fps of FPS_OPTIONS) {
      const sh = sheets[fps];
      lines.push(
        `    ${fps}: { source: require('./${sh.file}'), frames: ${sh.frames}, cols: ${sh.cols} },`,
      );
    }
    lines.push('  },');
  }
  lines.push('};', '');
  writeFileSync(join(LOOPS, 'index.ts'), lines.join('\n'));
};

const table = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) {
    c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const png = (w, h, raw) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const only = process.argv[2];
Object.entries(SHAPES).forEach(([name, make], i) => {
  if (only && only !== name) {
    return;
  }
  const seed = 3 + i * 17;
  renderStill(name, make, seed);
  renderLoop(name, make, seed);
});
if (!only) {
  writeIndex();
}
