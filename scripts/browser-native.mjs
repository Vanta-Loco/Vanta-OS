// Native Firefox Marionette and WebKitGTK WebDriver, using existing binaries.
// No added packages, browser downloads, app gates, or production overrides.
import net from "node:net";
import fs from "node:fs/promises";
import WebSocket from "ws";

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function marionette() {
  const socket = net.connect(2828, "127.0.0.1");
  let buffer = Buffer.alloc(0), id = 0;
  const pending = new Map();
  const greeting = new Promise(resolve => {
    socket.on("data", data => {
      buffer = Buffer.concat([buffer, data]);
      while (true) {
        const colon = buffer.indexOf(58);
        if (colon < 0) break;
        const length = Number(buffer.subarray(0, colon).toString());
        if (buffer.length < colon + 1 + length) break;
        const message = JSON.parse(buffer.subarray(colon + 1, colon + 1 + length));
        buffer = buffer.subarray(colon + 1 + length);
        if (!Array.isArray(message)) { resolve(message); continue; }
        const waiter = pending.get(message[1]);
        pending.delete(message[1]);
        if (message[2]) waiter?.reject(new Error(JSON.stringify(message[2])));
        else waiter?.resolve(message[3]);
      }
    });
  });
  await greeting;
  const command = (name, params = {}) => new Promise((resolve, reject) => {
    const request = Buffer.from(JSON.stringify([0, ++id, name, params]));
    pending.set(id, { resolve, reject });
    socket.write(Buffer.concat([Buffer.from(`${request.length}:`), request]));
  });
  const session = await command("WebDriver:NewSession", { acceptInsecureCerts: true, webSocketUrl: true });
  let bidi, bidiCommand;
  const exceptions = [];
  if (session.capabilities.webSocketUrl) {
    bidi = new WebSocket(session.capabilities.webSocketUrl);
    await new Promise(resolve => bidi.once("open", resolve));
    let next = 0;
    const requests = new Map();
    bidi.on("message", data => {
      const message = JSON.parse(data);
      if (message.method === "log.entryAdded" && message.params.type === "javascript" && message.params.level === "error") {
        exceptions.push(message.params.text);
      }
      if (message.id) {
        const request = requests.get(message.id);
        requests.delete(message.id);
        if (message.type === "error") request?.reject(new Error(JSON.stringify(message)));
        else request?.resolve(message.result);
      }
    });
    bidiCommand = (method, params) => new Promise((resolve, reject) => {
      requests.set(++next, { resolve, reject });
      bidi.send(JSON.stringify({ id: next, method, params }));
    });
    await bidiCommand("session.subscribe", { events: ["log.entryAdded"] });
  }
  return {
    capabilities: session.capabilities,
    exceptions,
    preload: bidiCommand ? source => bidiCommand("script.addPreloadScript", { functionDeclaration: `()=>{${source}}` }) : undefined,
    execute: async (script, args = []) => (await command("WebDriver:ExecuteScript", { script, args, newSandbox: false, sandbox: null })).value,
    navigate: url => command("WebDriver:Navigate", { url }),
    actions: actions => command("WebDriver:PerformActions", { actions }),
    rect: rect => command("WebDriver:SetWindowRect", rect),
    screenshot: async path => fs.writeFile(path, Buffer.from((await command("WebDriver:TakeScreenshot", { full: false })).value, "base64")),
    minimize: () => command("WebDriver:MinimizeWindow"),
    restore: () => command("WebDriver:SetWindowRect", { width: 1280, height: 900 }),
    preference: async (name, value) => {
      await command("Marionette:SetContext", { value: "chrome" });
      try {
        return await command("WebDriver:ExecuteScript", { script: `Services.prefs.setIntPref(arguments[0],arguments[1]);return true;`,
          args: [name, value], newSandbox: false, sandbox: null });
      } finally { await command("Marionette:SetContext", { value: "content" }); }
    },
    close: async () => { bidi?.close(); await command("WebDriver:DeleteSession"); socket.end(); },
  };
}

async function webkit() {
  const request = async (path, body, method = body === undefined ? "GET" : "POST") => {
    const response = await fetch(`http://127.0.0.1:4445${path}`, { method,
      headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await response.json();
    if (json.value?.error) throw new Error(JSON.stringify(json.value));
    return json.value;
  };
  // This packaged driver matches its bundled MiniBrowser with default
  // capabilities; an explicit binary option is rejected by its matcher.
  const session = await request("/session", { capabilities: { alwaysMatch: {} } });
  const base = `/session/${session.sessionId}`;
  await request(`${base}/timeouts`, { script: 20000, pageLoad: 45000, implicit: 0 });
  return {
    capabilities: session.capabilities,
    execute: (script, args = []) => request(`${base}/execute/sync`, { script, args }),
    navigate: url => request(`${base}/url`, { url }),
    actions: actions => request(`${base}/actions`, { actions }),
    rect: rect => request(`${base}/window/rect`, rect),
    screenshot: async path => fs.writeFile(path, Buffer.from(await request(`${base}/screenshot`), "base64")),
    minimize: () => request(`${base}/window/minimize`, {}),
    restore: () => request(`${base}/window/rect`, { width: 1280, height: 900 }),
    close: () => request(base, undefined, "DELETE"),
  };
}

export async function nativeBrowser(engine) {
  const browser = await (engine === "firefox" ? marionette() : webkit());
  const evaluate = expression => browser.execute(`return (${expression});`);
  const until = async (expression, timeout = 20000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(expression)) return;
      await sleep(60);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  return { ...browser, evaluate, until };
}