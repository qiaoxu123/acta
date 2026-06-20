// Generates a 1024x1024 source PNG (rounded red square with an "A") used as the
// input to `tauri icon`. Pure Node — no image libraries. Run once; the real
// icon set is produced by `npx tauri icon`.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 1024;
const RADIUS = 180;
const BG = [179, 38, 30]; // accent red
const FG = [255, 255, 255];

// Simple 5x7 bitmap for the letter "A".
const A = [
  "01110",
  "10001",
  "10001",
  "11111",
  "10001",
  "10001",
  "10001",
];

function inLetter(x, y) {
  const gw = SIZE * 0.5,
    gh = SIZE * 0.6;
  const ox = (SIZE - gw) / 2,
    oy = (SIZE - gh) / 2;
  if (x < ox || x >= ox + gw || y < oy || y >= oy + gh) return false;
  const cx = Math.floor(((x - ox) / gw) * 5);
  const cy = Math.floor(((y - oy) / gh) * 7);
  return A[cy]?.[cx] === "1";
}

function inRounded(x, y) {
  const r = RADIUS;
  const corners = [
    [r, r],
    [SIZE - r, r],
    [r, SIZE - r],
    [SIZE - r, SIZE - r],
  ];
  if ((x < r || x > SIZE - r) && (y < r || y > SIZE - r)) {
    return corners.some(
      ([cx, cy]) =>
        x >= Math.min(cx, r) - 1 &&
        Math.hypot(x - cx, y - cy) <= r &&
        ((x < r || x > SIZE - r) && (y < r || y > SIZE - r)),
    );
  }
  return true;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // filter type 0
  for (let x = 0; x < SIZE; x++) {
    const opaque = inRounded(x, y);
    const letter = inLetter(x, y);
    const [r, g, b] = letter ? FG : BG;
    raw[p++] = r;
    raw[p++] = g;
    raw[p++] = b;
    raw[p++] = opaque ? 255 : 0;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(new URL("./app-icon.png", import.meta.url), png);
console.log("wrote scripts/app-icon.png");
