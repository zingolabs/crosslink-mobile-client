// Crop the top N rows of a PNG (8-bit RGBA, standard row filters).
// Usage: node scripts/crop-png.mjs <in.png> <out.png> <rows>
import { inflateSync, deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const table = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[n] = c >>> 0;
}
const crc32 = b => {
  let c = 0xffffffff;
  for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8);
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

const [inPath, outPath, rowsArg] = process.argv.slice(2);
const png = readFileSync(inPath);

// Walk chunks.
let pos = 8;
let width = 0;
let height = 0;
const idat = [];
while (pos < png.length) {
  const len = png.readUInt32BE(pos);
  const type = png.toString('ascii', pos + 4, pos + 8);
  const data = png.subarray(pos + 8, pos + 8 + len);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    if (data[8] !== 8 || data[9] !== 6) {
      throw new Error(`expected 8-bit RGBA, got bitDepth=${data[8]} colorType=${data[9]}`);
    }
  } else if (type === 'IDAT') {
    idat.push(data);
  } else if (type === 'IEND') {
    break;
  }
  pos += 12 + len;
}

const stride = width * 4;
const raw = inflateSync(Buffer.concat(idat));
const keep = Math.min(parseInt(rowsArg, 10), height);
const out = Buffer.alloc(keep * (stride + 1));

const unfilterRow = (row, prev) => {
  const ft = row[0];
  for (let x = 1; x <= stride; x += 1) {
    const a = x > 4 ? row[x - 4] : 0;
    const b = prev ? prev[x] : 0;
    const c = prev && x > 4 ? prev[x - 4] : 0;
    let v = row[x];
    if (ft === 1) v += a;
    else if (ft === 2) v += b;
    else if (ft === 3) v += (a + b) >> 1;
    else if (ft === 4) {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
    row[x] = v & 0xff;
  }
};

let src = 0;
let prev = null;
for (let y = 0; y < keep; y += 1) {
  const row = raw.subarray(src, src + stride + 1);
  unfilterRow(row, prev);
  // Store decoded pixels with filter type 0.
  out[y * (stride + 1)] = 0;
  row.subarray(1).copy(out, y * (stride + 1) + 1);
  prev = row;
  src += stride + 1;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(keep, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const outPng = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(out, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(outPath, outPng);
console.log(`${outPath} ${width}x${keep}`);
