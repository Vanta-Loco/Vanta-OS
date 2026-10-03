import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { browserPage, sleep } from "./browser-cdp.mjs";
import { initialBundle } from "./phase6-bundle.mjs";
import { compareFrames } from "./phase6-pixels.mjs";

const out = "verification/phase6";
await fs.mkdir(out, { recursive: true });
const baseline = JSON.parse(await fs.readFile(`${out}/baseline.json`, "utf8"));
assert.ok(baseline.checkpoint.startsWith("aa59ec5"));
const results = { baseline: baseline.checkpoint, cases: [], exceptions: [] };
const host = "document.querySelector('.vanta-studio-atmosphere')";
const data = `({...${host}?.dataset})`;
const ready = `${host}?.dataset.studioState === 'rendering' && Number(${host}.dataset.studioFrames) >= 12`;
const observation = `
  window.__spatial = {states:[],shifts:[]};
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)
    window.__spatial.shifts.push({t:e.startTime,value:e.value})}).observe({type:'layout-shift',buffered:true});
  new MutationObserver(records=>{for(const r of records)if(r.attributeName==='data-studio-state'){
    const state=r.target.dataset.studioState;
    if(window.__spatial.states.at(-1)?.state===state)continue;
    const title=document.querySelector('[data-testid="text-hero-title"]'), image=document.querySelector('.vanta-hero-image');
    window.__spatial.states.push({t:performance.now(),state,imageReady:!!(image?.complete&&image.naturalWidth),
      titleOpacity:title?Number(getComputedStyle(title).opacity):null});
  }}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-studio-state']});
`;
async function create({ phone = false, coarse = false, reduce = false, source = "" } = {}) {
  const p = await browserPage();
  await p.send("Emulation.setDeviceMetricsOverride", { width: phone ? 390 : 1280, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
  if (coarse || phone) await p.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  if (reduce) await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await p.send("Page.addScriptToEvaluateOnNewDocument", { source: observation + source });
  return p;
}
async function settled(p, width = 1280) {
  await p.until("document.querySelector('.vanta-hero-image')?.complete && Number(getComputedStyle(document.querySelector('[data-testid=\"text-hero-title\"]')).opacity) === 1");
  await p.evaluate("document.fonts.ready");
  await sleep(1000);
  assert.ok(await p.evaluate(`document.documentElement.scrollWidth <= ${width}`), "No horizontal overflow");
}
async function caseRun(name, fn, options) {
  const p = await create(options);
  try {
    const result = await fn(p);
    assert.deepEqual(p.exceptions, [], `${name}: no uncaught exceptions`);
    results.cases.push({ name, passed: true, ...result });
    console.log(`PASS ${name}`);
  } finally { results.exceptions.push(...p.exceptions); await p.close(); }
}
async function noEngine(p) {
  await sleep(500);
  assert.equal(await p.evaluate(`${host}.querySelector('canvas') === null`), true);
  assert.equal(p.requests.some(r => /\/(?:three\.module|vanta-studio-scene|world)-[^/]+\.js/.test(r.url)), false,
    "Ineligible/fallback-only device never requests optional engine chunks");
}
try {
  // Source guards prevent a successful new scene from masking unrelated edits.
  for (const file of ["client/src/components/vanta-living-scene.tsx", "client/src/components/vanta-signal.tsx",
    "client/src/components/vanta-depth.tsx", "client/src/components/vanta-environment.tsx",
    "client/src/components/vanta-scroll-velocity.ts", "client/src/index.css", "client/src/phase5-pages.css",
    "client/src/pages/world.tsx", "client/src/components/vanta-bedroom.tsx", "client/src/pages/worlds.tsx",
    "client/src/components/header.tsx", "client/src/components/vanta-os-boot.tsx", "client/src/components/vanta-os-intro.tsx",
    "scripts/verify-phase5.mjs", "scripts/verify-transmission-handoff.mjs", "package.json", "package-lock.json",
    "attached_assets/generated_images/Music_studio_lifestyle_hero_cf7ae2f2.png"]) {
    assert.deepEqual(await fs.readFile(file), execFileSync("git", ["show", `aa59ec5:${file}`], { maxBuffer: 4 * 1024 * 1024 }), `${file}: preserved`);
  }
  const bundle = await initialBundle();
  assert.ok(bundle.bytes < baseline.bundle.bytes && bundle.gzip < baseline.bundle.gzip, "Initial JS transfer decreases");
  results.bundle = { before: baseline.bundle, after: bundle, rawSaved: baseline.bundle.bytes - bundle.bytes,
    gzipSaved: baseline.bundle.gzip - bundle.gzip };

  await caseRun("desktop-render-lifecycle-composition", async p => {
    assert.equal(await p.evaluate("matchMedia('(pointer:fine)').matches"), true,
      "Launch Chrome with desktop Blink pointer settings; do not bypass app eligibility");
    await p.navigate();
    await p.until(ready, 30000);
    await settled(p);
    const stats = await p.evaluate(data);
    assert.equal(Number(stats.studioDrawCalls), 2);
    assert.equal(Number(stats.studioPoints), 68);
    assert.equal(Number(stats.studioTriangles), 4);
    assert.ok(Number(stats.studioPixelRatio) <= 1.25);
    assert.equal(await p.evaluate("document.querySelectorAll('.vanta-studio-atmosphere canvas').length"), 1, "No cloned renderers in signal echoes");
    const audit = await p.evaluate("window.__spatial");
    const load = audit.states.find(s => s.state === "loading");
    assert.ok(load?.imageReady && load.titleOpacity >= .99, "Normal image/title visible before optional import");
    assert.equal(audit.shifts.filter(s => s.t >= load.t).reduce((sum, s) => sum + s.value, 0), 0, "Enhancement creates zero layout shift");
    const composition = await p.evaluate(`Object.fromEntries(${JSON.stringify(Object.keys(baseline.composition))}.map(s=>{
      const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);
      return [s,{x:r.x,y:r.y,width:r.width,height:r.height,font:c.font,objectFit:c.objectFit,objectPosition:c.objectPosition}]}))`);
    for (const [selector, value] of Object.entries(composition)) {
      const before = baseline.composition[selector];
      for (const field of ["x", "y", "width", "height"]) assert.ok(Math.abs(value[field] - before[field]) < .5, `${selector} ${field}: geometry unchanged`);
      for (const field of ["font", "objectFit", "objectPosition"]) assert.equal(value[field], before[field]);
    }
    assert.equal(p.requests.some(r => /\/world-[^/]+\.js/.test(r.url)), false, "No district code on Home");

    // Freeze only settled CSS atmosphere, not the new renderer, for a controlled
    // photographic A/B. Hiding the transparent canvas reveals its permanent underlay.
    await p.evaluate("document.getAnimations().filter(a=>a instanceof CSSAnimation).forEach(a=>a.pause())");
    await sleep(200);
    await p.screenshot(`${out}/desktop-enhanced.png`);
    await p.evaluate(`${host}.style.visibility='hidden'`);
    await p.screenshot(`${out}/desktop-css-only.png`);
    await p.evaluate(`${host}.style.visibility=''`);
    const pixels = await compareFrames(`${out}/desktop-enhanced.png`, `${out}/desktop-css-only.png`);
    assert.ok(pixels.window.changedPixels > 1000 && pixels.window.maximumChannelDifference >= 8, "Real meaningful nonzero light/dust output");
    // The unchanged translucent header samples the photo behind it. Allow only
    // tiny background-light rounding, not a visible navigation/content change.
    assert.ok(pixels.navigation.maximumChannelDifference <= 3 && pixels.navigation.meanDifference < .2,
      "Navigation appearance preserved (translucent background tolerance only)");
    assert.equal(pixels.lowerContent.changedPixels, 0, "Below-hero content unchanged in controlled A/B");

    let start = Number(await p.evaluate(`${host}.dataset.studioFrames`));
    await sleep(1200);
    const updates = Number(await p.evaluate(`${host}.dataset.studioFrames`)) - start;
    assert.ok(updates > 0 && updates <= 30, "Atmospheric updates bounded below 25fps");

    await p.evaluate("window.scrollTo(0,1200)");
    await p.until(`${host}.dataset.studioState === 'paused' && ${host}.dataset.studioReason === 'offscreen'`);
    start = Number(await p.evaluate(`${host}.dataset.studioFrames`));
    await sleep(450);
    assert.equal(Number(await p.evaluate(`${host}.dataset.studioFrames`)), start, "No offscreen render calls");
    await p.evaluate("window.scrollTo(0,0)");
    await p.until(`${host}.dataset.studioState === 'rendering' && Number(${host}.dataset.studioFrames) > ${start}`);

    await p.send("Browser.setWindowBounds", { windowId: p.windowId, bounds: { windowState: "minimized" } });
    await p.until(`document.hidden && ${host}.dataset.studioState === 'paused' && ${host}.dataset.studioReason === 'hidden'`);
    start = Number(await p.evaluate(`${host}.dataset.studioFrames`));
    await sleep(450);
    assert.equal(Number(await p.evaluate(`${host}.dataset.studioFrames`)), start, "No hidden-tab render calls");
    await p.send("Browser.setWindowBounds", { windowId: p.windowId, bounds: { windowState: "normal" } });
    await p.until(`!document.hidden && ${host}.dataset.studioState === 'rendering' && Number(${host}.dataset.studioFrames) > ${start}`);

    await p.send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(350);
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(350);
    assert.equal(await p.evaluate(`${host}.dataset.studioPoints`), "68", "Resize preserves scene data");
    await p.evaluate(`window.__oldAtmosphere=${host};document.querySelector('a[href="/worlds"]').click()`);
    await p.until("location.pathname === '/worlds' && !!document.querySelector('[data-testid=\"text-worlds-title\"]')");
    assert.equal(await p.evaluate("window.__oldAtmosphere.dataset.studioState"), "disposed");
    assert.equal(await p.evaluate("window.__oldAtmosphere.querySelector('canvas')"), null);
    assert.equal(await p.evaluate("window.__oldAtmosphere.dataset.studioRemainingGeometries"), "0");
    start = Number(await p.evaluate("window.__oldAtmosphere.dataset.studioFrames"));
    await sleep(300);
    assert.equal(Number(await p.evaluate("window.__oldAtmosphere.dataset.studioFrames")), start, "No detached render loop");
    assert.equal(await p.evaluate(host), null, "No atmosphere added to Worlds");
    await p.evaluate("history.back()");
    await p.until("location.pathname === '/'");
    await p.until(ready, 30000);
    await p.evaluate("history.forward()");
    await p.until("location.pathname === '/worlds'");
    assert.equal(await p.evaluate(host), null);
    assert.deepEqual(p.consoleMessages.filter(m => m.type === "error"), [], "No shader/WebGL console errors on success");
    return { stats, loadBoundary: load, enhancementLayoutShift: 0, composition, pixels, updatesIn1200ms: updates,
      offscreen: "passed", hidden: "passed", cleanup: "passed", backForward: "passed" };
  });

  await caseRun("context-loss-css-recovery", async p => {
    await p.navigate(); await p.until(ready, 30000);
    await p.evaluate(`window.__lostCanvas=${host}.querySelector('canvas');
      window.__lostExtension=window.__lostCanvas.getContext('webgl2').getExtension('WEBGL_lose_context');
      window.__lostExtension.loseContext()`);
    await p.until(`${host}.dataset.studioState === 'fallback' && ${host}.dataset.studioReason === 'context-lost'`);
    assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
    assert.equal(await p.evaluate(`${host}.dataset.studioRemainingGeometries`), "0");
    await p.evaluate("window.__lostExtension.restoreContext()");
    await sleep(700);
    assert.equal(await p.evaluate(`${host}.dataset.studioState`), "fallback", "No context-reallocation retry loop");
    await settled(p);
    await p.screenshot(`${out}/desktop-context-loss-fallback.png`);
    await p.evaluate("document.querySelector('a[href=\"/releases\"]').click()");
    await p.until("location.pathname === '/releases'");
    return { recovery: "permanent CSS underlay; navigation remains usable" };
  });

  await caseRun("unavailable-webgl-css-fallback", async p => {
    await p.navigate(); await settled(p);
    await p.until(`${host}.dataset.studioState === 'fallback'`);
    assert.equal(await p.evaluate(`${host}.dataset.studioReason`), "webgl-unavailable");
    assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
    await p.screenshot(`${out}/desktop-webgl-unavailable.png`);
    return { reason: await p.evaluate(`${host}.dataset.studioReason`) };
  }, { source: `const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:getContext.call(this,type,...args)};` });

  await caseRun("phone-css-only", async p => {
    await p.navigate(); await settled(p, 390); await noEngine(p);
    assert.equal(await p.evaluate(`${host}.dataset.studioState`), "css");
    await p.screenshot(`${out}/phone-css-fallback.png`);
    return { width: 390, reason: await p.evaluate(`${host}.dataset.studioReason`) };
  }, { phone: true });

  await caseRun("wide-coarse-pointer-css-only", async p => {
    assert.equal(await p.evaluate("matchMedia('(any-pointer:coarse)').matches"), true);
    await p.navigate(); await settled(p); await noEngine(p);
    return { width: 1280, reason: await p.evaluate(`${host}.dataset.studioReason`) };
  }, { coarse: true });

  await caseRun("initial-reduced-motion-css-only", async p => {
    await p.navigate(); await settled(p); await noEngine(p);
    assert.equal(await p.evaluate(`${host}.dataset.studioReason`), "reduced-motion");
    return { reason: "reduced-motion" };
  }, { reduce: true });

  await caseRun("active-reduced-motion-cleanup", async p => {
    await p.navigate(); await p.until(ready, 30000);
    await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await p.until(`${host}.dataset.studioState === 'css' && ${host}.dataset.studioReason === 'reduced-motion'`);
    assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
    assert.equal(await p.evaluate(`${host}.dataset.studioRemainingGeometries`), "0");
    await settled(p);
    return { cleanup: "passed" };
  });

  await caseRun("observer-fallback-css-only", async p => {
    await p.navigate(); await settled(p); await noEngine(p);
    assert.equal(await p.evaluate(`${host}.dataset.studioReason`), "unsupported-observers");
    return { reason: "unsupported-observers" };
  }, { source: "delete window.IntersectionObserver;" });

  await caseRun("high-density-cap-and-desktop-width-eligibility", async p => {
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 3, mobile: false });
    await p.navigate(); await p.until(ready, 30000);
    assert.equal(await p.evaluate(`${host}.dataset.studioPixelRatio`), "1.25");
    await p.send("Emulation.setDeviceMetricsOverride", { width: 600, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.until(`${host}.dataset.studioState === 'css'`);
    assert.equal(await p.evaluate(`${host}.querySelector('canvas')`), null);
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.until(ready, 30000);
    assert.equal(await p.evaluate("document.querySelectorAll('.vanta-studio-atmosphere canvas').length"), 1);
    return { cappedRatio: 1.25, resizeCleanupAndReentry: "passed" };
  });

  await caseRun("district-lazy-route-preserved", async p => {
    await p.navigate("/worlds");
    assert.equal(p.requests.some(r => /\/world-[^/]+\.js/.test(r.url)), false);
    await p.evaluate("document.querySelector('[data-testid=\"button-enter-district\"]').click()");
    await p.until("location.pathname === '/world' && !!document.querySelector('canvas')", 30000);
    assert.ok(p.requests.some(r => /\/world-[^/]+\.js/.test(r.url)));
    assert.equal(await p.evaluate(host), null);
    return { engineDeferredUntilDistrictNavigation: true, worldSourceUnchanged: true };
  });

  results.assertions = "passed";
  await fs.writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  await fs.rm(`${out}/failure.json`, { force: true });
  console.log(`PASS Phase 6: ${results.cases.length} focused cases; results and frames in ${out}`);
} catch (error) {
  await fs.writeFile(`${out}/failure.json`, JSON.stringify({ error: error.stack, results }, null, 2));
  throw error;
}