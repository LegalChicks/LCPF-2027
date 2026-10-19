import fs from 'node:fs';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  // Uncompressed RGBA data with filter byte 0 at start of each row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // CRC32 calculation
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);

    return Buffer.concat([lenBuf, combined, crcBuf]);
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Non-interlaced
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

// Generate PWA icons with deep forest green background and warm gold farm emblem
function drawFarmIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = (x - cx) / (w / 2);
  const dy = (y - cy) / (h / 2);
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (isMaskable) {
    // Full bleed forest green gradient
    const bgG = Math.round(58 + (1 - dy) * 15);
    if (dist < 0.6) {
      // Golden egg / chick silhouette in safe zone
      const eggDist = Math.sqrt(dx * dx * 1.5 + (dy - 0.05) * (dy - 0.05) * 1.0);
      if (eggDist < 0.35) {
        return [245, 158, 11, 255]; // Amber Gold
      }
      return [16, 185, 129, 255]; // Emerald
    }
    return [6, bgG, 44, 255];
  } else {
    // Rounded shield / emblem
    if (dist > 0.95) {
      return [0, 0, 0, 0]; // Transparent outside
    }
    if (dist > 0.88) {
      return [217, 119, 6, 255]; // Amber rim
    }
    if (dist > 0.82) {
      return [254, 243, 199, 255]; // Pale cream ring
    }
    // Deep forest green center
    const eggDist = Math.sqrt(dx * dx * 1.4 + (dy + 0.05) * (dy + 0.05));
    if (eggDist < 0.45) {
      // Warm amber gold egg shape
      return [245, 158, 11, 255];
    }
    return [6, 78, 59, 255]; // Forest green #064e3b
  }
}

fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192, (x, y, w, h) => drawFarmIcon(x, y, w, h, false)));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512, (x, y, w, h) => drawFarmIcon(x, y, w, h, false)));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, (x, y, w, h) => drawFarmIcon(x, y, w, h, true)));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180, (x, y, w, h) => drawFarmIcon(x, y, w, h, false)));
console.log('PWA icons successfully generated in ./public');
