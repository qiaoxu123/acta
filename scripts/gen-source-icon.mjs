// Generates Acta's 1024x1024 source icon, used as input to `tauri icon`.
// Pure Node (no image deps): vector shapes via signed-distance functions,
// 3x supersampling for clean anti-aliased edges.
//
// Motif — fits an academic deadline/review tracker:
//   Zotero-style deep-red rounded tile, a white paper/manuscript card with
//   title + text lines, and a small clock badge = deadlines.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 1024;
const SS = 3; // supersampling factor

// ---- math / SDF helpers -----------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [
  lerp(c1[0], c2[0], t),
  lerp(c1[1], c2[1], t),
  lerp(c1[2], c2[2], t),
];

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const sdCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;

// rounded bar / hand rotated by angle (deg) around (ox,oy), extending "up"
function sdHand(px, py, ox, oy, angleDeg, len, w, r) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = px - ox;
  const dy = py - oy;
  const rx = dx * Math.cos(a) + dy * Math.sin(a);
  const ry = -dx * Math.sin(a) + dy * Math.cos(a);
  return sdRoundRect(rx, ry + len / 2, 0, 0, w / 2, len / 2, r);
}

// ---- palette ----------------------------------------------------------------
const TOP = [198, 58, 48];
const BOT = [143, 30, 23]; // Zotero-ish deep red
const ACCENT = [179, 38, 30];
const WHITE = [255, 255, 255];
const GRAY = [205, 209, 216];

// straight-alpha "over" compositing; layers return [r,g,b,a]
function over(dst, src) {
  const a = src[3];
  if (a <= 0) return dst;
  const oa = a + dst[3] * (1 - a);
  if (oa <= 0) return [0, 0, 0, 0];
  return [
    (src[0] * a + dst[0] * dst[3] * (1 - a)) / oa,
    (src[1] * a + dst[1] * dst[3] * (1 - a)) / oa,
    (src[2] * a + dst[2] * dst[3] * (1 - a)) / oa,
    oa,
  ];
}
const inside = (sd) => (sd < 0 ? 1 : 0);

// card geometry
const CX = 512;
const cardCx = 512,
  cardCy = 478;
const hw = 262,
  hh = 312,
  cardR = 36;
const pad = 52;
const innerW = 2 * hw - 2 * pad;
const left = cardCx - hw + pad;

// clock badge
const bx = cardCx + hw * 0.66;
const by = cardCy + hh * 0.74;
const clockR = 128;

function render(px, py) {
  let c = [0, 0, 0, 0];

  // 1. background rounded tile with vertical gradient
  const bg = sdRoundRect(px, py, CX, CX, 512, 512, 228);
  if (bg < 0) {
    const t = clamp(py / SIZE, 0, 1);
    // subtle diagonal sheen toward top-left
    const sheen = clamp(1 - (px + py) / (SIZE * 1.7), 0, 1) * 0.10;
    const base = mix(TOP, BOT, t);
    c = over(c, [
      clamp(base[0] + sheen * 255, 0, 255),
      clamp(base[1] + sheen * 255, 0, 255),
      clamp(base[2] + sheen * 255, 0, 255),
      1,
    ]);
  }

  // 2. soft drop shadow under the card
  const sh = sdRoundRect(px, py, cardCx + 10, cardCy + 20, hw, hh, cardR);
  c = over(c, [0, 0, 0, inside(sh) * 0.18]);

  // 3. white manuscript card
  const card = sdRoundRect(px, py, cardCx, cardCy, hw, hh, cardR);
  c = over(c, [...WHITE, inside(card)]);

  // 4. title + text lines on the card
  if (card < 0) {
    const barH = 30,
      r = 9;
    const bars = [
      { y: cardCy - hh + 96, w: innerW * 0.82, col: ACCENT, h: 38 },
      { y: cardCy - hh + 180, w: innerW * 0.95, col: GRAY, h: barH },
      { y: cardCy - hh + 238, w: innerW * 0.88, col: GRAY, h: barH },
      { y: cardCy - hh + 296, w: innerW * 0.62, col: GRAY, h: barH },
    ];
    for (const b of bars) {
      const sd = sdRoundRect(px, py, left + b.w / 2, b.y, b.w / 2, b.h / 2, r);
      c = over(c, [...b.col, inside(sd)]);
    }
  }

  // 5. clock badge (deadline)
  const ring = sdCircle(px, py, bx, by, clockR);
  c = over(c, [...WHITE, inside(ring)]); // white outer ring
  const face = sdCircle(px, py, bx, by, clockR - 18);
  c = over(c, [...ACCENT, inside(face)]); // accent face
  // hands (~10:10) + center dot, white
  const hHour = sdHand(px, py, bx, by, -52, 62, 18, 9);
  const hMin = sdHand(px, py, bx, by, 64, 88, 14, 7);
  const dot = sdCircle(px, py, bx, by, 13);
  const hands = Math.min(hHour, hMin, dot);
  c = over(c, [...WHITE, inside(hands)]);

  return c;
}

// ---- rasterize with supersampling ------------------------------------------
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
const n = SS * SS;
for (let fy = 0; fy < SIZE; fy++) {
  raw[p++] = 0; // PNG filter byte
  for (let fx = 0; fx < SIZE; fx++) {
    let sr = 0,
      sg = 0,
      sb = 0,
      sa = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const [r, g, b, a] = render(fx + (sx + 0.5) / SS, fy + (sy + 0.5) / SS);
        sr += r * a;
        sg += g * a;
        sb += b * a;
        sa += a;
      }
    }
    const a = sa / n;
    raw[p++] = sa > 0 ? Math.round(sr / sa) : 0;
    raw[p++] = sa > 0 ? Math.round(sg / sa) : 0;
    raw[p++] = sa > 0 ? Math.round(sb / sa) : 0;
    raw[p++] = Math.round(a * 255);
  }
}

// ---- PNG encode -------------------------------------------------------------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(new URL("./app-icon.png", import.meta.url), png);
console.log("wrote scripts/app-icon.png");
