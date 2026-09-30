/**
 * Sinh icon PWA từ code, không phụ thuộc thư viện ảnh.
 *
 * Vẽ thẳng ra pixel rồi đóng gói PNG bằng `zlib` có sẵn trong Node — repo không có
 * sharp/canvas, và thêm một dependency ảnh chỉ để tạo 3 file tĩnh là không đáng.
 * Chạy lại: `node scripts/make-icons.mjs`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');
const BRAND = [232, 93, 31]; // #e85d1f — khớp theme-color trong index.html
const WHITE = [255, 255, 255];

const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Phủ màu `src` lên `dst` với độ phủ `a` (0..1) — dùng để khử răng cưa viền. */
const blend = (dst, src, a) => lerp(dst, src, Math.max(0, Math.min(1, a)));

/** Khoảng cách có dấu tới hình chữ nhật bo góc, âm = bên trong. */
function sdRoundRect(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r);
  const qy = Math.abs(py - cy) - (halfH - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * Một icon: nền bo góc màu brand + tô cơm trắng (nửa đĩa + vành + hơi bốc lên).
 * `pad` là lề an toàn cho icon maskable (hệ điều hành có thể cắt tròn mép).
 */
function draw(size, pad = 0) {
  const px = new Uint8Array(size * size * 4);
  const inner = size - pad * 2;
  const c = size / 2;
  const bowlR = inner * 0.3;
  const bowlCy = c + inner * 0.06;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = x + 0.5;
      const sy = y + 0.5;
      let color = [250, 250, 250];
      let alpha = 0;

      // Nền brand bo góc
      const dBg = sdRoundRect(sx, sy, c, c, inner / 2, inner / 2, inner * 0.22);
      if (dBg < 1) {
        alpha = Math.min(1, 1 - dBg);
        color = BRAND;
      }
      if (alpha > 0) {
        // Tô cơm: nửa dưới hình tròn
        const dr = Math.hypot(sx - c, sy - bowlCy);
        if (sy >= bowlCy && dr <= bowlR + 1) {
          color = blend(color, WHITE, bowlR + 1 - dr);
        }
        // Vành tô: thanh ngang mảnh ngay trên miệng tô
        const rimH = inner * 0.035;
        const rimW = bowlR * 1.24;
        const dRim = sdRoundRect(sx, sy, c, bowlCy - rimH * 1.4, rimW, rimH, rimH);
        if (dRim < 1) color = blend(color, WHITE, 1 - dRim);

        // Ba luồng hơi bốc lên, cao thấp khác nhau cho đỡ cứng
        for (const [ox, h] of [
          [-bowlR * 0.45, 0.16],
          [0, 0.22],
          [bowlR * 0.45, 0.16],
        ]) {
          const w = inner * 0.022;
          const dSteam = sdRoundRect(sx, sy, c + ox, bowlCy - inner * (h / 2) - inner * 0.11, w, inner * (h / 2), w);
          if (dSteam < 1) color = blend(color, WHITE, (1 - dSteam) * 0.85);
        }
      }

      const i = (y * size + x) * 4;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = Math.round(alpha * 255);
    }
  }
  return px;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function toPng(px, size) {
  // Mỗi hàng PNG bắt đầu bằng một byte filter; 0 = None.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // truecolour + alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size, pad] of [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  // Maskable: lề ~10% mỗi bên để hệ điều hành cắt tròn không ăn vào hình.
  ['icon-maskable-512.png', 512, 52],
  ['apple-touch-icon.png', 180, 0],
]) {
  const file = `${OUT}/${name}`;
  writeFileSync(file, toPng(draw(size, pad), size));
  console.log('wrote', file);
}
