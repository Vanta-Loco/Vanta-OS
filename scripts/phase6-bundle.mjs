import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

/** Includes static JS imports, not just the entry filename, so splitting cannot hide startup cost. */
export async function initialBundle() {
  const root = "dist/public";
  const html = await fs.readFile(`${root}/index.html`, "utf8");
  const entries = [...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map(m => m[1]);
  const seen = new Map();
  async function visit(url) {
    if (seen.has(url)) return;
    const file = await fs.readFile(`${root}${url}`);
    seen.set(url, { file: url, bytes: file.length, gzip: gzipSync(file).length });
    const imports = [...file.toString().matchAll(/\b(?:import|export)\s*(?:[^;()]*?\bfrom\s*)?["'](\.[^"']+\.js)["']/g)];
    for (const m of imports) await visit(path.posix.normalize(`${path.posix.dirname(url)}/${m[1]}`));
  }
  for (const url of entries) await visit(url);
  const files = [...seen.values()];
  return { files, bytes: files.reduce((s, f) => s + f.bytes, 0), gzip: files.reduce((s, f) => s + f.gzip, 0) };
}