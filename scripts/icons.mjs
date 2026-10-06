import { deflateSync } from 'node:zlib';
// Small original calendar icon, generated locally; no fonts or remote assets.
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const name = Buffer.from(type), size = Buffer.alloc(4), crc = Buffer.alloc(4); size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([size, name, data, crc]); }
export function pngIcon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const rect = (x, y, left, top, width, height, radius = 0) => { const dx = Math.max(left + radius - x, 0, x - (left + width - radius)), dy = Math.max(top + radius - y, 0, y - (top + height - radius)); return x >= left && x < left + width && y >= top && y < top + height && dx * dx + dy * dy <= radius * radius; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = x / size * 128, b = y / size * 128; let color = [23, 44, 40, 255];
    if (rect(a, b, 28, 29, 72, 70, 12)) color = [244, 245, 233, 255];
    if (rect(a, b, 28, 47, 72, 5)) color = [23, 44, 40, 255];
    if (rect(a, b, 42, 24, 8, 17, 4) || rect(a, b, 78, 24, 8, 17, 4)) color = [185, 222, 144, 255];
    if (rect(a, b, 39, 61, 20, 23, 5)) color = [82, 118, 91, 255];
    if (rect(a, b, 68, 61, 20, 10, 4)) color = [187, 137, 186, 255];
    if (rect(a, b, 68, 77, 20, 10, 4)) color = [211, 178, 77, 255];
    raw.set(color, y * (size * 4 + 1) + 1 + x * 4);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
