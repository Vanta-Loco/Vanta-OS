import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { browserPage, sleep } from "./browser-cdp.mjs";

const p = await browserPage();
const selector = "document.querySelector('.vanta-studio-atmosphere')";
const observeUniforms = `
  window.__studioUniforms={pointer:[],energy:[]};
  const names=new WeakMap(),proto=WebGL2RenderingContext.prototype;
  const lookup=proto.getUniformLocation,one=proto.uniform1f,two=proto.uniform2f;
  proto.getUniformLocation=function(program,name){const location=lookup.call(this,program,name);
    if(location)names.set(location,name);return location};
  proto.uniform1f=function(location,value){if(names.get(location)==='uEnergy')
    window.__studioUniforms.energy.push(value);return one.call(this,location,value)};
  proto.uniform2f=function(location,x,y){if(names.get(location)==='uPointer')
    window.__studioUniforms.pointer.push([x,y]);return two.call(this,location,x,y)};
`;
try {
  await p.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await p.send("Page.addScriptToEvaluateOnNewDocument", { source: observeUniforms });
  await p.navigate();
  await p.until(`${selector}?.dataset.studioState === 'rendering' && Number(${selector}.dataset.studioFrames) > 12`, 30000);
  const geometry = () => p.evaluate(`(() => {const r=document.querySelector('.vanta-hero-image').getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height}})()`);
  const before = await geometry();
  await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1140, y: 220 });
  await sleep(800);
  const pointer = await p.evaluate("window.__studioUniforms.pointer");
  assert.ok(pointer.some(([x, y]) => x > .1 && y < -.1), "Real mouse input reaches the renderer");
  assert.ok(pointer.every(v => v.every(x => Math.abs(x) <= 1)), "Pointer values bounded");
  const after = await geometry();
  for (const key of Object.keys(before)) assert.ok(Math.abs(before[key] - after[key]) < .1, "Pointer never tilts or translates the studio image");
  for (let i = 0; i < 4; i++) {
    await p.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 1100, y: 400, deltaX: 0, deltaY: 28 });
    await sleep(60);
  }
  await sleep(150);
  const energy = await p.evaluate("window.__studioUniforms.energy");
  assert.ok(energy.some(x => x > .01), "Existing real wheel/scroll-energy state reaches the renderer");
  assert.ok(energy.every(x => x >= 0 && x <= 1), "Shader energy is clamped");
  await p.evaluate("window.scrollTo(0,0)");
  // "calm" is entered before the existing velocity tail has finished. Wait for
  // both the actual source value and the value delivered to the GPU to settle.
  await p.until(`document.querySelector('.vanta-environment-root').dataset.vantaScrollState === 'calm' &&
    Number(document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-energy')) < .005 &&
    window.__studioUniforms.energy.at(-1) < .01`, 6000);
  const currentEnergy = await p.evaluate("window.__studioUniforms.energy.at(-1)");
  assert.ok(currentEnergy < .01, "Scene settles with existing scroll system");
  await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 640, y: 450 });
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await p.evaluate("document.querySelector('.vanta-studio-atmosphere').contains(document.activeElement)"), false, "Decorative canvas never receives keyboard focus");
  assert.deepEqual(p.exceptions, []);
  const result = { assertions: "passed", pointer: { observedNonzeroGpuValues: true, normalizedBound: 1, imageGeometryUnchanged: true },
    scroll: { observedNonzeroGpuValues: true, maximumObservedEnergy: Math.max(...energy), settledEnergy: currentEnergy },
    keyboard: "passed", exceptions: p.exceptions };
  await fs.writeFile("verification/phase6/inputs.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await p.close(); }