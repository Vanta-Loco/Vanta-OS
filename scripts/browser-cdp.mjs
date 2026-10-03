import WebSocket from "ws";
import fs from "node:fs/promises";

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Small observer-only browser harness; no animation seeking or application bypasses. */
export async function browserPage() {
  const debug = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9223";
  const origin = process.env.PHASE6_TEST_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const target = await (await fetch(`${debug}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.once("open", resolve));
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  const requests = [];
  const consoleMessages = [];
  ws.on("message", data => {
    const m = JSON.parse(data);
    if (m.method === "Runtime.exceptionThrown") exceptions.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled") consoleMessages.push({ type: m.params.type,
      text: m.params.args.map(a => a.value ?? a.description ?? "").join(" ") });
    if (m.method === "Network.requestWillBeSent") requests.push({ url: m.params.request.url, type: m.params.type });
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p?.reject(new Error(JSON.stringify(m.error)));
      else p?.resolve(m.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = await evaluate(expression);
      if (result) return result;
      await sleep(80);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  const { windowId } = await send("Browser.getWindowForTarget", { targetId: target.id });
  await send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
  await send("Page.bringToFront");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    sessionStorage.setItem('vc-boot','1');
    sessionStorage.setItem('vc-intro','1');
    localStorage.setItem('vanta-skip-os-boot','true');
    localStorage.setItem('theme','dark');
  ` });
  const navigate = async (path = "/") => {
    await send("Page.navigate", { url: `${origin}${path}` });
    await until("document.readyState === 'complete' && !!document.querySelector('.vanta-environment-root')");
  };
  const screenshot = async path => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    await fs.writeFile(path, Buffer.from(data, "base64"));
  };
  return { send, evaluate, until, navigate, screenshot, exceptions, requests, consoleMessages, target, origin, windowId,
    close: async () => { ws.close(); await fetch(`${debug}/json/close/${target.id}`); } };
}