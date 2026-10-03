// Dependency-free browser regression checks using the project's existing ws package.
// Start Chrome with --remote-debugging-port=9223. Prefer a freshly built production preview.
// PHASE511_FOCUSED=1 runs only the desktop/phone Transmission hardening checks.
import WebSocket from "ws";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { verifyTransmissionHandoff } from "./verify-transmission-handoff.mjs";

const origin = process.env.PHASE5_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
const debug = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9223";
const out = process.env.PHASE5_TEST_OUTPUT || "/tmp/vanta-phase5-1-polish";
await fs.mkdir(out, { recursive: true });
const target = await (await fetch(`${debug}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.once("open", resolve));
let sequence = 0;
const pending = new Map();
const exceptions = [];
let authorizedPreview = false;
ws.on("message", (buffer) => {
  const message = JSON.parse(buffer);
  if (message.method === "Fetch.requestPaused") {
    if (authorizedPreview) {
      void send("Fetch.fulfillRequest", { requestId: message.params.requestId, responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify({ authorized: true })).toString("base64") });
    } else void send("Fetch.continueRequest", { requestId: message.params.requestId });
  }
  if (message.method === "Runtime.exceptionThrown") {
    const detail = message.params.exceptionDetails;
    exceptions.push({ message: detail.exception?.description || detail.text, url: detail.url, line: detail.lineNumber });
  }
  if (!message.id) return;
  const { resolve, reject } = pending.get(message.id) || {};
  pending.delete(message.id);
  if (message.error) reject?.(new Error(JSON.stringify(message.error)));
  else resolve?.(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
};
const until = async (expression, timeout = 20000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
};
const screenshot = async (name) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(`${out}/${name}.png`, Buffer.from(data, "base64"));
};
const navigate = async (path) => {
  await send("Page.navigate", { url: `${origin}${path}` });
  await until("document.readyState === 'complete' && !!document.querySelector('.vanta-environment-root')");
  await sleep(1600);
};
const visible = async (width) => {
  await until(`[
    ...document.querySelectorAll('.vanta-scene-reveal[data-scene-revealed="true"]'),
    ...[...document.querySelectorAll('.vanta-scene-reveal[data-scene-revealed="true"] [data-scene-stage]')].filter(e => !e.closest('.vanta-signal-echo'))
  ].every(e => Number(getComputedStyle(e).opacity) >= .99)`, 3000);
  const state = await evaluate(`({
    width: document.documentElement.scrollWidth,
    hidden: [...document.querySelectorAll('.vanta-scene-reveal[data-scene-revealed="true"]')].filter(e => Number(getComputedStyle(e).opacity) < .99).length,
    nestedOwners: [...document.querySelectorAll('.vanta-scene-stage')].filter(e => !e.closest('.vanta-signal-echo') && e.parentElement.closest('.vanta-scene-stage')).length
  })`);
  assert.ok(state.width <= width, `Overflow: ${state.width} > ${width}`);
  assert.equal(state.hidden, 0, "Revealed wrapper must settle");
  assert.equal(state.nestedOwners, 0, "Nested stage fade owners");
  return state;
};
await send("Page.enable");
await send("Page.bringToFront");
await send("Runtime.enable");
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  sessionStorage.setItem('vc-boot', '1');
  sessionStorage.setItem('vc-intro', '1');
  localStorage.setItem('vanta-skip-os-boot', 'true');
  localStorage.setItem('theme', 'dark');
` });
const posts = await (await fetch(`${origin}/api/posts`)).json();
const post = posts.find((p) => p.coverImage && !p.title.includes("Late Night Sessions"));
assert.ok(post, "A real published Transmission is required");
const routes = [["home", "/"], ["releases", "/releases"], ["worlds", "/worlds"], ["transmission", `/post/${post.id}`], ["enter", "/enter"], ["early-access", "/early-access"]]
  .filter(([name]) => !process.env.PHASE5_TEST_PAGES || process.env.PHASE5_TEST_PAGES.split(",").includes(name));
const results = [];
try {
  const handoff = () => verifyTransmissionHandoff({ send, evaluate, until, sleep, screenshot, visible, navigate, origin, post });
  if (process.env.PHASE511_FOCUSED === "1") {
    results.push(...await handoff());
  } else {
  for (const phone of [false, true]) {
    const width = phone ? 390 : 1280;
    await send("Emulation.setDeviceMetricsOverride", { width, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
    for (const [name, path] of routes) {
      await navigate(path);
      await screenshot(`${phone ? "phone" : "desktop"}-${name}`);
      const metrics = await visible(width);
      if (name === "enter") {
        assert.equal(await evaluate("document.activeElement === document.querySelector('[data-testid=\"input-enter-access-key\"]')"), true, "Gateway autofocus");
      }
      if (name === "worlds") {
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.vanta-worlds-depth-image > img')).opacity"), phone ? "0.16" : "0.14");
        assert.equal(await evaluate("document.querySelector('.vanta-city-lights').parentElement.classList.contains('vanta-city-image-drift')"), true);
        assert.equal(await evaluate("document.querySelector('.vanta-worlds-depth-image .vanta-city-lights').parentElement.querySelector('img') !== null"), true);
        assert.equal(await evaluate("getComputedStyle(document.querySelector('.vanta-worlds-depth-image .vanta-city-lights')).opacity"), "0.16");
        await evaluate("window.scrollTo(0, 690)");
        await sleep(1200);
        await screenshot(`${phone ? "phone" : "desktop"}-worlds-projects`);
      }
      if (name === "home") {
        await until("!!document.querySelector('[data-scene-media-lock]')");
        await evaluate(`window.__locks = []; new MutationObserver(records => {
          for (const r of records) if (r.attributeName === 'data-scene-entry-lock' && r.target.hasAttribute('data-scene-entry-lock')) {
            window.__locks.push({ global: document.querySelector('.vanta-environment-root').dataset.vantaSignalActive,
              count: document.querySelectorAll('[data-scene-entry-lock]').length,
              scope: r.target.closest('[data-scene-media-lock]') != null });
          }
        }).observe(document.body, {subtree:true, attributes:true});
        document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'});`);
        await sleep(1100);
        const locks = await evaluate("window.__locks");
        assert.ok(locks.length, "Featured media lock should occur");
        assert.ok(locks.every((l) => l.count === 1 && l.scope && l.global !== "true"), "Lock must be local");
        assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock]').length"), 0);
        const order = await evaluate(`[...document.querySelector('[data-scene-media-lock] .vanta-transmission-content').querySelectorAll('[data-scene-stage]')].map(e => [e.dataset.sceneStage, parseFloat(getComputedStyle(e).transitionDelay) * 1000])`);
        const delays = Object.fromEntries(order);
        assert.equal(Math.round(delays.title), phone ? 170 : 180);
        assert.ok(delays.title < delays.metadata && delays.metadata < delays.description && delays.description < delays.controls);
        await screenshot(`${phone ? "phone" : "desktop"}-home-featured`);
        // Once revealed, scrolling away and back must not dispatch a second lock.
        await evaluate("window.scrollTo(0, 0)");
        await sleep(500);
        await evaluate("document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'})");
        await sleep(700);
        assert.equal((await evaluate("window.__locks")).length, locks.length);
      }
      // Verify inherited velocity response and settling, without changing its implementation.
      const scroll = {};
      for (const [speed, delta] of [["slow", 3], ["normal", 28], ["fast", 620]]) {
        await evaluate("window.scrollTo(0, 0)");
        await sleep(650);
        const energies = [];
        for (let i = 0; i < 5; i++) {
          await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: Math.min(width - 20, 700), y: 400, deltaX: 0, deltaY: delta });
          await sleep(40);
          energies.push(await evaluate("Number(document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-energy'))"));
        }
        scroll[speed] = Math.max(...energies);
        await until("document.querySelector('.vanta-environment-root').dataset.vantaScrollState === 'calm' && document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-parallax-boost') === '1.000'", 6000);
        assert.equal(await evaluate("document.querySelector('.vanta-environment-root').dataset.vantaScrollState"), "calm", `${name}: velocity settles`);
        assert.equal(await evaluate("document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-parallax-boost')"), "1.000");
      }
      if (name !== "enter") assert.ok(scroll.fast > scroll.slow, `${name}: fast versus slow response`);
      await visible(width);
      results.push({ layout: phone ? "phone" : "desktop", name, metrics, scroll });
      console.log(JSON.stringify(results.at(-1)));
    }
  }
  // Artwork hover remains its own transform, separate from settled entrance.
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate("/releases");
  await until("!!document.querySelector('.vanta-release-artwork')");
  await evaluate("document.querySelector('.vanta-release-artwork').scrollIntoView({block:'center'})");
  await sleep(1300);
  const rect = await evaluate("(() => {const r=document.querySelector('.vanta-release-artwork').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...rect });
  await sleep(120);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.vanta-release-artwork .vanta-signal-echo-one')).display"), "block");
  await sleep(650);
  assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.vanta-release-artwork')).transform"), "none");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.vanta-release-artwork-entry')).transform"), "none");
  await screenshot("desktop-release-hover");
  // Sample the offscreen-to-visible entrance, not just its settled hover state.
  if (routes.some(([name]) => name === "releases")) {
    for (const phone of [false, true]) {
      const width = phone ? 390 : 1280;
      await send("Emulation.setDeviceMetricsOverride", { width, height: 320, deviceScaleFactor: 1, mobile: phone });
      await navigate("/releases");
      const entry = ".vanta-release-artwork-entry";
      assert.equal(await evaluate(`document.querySelector('${entry}').closest('[data-scene-pending]') !== null`), true, "Artwork should begin offscreen");
      const start = await evaluate(`(() => { const transform = getComputedStyle(document.querySelector('${entry}')).transform;
        const matrix = new DOMMatrixReadOnly(transform); return {transform, x: matrix.m41, y: matrix.m42}; })()`);
      assert.ok(Math.abs(start.x + (phone ? 6 : 12)) < 1 && Math.abs(start.y - (phone ? 6 : 12)) < 1,
        `Archive placement must win the pending-stage cascade: ${start.transform}`);
      await evaluate(`document.querySelector('${entry}').scrollIntoView({block:'center'})`);
      await until(`document.querySelector('${entry}').closest('[data-scene-revealed="true"]') !== null`);
      await sleep(130);
      const moving = await evaluate(`getComputedStyle(document.querySelector('${entry}')).transform`);
      assert.notEqual(moving, "none", "Artwork should visibly travel toward rest");
      await screenshot(`${phone ? "phone" : "desktop"}-release-entrance-mid`);
      await sleep(950);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('${entry}')).transform`), "none");
      await screenshot(`${phone ? "phone" : "desktop"}-release-entrance-settled`);
    }
  }
  if (routes.some(([name]) => name === "transmission")) {
    results.push(...await handoff());
  }
  if (routes.some(([name]) => name === "home")) {
    // Hold the route-level flag while revealing featured media, then hand it off.
    for (const phone of [false, true]) {
      await send("Emulation.setDeviceMetricsOverride", { width: phone ? 390 : 1280, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
      await navigate("/");
      assert.equal(await evaluate("document.querySelector('[data-scene-media-lock]').dataset.scenePending"), "true");
      await evaluate("document.querySelector('.vanta-environment-root').dataset.vantaSignalActive = 'true'; document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'})");
      await until("document.querySelector('[data-scene-media-lock]').dataset.sceneRevealed === 'true'");
      await sleep(210);
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock]').length"), 0, "Wait for route signal to clear");
      await evaluate("document.querySelector('.vanta-environment-root').dataset.vantaSignalActive = 'false'");
      await until("document.querySelectorAll('[data-scene-entry-lock]').length === 1", 1000);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-scene-entry-lock] .vanta-signal-echo-one')).display"), "block");
      await screenshot(`${phone ? "phone" : "desktop"}-media-handoff`);
      await sleep(205);
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock]').length"), 0);
    }
  }
  // Keyboard focus reveals offscreen controls and they stay exposed after blur.
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1270, y: 10 });
  await navigate("/early-access");
  await evaluate("document.querySelector('.vanta-os-grid a').focus()");
  await sleep(50);
  assert.equal(await evaluate("document.activeElement.closest('.vanta-scene-reveal').dataset.sceneImmediate"), "true");
  await evaluate("document.activeElement.blur()");
  await visible(1280);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.ok(await evaluate("document.activeElement.tagName === 'A' || document.activeElement.tagName === 'BUTTON'"));
  // Actual SPA navigation, rather than only hard loads.
  await navigate("/worlds");
  await evaluate("document.querySelector('a[href=\"/enter\"]').click()");
  await until("location.pathname === '/enter' && !!document.querySelector('[data-testid=\"input-enter-access-key\"]')");
  assert.equal(await evaluate("document.activeElement.dataset.testid"), "input-enter-access-key");
  // Observer fallback exposes even offscreen compositions.
  const fallback = await send("Page.addScriptToEvaluateOnNewDocument", { source: "delete window.IntersectionObserver" });
  await navigate("/");
  assert.equal(await evaluate("document.querySelectorAll('[data-scene-pending]').length"), 0);
  await visible(1280);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: fallback.identifier });
  // Reduced motion: all scenes reveal and actual authorized span's class has no animation.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const phone of [false, true]) {
    const width = phone ? 390 : 1280;
    await send("Emulation.setDeviceMetricsOverride", { width, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
    for (const [name, path] of routes) {
      await navigate(path);
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-pending]').length"), 0);
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock]').length"), 0);
      assert.equal(await evaluate("[...document.querySelectorAll('.vanta-scene-light,.vanta-scene-fog,.vanta-city-lights,.vanta-transmission-atmosphere')].every(e=>getComputedStyle(e).animationName==='none')"), true, `${name}: reduced animation`);
      assert.equal(await evaluate("[...document.querySelectorAll('.vanta-os-panel')].every(e=>getComputedStyle(e,'::before').animationName==='none')"), true);
      await visible(width);
    }
  }
  // Preview only the authorized UI response; no credentials, login, or backend data changes.
  authorizedPreview = true;
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/vault/me" }] });
  await navigate("/enter");
  await until("!!document.querySelector('.enter-authorized-pulse')");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.enter-authorized-pulse')).animationName"), "none");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.enter-authorized-pulse')).opacity"), "0.72");
  await screenshot("phone-enter-authorized-reduced");
  await send("Fetch.disable");
  authorizedPreview = false;
  // Exercise the full OS boot without the suite's usual session/local-storage bypass.
  await send("Emulation.setEmulatedMedia", { features: [] });
  const boot = await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    sessionStorage.setItem('vc-boot', '1');
    sessionStorage.setItem('vc-intro', '1');
    localStorage.removeItem('vanta-skip-os-boot');
  ` });
  for (const phone of [false, true]) {
    await send("Emulation.setDeviceMetricsOverride", { width: phone ? 390 : 1280, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
    await send("Page.navigate", { url: `${origin}/` });
    await until("!!document.querySelector('[aria-label=\"Vanta OS boot sequence — press any key to continue\"]')");
    await sleep(1200);
    assert.equal(await evaluate("!!document.querySelector('[aria-label=\"Vanta OS boot sequence — press any key to continue\"]')"), true, "OS boot must remain uninterrupted");
    await screenshot(`${phone ? "phone" : "desktop"}-os-boot`);
    await until("!!document.querySelector('[data-testid=\"enter-vanta-screen\"]')", 12000);
    await evaluate("document.querySelector('[aria-label=\"Enter Vanta\"]').click()");
    await until("!!document.querySelector('.vanta-environment-root') && !!document.querySelector('.vanta-hero-depth')");
    await evaluate("document.querySelector('a[href=\"/enter\"]').click()");
    await until("location.pathname === '/enter' && !!document.querySelector('[data-testid=\"input-enter-access-key\"]')");
    await sleep(1400);
    await visible(phone ? 390 : 1280);
    await screenshot(`${phone ? "phone" : "desktop"}-os-after-boot`);
  }
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: boot.identifier });
  }
  assert.deepEqual(exceptions, [], "No browser exceptions");
  await fs.writeFile(`${out}/results.json`, JSON.stringify({ results, assertions: "passed", exceptions }, null, 2));
  await fs.rm(`${out}/failure.json`, { force: true });
  console.log(`PASS: ${process.env.PHASE511_FOCUSED === "1" ? "focused Phase 5.1.1 Transmission" : "all Phase5"} browser checks; screenshots and results in ${out}`);
} catch (error) {
  await fs.writeFile(`${out}/failure.json`, JSON.stringify({
    error: error.stack, results, exceptions, handoff: await evaluate("window.__handoff").catch(() => null),
  }, null, 2));
  throw error;
} finally {
  ws.close();
  await fetch(`${debug}/json/close/${target.id}`);
}