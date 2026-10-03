import fs from "node:fs/promises";
import { inflateSync } from "node:zlib";
import assert from "node:assert/strict";

// Chrome screenshots are non-interlaced, 8-bit RGB/RGBA PNGs. Decode with Node's
// built-ins instead of adding an image-processing dependency to the project.
async function png(path) {
  const file = await fs.readFile(path);
  let at = 8, width, height, channels;
  const compressed = [];
  while (at < file.length) {
    const size = file.readUInt32BE(at);
    const type = file.toString("ascii", at + 4, at + 8);
    const data = file.subarray(at + 8, at + 8 + size);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.ok(data[9] === 2 || data[9] === 6);
      assert.equal(data[12], 0);
      channels = data[9] === 2 ? 3 : 4;
    }
    if (type === "IDAT") compressed.push(data);
    at += size + 12;
  }
  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let offset = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++];
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const left = x >= channels ? pixels[i - channels] : 0;
      const up = y ? pixels[i - stride] : 0;
      const diagonal = y && x >= channels ? pixels[i - stride - channels] : 0;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, diagonal)][filter];
      pixels[i] = (raw[offset++] + predictor) & 255;
    }
  }
  return { width, height, channels, pixels };
}

export async function compareFrames(enhanced, fallback) {
  const a = await png(enhanced), b = await png(fallback);
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  const regions = { window: { changed: 0, max: 0, sum: 0, count: 0 },
    navigation: { changed: 0, max: 0, sum: 0, count: 0 },
    lowerContent: { changed: 0, max: 0, sum: 0, count: 0 } };
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const region = y < 70 ? regions.navigation : y > 790 ? regions.lowerContent
      : x > 600 && y > 90 && y < 500 ? regions.window : null;
    if (!region) continue;
    let difference = 0;
    for (let c = 0; c < 3; c++) difference = Math.max(difference,
      Math.abs(a.pixels[(y * a.width + x) * a.channels + c] - b.pixels[(y * b.width + x) * b.channels + c]));
    region.count++; region.sum += difference; region.max = Math.max(region.max, difference);
    if (difference >= 2) region.changed++;
  }
  return Object.fromEntries(Object.entries(regions).map(([name, r]) => [name,
    { changedPixels: r.changed, maximumChannelDifference: r.max, meanDifference: r.sum / r.count }]));
}