import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { browserPage, sleep } from "./browser-cdp.mjs";
import { initialBundle } from "./phase6-bundle.mjs";

const out = "verification/phase6";
// Never overwrite the accepted baseline with an uncommitted candidate whose
// HEAD still names the old checkpoint.
execFileSync("git", ["diff", "--quiet", "aa59ec5", "--", "client", "package.json", "package-lock.json", "attached_assets"]);
await fs.mkdir(out, { recursive: true });
const page = await browserPage();
try {
  await page.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.navigate();
  await page.until("document.querySelector('.vanta-hero-image')?.complete && Number(getComputedStyle(document.querySelector('[data-testid=\"text-hero-title\"]')).opacity) === 1");
  await sleep(1200);
  const composition = await page.evaluate(`(() => {
    const selectors=['.vanta-hero-depth','.vanta-hero-image','[data-testid="text-hero-title"]','[data-testid="text-hero-subtitle"]'];
    return Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);
      return [s,{x:r.x,y:r.y,width:r.width,height:r.height,font:c.font,objectFit:c.objectFit,objectPosition:c.objectPosition,text:e.tagName==='IMG'?null:e.textContent?.trim()}]}));
  })()`);
  await page.screenshot(`${out}/desktop-baseline-css.png`);
  const baseline = { checkpoint: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    bundle: await initialBundle(), composition, exceptions: page.exceptions };
  await fs.writeFile(`${out}/baseline.json`, JSON.stringify(baseline, null, 2));
  console.log(JSON.stringify(baseline, null, 2));
} finally { await page.close(); }