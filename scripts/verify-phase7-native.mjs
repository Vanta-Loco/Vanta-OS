import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { nativeBrowser, sleep } from "./browser-native.mjs";
import { observeHandoff } from "./verify-transmission-handoff.mjs";

const engine = process.argv[2];
assert.ok(["firefox", "webkit"].includes(engine));
const out = `verification/phase7/${engine}`;
await fs.mkdir(out, { recursive: true });
const origin = process.env.PHASE7_NATIVE_ORIGIN || "http://127.0.0.1:5000";
const p = await nativeBrowser(engine);
const results = { engine, capabilities: p.capabilities, origin, cases: [], exceptions: [], limitations: [] };
const host = "document.querySelector('.vanta-studio-atmosphere')";
if (p.preload) {
  await p.preload(`window.__phase7Errors=[];
    addEventListener('error',e=>window.__phase7Errors.push(String(e.error||e.message)));
    addEventListener('unhandledrejection',e=>window.__phase7Errors.push(String(e.reason)));`);
}
const observe = () => p.execute(`(${observeHandoff})();window.__phase7Errors=[];
  addEventListener('error',e=>window.__phase7Errors.push(String(e.error||e.message)));
  addEventListener('unhandledrejection',e=>window.__phase7Errors.push(String(e.reason)));`);
async function viewport(width, height) {
  await p.rect({ width, height });
  const size = await p.evaluate("({width:innerWidth,height:innerHeight})");
  await p.rect({ width: width + width - size.width, height: height + height - size.height });
  await sleep(150);
  return p.evaluate("({width:innerWidth,height:innerHeight})");
}
async function home() {
  await p.navigate(`${origin}/`);
  await p.execute(`sessionStorage.setItem('vc-boot','1');sessionStorage.setItem('vc-intro','1');
    localStorage.setItem('vanta-skip-os-boot','true');localStorage.setItem('theme','dark');`);
  // Use the native navigation command, not an asynchronous location.reload()
  // that can let a predicate match the previous document before replacement.
  await p.navigate(`${origin}/`);
  await p.until("!!document.querySelector('.vanta-environment-root')");
  await observe();
  await p.execute("window.scrollTo(0,0)");
  await p.until("document.querySelector('.vanta-hero-image')?.complete && document.querySelector('.vanta-hero-image').naturalWidth>0");
  await p.until("Number(getComputedStyle(document.querySelector('[data-testid=\"text-hero-title\"]')).opacity)>=.99");
  await sleep(500);
}
async function visible() {
  await p.until(`[...document.querySelectorAll('.vanta-scene-reveal[data-scene-revealed="true"] [data-scene-stage]')]
    .filter(e=>!e.closest('.vanta-signal-echo')).every(e=>Number(getComputedStyle(e).opacity)>=.99)`);
  const metrics = await p.evaluate(`({width:innerWidth,overflow:document.documentElement.scrollWidth,
    fine:matchMedia('(pointer:fine)').matches,coarse:matchMedia('(any-pointer:coarse)').matches,
    reduced:matchMedia('(prefers-reduced-motion:reduce)').matches})`);
  assert.ok(metrics.overflow <= metrics.width, JSON.stringify(metrics));
  return metrics;
}
async function transmission(name) {
  await p.execute(`window.__handoffRetry=false;(${observeHandoff})();
    document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'});`);
  await p.until("window.__handoff.windows.some(w=>w.closed)");
  await visible();
  const ledger = await p.evaluate("window.__handoff");
  assert.deepEqual(ledger.observerErrors, []);
  for (const w of ledger.windows) {
    assert.equal(w.echoes.length, 2);
    for (const echo of w.echoes) {
      const progress = w.progress.filter(e => e.name === echo.name);
      assert.equal(echo.initialTime, 0);
      assert.equal(echo.duration, 155);
      assert.equal(echo.playState, "paused");
      assert.equal(echo.titleOpacity, 0);
      assert.ok(echo.scoped && echo.count === 1 && echo.global !== "true");
      assert.equal(progress.at(-1).time, 155);
      assert.ok(progress.every((e, i) => e.time >= 0 && e.time <= 155 && (!i || e.time >= progress[i - 1].time)));
    }
  }
  const intermediate = ledger.windows.flatMap(w => w.progress).filter(e => e.time > 0 && e.time < 155);
  const visibleIntermediate = intermediate.filter(e => e.opacity > .03 && e.ancestorOpacity > .1 && e.inViewport);
  // Very early intermediate writes can still be zero because of authored steps.
  if (intermediate.some(e => e.time >= 40 && e.time <= 120)) {
    assert.ok(visibleIntermediate.length, "Delivered middle frames must expose a visible local echo");
  }
  await p.screenshot(`${out}/${name}-transmission.png`);
  await p.execute(`(${observeHandoff})();document.querySelector('[data-scene-media-lock] a').click();`);
  await p.until("location.pathname.startsWith('/post/') && !!document.querySelector('.vanta-post-scene')");
  await p.until("window.__handoff.windows.some(w=>w.closed)");
  await visible();
  const article = await p.evaluate("window.__handoff");
  assert.ok(article.windows.every(w => w.echoes.every(e => w.progress.filter(p => p.name === e.name).at(-1).time === 155)));
  await p.execute("history.back()");
  await p.until("location.pathname==='/' && !!document.querySelector('[data-scene-media-lock]')");
  await p.execute("history.forward()");
  await p.until("location.pathname.startsWith('/post/') && !!document.querySelector('.vanta-post-scene')");
  await visible();
  return { ledger, article, intermediateWrites: intermediate.length, visibleIntermediateWrites: visibleIntermediate.length,
    backForward: "passed", overflow: "passed" };
}
async function nativeInputs() {
  const image = "document.querySelector('.vanta-hero-image')";
  const before = await p.evaluate(`${image}.getBoundingClientRect().toJSON()`);
  await p.actions([{ type: "pointer", id: "mouse", parameters: { pointerType: "mouse" },
    actions: [{ type: "pointerMove", duration: 0, origin: "viewport", x: 1140, y: 220 }] }]);
  await sleep(300);
  const after = await p.evaluate(`${image}.getBoundingClientRect().toJSON()`);
  for (const key of ["x", "y", "width", "height"]) assert.ok(Math.abs(before[key] - after[key]) < .1, "Native mouse input never tilts/translates the studio image");
  await p.actions([{ type: "key", id: "keyboard", actions: [{ type: "keyDown", value: "\uE004" }, { type: "keyUp", value: "\uE004" }] }]);
  assert.equal(await p.evaluate(`${host}.contains(document.activeElement)`), false);
  let wheel = "native";
  try {
    await p.actions([{ type: "wheel", id: "wheel", actions: [{ type: "scroll", origin: "viewport",
      duration: 100, x: 1100, y: 400, deltaX: 0, deltaY: 220 }] }]);
  } catch (error) {
    wheel = "unavailable";
    results.limitations.push(`Native wheel automation unavailable: ${error.message}`);
    await p.execute("window.scrollBy(0,220)");
  }
  await p.until("scrollY>20");
  const energy = await p.evaluate("Number(document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-energy'))");
  assert.ok(energy >= 0 && energy <= 1);
  await p.execute("window.scrollTo(0,0)");
  await p.until("document.querySelector('.vanta-environment-root').dataset.vantaScrollState==='calm'", 15000);
  return { name: "native-mouse-keyboard-scroll", imageGeometryUnchanged: true, decorativeCanvasNeverFocused: true, wheel, energy, passed: true };
}
try {
  await viewport(1280, 900);
  if (p.preference) {
    await p.preference("ui.primaryPointerCapabilities", 6);
    await p.preference("ui.allPointerCapabilities", 6);
    await p.preference("ui.prefersReducedMotion", 0);
  }
  await home();
  const desktop = await visible();
  const state = await p.evaluate(`({...${host}.dataset})`);
  const geometry = await p.evaluate(`({hidden:document.hidden,scrollY,hero:document.querySelector('.vanta-hero-depth').getBoundingClientRect().toJSON(),
    title:document.querySelector('[data-testid="text-hero-title"]').getBoundingClientRect().toJSON(),
    image:getComputedStyle(document.querySelector('.vanta-hero-image')).objectFit,
    cssLight:document.querySelector('.vanta-studio-atmosphere').parentElement.innerHTML.includes('vanta')})`);
  await p.screenshot(`${out}/desktop-home.png`);
  assert.ok(desktop.fine, "Native desktop media capability is fine-pointer");
  results.cases.push({ name: "desktop-home", state, desktop, geometry });
  results.cases.push(await nativeInputs());
  results.cases.push({ name: "desktop-transmission", ...(await transmission("desktop")) });

  await home();
  if (p.preference) {
    await p.preference("ui.prefersReducedMotion", 1);
    await p.until("matchMedia('(prefers-reduced-motion:reduce)').matches");
    // A prior hardware/context failure is deliberately terminal; changing
    // motion preference must retain the safe underlay, not retry WebGL.
    await p.until(`['css','fallback'].includes(${host}.dataset.studioState)`);
    assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
    await p.execute("document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'})");
    await visible();
    assert.equal(await p.evaluate("document.querySelectorAll('[data-scene-entry-lock],[data-scene-text-hold]').length"), 0);
    await p.preference("ui.prefersReducedMotion", 0);
    await p.until("!matchMedia('(prefers-reduced-motion:reduce)').matches");
    results.cases.push({ name: "native-reduced-motion-after-mount", passed: true });
    await p.preference("ui.primaryPointerCapabilities", 1);
    await p.preference("ui.allPointerCapabilities", 1);
    await p.until("matchMedia('(any-pointer:coarse)').matches");
    await home();
    assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
    assert.equal(await p.evaluate(`performance.getEntriesByType('resource').some(r=>/\\/(three\\.module|vanta-studio-scene|world)-[^/]+\\.js/.test(r.name))`), false);
    results.cases.push({ name: "wide-native-coarse-pointer-no-engine", passed: true });
  } else {
    results.limitations.push("WebKitGTK WebDriver has no native coarse-pointer or reduced-motion emulation; no application media-query shim was used.");
  }
  await viewport(390, 844);
  await home();
  const phone = await visible();
  assert.ok(phone.width < 768);
  assert.equal(await p.evaluate(`${host}.dataset.studioState`), "css");
  assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
  const resources = await p.evaluate(`performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\\/(three\\.module|vanta-studio-scene|world)-[^/]+\\.js/.test(n))`);
  assert.deepEqual(resources, [], "Fresh mobile document never requests an optional renderer chunk");
  await p.screenshot(`${out}/phone-home.png`);
  await viewport(700, 390);
  await visible();
  assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
  await viewport(390, 844);
  await visible();
  results.cases.push({ name: "phone-landscape-return-css-only", phone, resources, passed: true });
  results.cases.push({ name: "phone-transmission", ...(await transmission("phone")) });
  results.exceptions = p.exceptions || await p.evaluate("window.__phase7Errors");
  if (results.exceptions === null) {
    results.limitations.push("Native back/forward replaced the document error listener; startup exceptions in the replacement document are not covered by this listener. Rendering and visibility assertions still passed.");
    results.exceptions = { replacementDocumentListenerUnavailable: true };
  } else assert.deepEqual(results.exceptions, []);
  results.limitations.push("Neither native Linux engine exposed a working WebGL2 context in this environment; enhanced GPU lifecycle is covered by Chromium, native engines cover fallback/CSS and Transmission.");
  results.assertions = "passed";
  await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await fs.rm(`${out}/failure.json`, { force: true });
  console.log(`PASS ${engine}: ${results.cases.length} native cases`, JSON.stringify(results.cases.map(c => ({ name: c.name, intermediateWrites: c.intermediateWrites, visibleIntermediateWrites: c.visibleIntermediateWrites }))));
} catch (error) {
  await fs.writeFile(`${out}/failure.json`, JSON.stringify({ error: error.stack, results,
    page: await p.evaluate(`({url:location.href,hidden:document.hidden,scrollY,host:{...${host}?.dataset}})`).catch(() => null) }, null, 2));
  throw error;
} finally { await p.close(); }