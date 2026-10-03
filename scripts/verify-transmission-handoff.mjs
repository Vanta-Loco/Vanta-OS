import assert from "node:assert/strict";

// Observe production behavior only: never seek animations or drive their clocks here.
function observeHandoff() {
  window.__handoffObserver?.disconnect();
  cancelAnimationFrame(window.__handoffFrame);
  const h = window.__handoff = { locks: [], releases: [], samples: [], textSamples: [], textStarts: [], signals: [] };
  let sampling = false;
  const sample = () => {
    const scene = document.querySelector('[data-scene-media-lock][data-scene-revealed="true"]');
    const frame = scene?.querySelector("[data-vanta-transmission-frame]");
    if (!frame) return;
    const t = performance.now();
    const attempt = h.locks.filter(e => e.active).length;
    const stages = [...frame.querySelectorAll(".vanta-transmission-content [data-scene-stage]:not([data-scene-stage=media])")];
    const text = Object.fromEntries(stages.map(e => [e.dataset.sceneStage, Number(getComputedStyle(e).opacity)]));
    h.textSamples.push({ t, attempt, text });
    if (frame.hasAttribute("data-scene-entry-lock")) {
      h.samples.push({ t, attempt, text, echoes: [...frame.querySelectorAll(".vanta-signal-echo")].map(e => {
        const a = e.getAnimations().find(a => a.animationName?.startsWith("vanta-entry-echo-"));
        return { name: getComputedStyle(e).animationName, time: a?.currentTime,
          opacity: Number(getComputedStyle(e).opacity), duration: a?.effect.getTiming().duration };
      }) });
    }
    for (const [stage, opacity] of Object.entries(text)) {
      if (opacity > .01 && !h.textStarts.some(e => e.stage === stage && e.attempt === attempt)) {
        h.textStarts.push({ t, attempt, stage });
      }
    }
    const start = h.locks.findLast(e => e.active)?.t;
    if (start && t - start < 2500) window.__handoffFrame = requestAnimationFrame(sample);
    else sampling = false;
  };
  window.__handoffObserver = new MutationObserver(records => {
    const t = performance.now();
    for (const r of records) {
      if (!r.target.isConnected) continue;
      if (r.attributeName === "data-scene-entry-lock") {
        const active = r.target.hasAttribute("data-scene-entry-lock");
        const echoes = [...r.target.querySelectorAll(".vanta-signal-echo")].map(e => {
          const a = e.getAnimations().find(a => a.animationName?.startsWith("vanta-entry-echo-"));
          return { name: getComputedStyle(e).animationName, time: a?.currentTime };
        });
        h.locks.push({ t, active, echoes, global: document.querySelector(".vanta-environment-root")?.dataset.vantaSignalActive,
          count: document.querySelectorAll("[data-scene-entry-lock]").length,
          scoped: !!r.target.closest("[data-scene-media-lock]") });
        if (active && !sampling) { sampling = true; window.__handoffFrame = requestAnimationFrame(sample); }
        if (active && h.locks.filter(e => e.active).length === 1 && window.__handoffRetry) {
          setTimeout(() => {
            const root = document.querySelector(".vanta-environment-root");
            h.signals.push({ active: true, t: performance.now() });
            root.dataset.vantaSignalActive = "true";
            setTimeout(() => {
              h.interrupted = { hold: r.target.closest("[data-scene-media-lock]").dataset.sceneTextHold,
                count: document.querySelectorAll("[data-scene-entry-lock]").length };
            }, 30);
            setTimeout(() => {
              root.dataset.vantaSignalActive = "false";
              h.signals.push({ active: false, t: performance.now() });
            }, 185);
          }, 85);
        }
      }
      if (r.attributeName === "data-scene-text-hold" && !r.target.hasAttribute("data-scene-text-hold") &&
          r.target.querySelector("[data-scene-entry-lock]")) {
        h.releases.push({ t, delays: Object.fromEntries(
          [...r.target.querySelectorAll(".vanta-transmission-content [data-scene-stage]:not([data-scene-stage=media])")]
            .map(e => [e.dataset.sceneStage, parseFloat(getComputedStyle(e).transitionDelay) * 1000]),
        ) });
      }
    }
  });
  window.__handoffObserver.observe(document, { subtree: true, attributes: true,
    attributeFilter: ["data-scene-entry-lock", "data-scene-text-hold"] });
}

export async function verifyTransmissionHandoff({ send, evaluate, until, sleep, screenshot, visible, navigate, origin, post }) {
  const results = [];
  const watch = await send("Page.addScriptToEvaluateOnNewDocument", { source: `(${observeHandoff})();` });
  const waitComplete = async (count = 1) => {
    await until(`window.__handoff?.locks.filter(e => !e.active).length === ${count} &&
      Object.keys(window.__handoff.releases.at(-1)?.delays || {}).every(stage =>
        window.__handoff.textStarts.some(e => e.attempt === ${count} && e.stage === stage))`, 15000);
    return evaluate("window.__handoff");
  };
  const verify = (h, phone, retry = false) => {
    const starts = h.locks.filter(e => e.active);
    const ends = h.locks.filter(e => !e.active);
    assert.equal(starts.length, retry ? 2 : 1, "Exactly one completed local window, plus the interrupted attempt");
    assert.equal(ends.length, starts.length);
    const delays = phone ? { title: 170, metadata: 210, description: 250, controls: 290 }
      : { title: 180, metadata: 250, description: 315, controls: 380 };
    starts.forEach((start, index) => {
      assert.ok(start.scoped && start.count === 1 && start.global !== "true", "Entry stays frame-local");
      assert.deepEqual(start.echoes.map(e => e.name), ["vanta-entry-echo-one", "vanta-entry-echo-two"]);
      assert.ok(start.echoes.every(e => e.time === 0), `Fresh zero timeline: ${JSON.stringify(start)}`);
      const samples = h.samples.filter(e => e.attempt === index + 1);
      assert.ok(samples.length >= (retry && index === 0 ? 1 : 2),
        "Observe the interrupted frame and multiple frames of each complete window");
      for (let echo = 0; echo < 2; echo++) {
        assert.ok(samples.some(s => s.echoes[echo].time > 0 && s.echoes[echo].time < 155 &&
          s.echoes[echo].opacity > .03), `Nonzero animated opacity: ${JSON.stringify(samples)}`);
        assert.ok(samples.every(s => s.echoes[echo].duration === 155));
        assert.ok(samples.every((s, i) => i === 0 || s.echoes[echo].time >= samples[i - 1].echoes[echo].time),
          "Local timeline progresses monotonically");
      }
      assert.ok(samples.every(s => s.text.title === 0), "Original title stays hidden during local effect");
      const release = h.releases[index];
      assert.ok(Math.abs(release.t - start.t) < 5, "Text delay begins at actual local-window start");
      for (const [stage, delay] of Object.entries(release.delays)) assert.equal(Math.round(delay), delays[stage]);
      const duration = ends[index].t - start.t;
      if (retry && index === 0) assert.ok(duration < 155, "New route signal cancels the incomplete attempt");
      else {
        assert.ok(duration >= 150 && duration < 300, `Complete nominal 155ms local window: ${duration}`);
        for (const stage of Object.keys(release.delays)) {
          const onset = h.textStarts.find(e => e.attempt === index + 1 && e.stage === stage);
          assert.ok(onset, `${stage}: observed text assembly`);
          const offset = onset.t - release.t;
          const frames = h.textSamples.filter(e => e.attempt === index + 1 && e.t <= onset.t);
          const largestFrameGap = Math.max(0, ...frames.map((e, i) => i ? e.t - frames[i - 1].t : e.t - release.t));
          // First-observed opacity is limited by delivered frames, not a fixed polling tolerance.
          assert.ok(offset >= delays[stage] - 20 && offset < delays[stage] + largestFrameGap + 120,
            `${stage}: onset ${offset}ms versus ${delays[stage]}ms; frame gap ${largestFrameGap}ms`);
        }
        const order = Object.keys(release.delays).sort((a, b) => delays[a] - delays[b]);
        const onsets = order.map(stage => h.textStarts.find(e => e.attempt === index + 1 && e.stage === stage).t);
        assert.ok(onsets.every((t, i) => i === 0 || t >= onsets[i - 1]), "Restrained text-stage order remains intact");
      }
    });
    if (retry) {
      assert.deepEqual(h.interrupted, { hold: "true", count: 0 });
      assert.ok(starts[1].t >= h.signals.find(e => !e.active).t, "Retry waits for route clearance");
      assert.ok(ends[1].t - starts[1].t >= 150, "Retry receives a complete window");
    }
    return { windows: starts.map((s, i) => ({ duration: ends[i].t - s.t, start: s.t,
      textDelays: h.releases[i].delays, initialEchoes: s.echoes,
      visibleSamples: h.samples.filter(e => e.attempt === i + 1 && e.echoes.some(a => a.opacity > .03)) })),
      textStarts: h.textStarts, textSamples: h.textSamples, routeSignals: h.signals };
  };
  const reset = () => evaluate(`window.__handoffRetry = false; (${observeHandoff})();`);
  const waitLock = () => evaluate(`new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-scene-entry-lock]')) { observer.disconnect(); resolve(true); }
    });
    observer.observe(document, {subtree:true, attributes:true, attributeFilter:['data-scene-entry-lock']});
  })`);
  try {
    for (const phone of [false, true]) {
      const width = phone ? 390 : 1280;
      await send("Emulation.setDeviceMetricsOverride", { width, height: phone ? 844 : 900, deviceScaleFactor: 1, mobile: phone });
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: width - 5, y: 5 });
      await send("Page.navigate", { url: `${origin}/post/${post.id}` });
      const nominal = verify(await waitComplete(), phone);
      await visible(width);
      await screenshot(`${phone ? "phone" : "desktop"}-transmission-handoff`);

      // Reveal while route activity is held, then interrupt the first local attempt.
      await navigate("/");
      await reset();
      await evaluate(`window.__handoffRetry = true;
        document.querySelector('.vanta-environment-root').dataset.vantaSignalActive = 'true';
        document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'});`);
      await until("document.querySelector('[data-scene-media-lock]').dataset.sceneRevealed === 'true'");
      await sleep(220);
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock]').length"), 0);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.vanta-transmission-content [data-scene-stage=title]')).opacity"), "0");
      await evaluate("document.querySelector('.vanta-environment-root').dataset.vantaSignalActive = 'false'");
      const retry = verify(await waitComplete(2), phone, true);
      await visible(width);
      await screenshot(`${phone ? "phone" : "desktop"}-transmission-retry`);
      await evaluate("window.scrollTo(0,0)");
      await sleep(400);
      await evaluate("document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'})");
      await sleep(400);
      assert.equal(await evaluate("window.__handoff.locks.filter(e=>e.active).length"), 2, "Completed entry does not replay on scroll");

      // Actual SPA click into an article, then back/forward to prove route navigation.
      await reset();
      await evaluate("document.querySelector('[data-scene-media-lock] a').click()");
      await until("location.pathname.startsWith('/post/') && !!document.querySelector('.vanta-post-scene')");
      const navigation = verify(await waitComplete(), phone);
      await visible(width);
      await evaluate("history.back()");
      await until("location.pathname === '/' && !!document.querySelector('[data-scene-media-lock]')");
      await reset();
      await evaluate("history.forward()");
      await until("location.pathname.startsWith('/post/') && !!document.querySelector('.vanta-post-scene')");
      verify(await waitComplete(), phone);
      await visible(width);
      const energies = {};
      for (const [name, delta] of [["slow", 3], ["normal", 28], ["fast", 620]]) {
        await evaluate("window.scrollTo(0,0)");
        await sleep(650);
        energies[name] = 0;
        for (let i = 0; i < 5; i++) {
          await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: width - 40, y: 400, deltaX: 0, deltaY: delta });
          await sleep(40);
          energies[name] = Math.max(energies[name], await evaluate("Number(document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-energy'))"));
        }
        await until("document.querySelector('.vanta-environment-root').dataset.vantaScrollState === 'calm' && Math.abs(Number(document.querySelector('.vanta-environment-root').style.getPropertyValue('--vanta-scroll-parallax-boost'))-1)<.002", 6000);
      }
      assert.ok(energies.fast > energies.slow, "Scroll velocity response remains intact");
      await visible(width);

      // Focus cancels an active entry, reveals immediately, and does not replay on blur.
      await navigate("/");
      await reset();
      const focusedLock = waitLock();
      await evaluate("document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'})");
      await focusedLock;
      await evaluate("document.querySelector('[data-scene-media-lock] a').focus()");
      assert.equal(await evaluate("document.querySelector('[data-scene-media-lock]').dataset.sceneImmediate"), "true");
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock],[data-scene-text-hold]').length"), 0);
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.vanta-transmission-content [data-scene-stage=title]')).opacity"), "1");
      await evaluate("document.activeElement.blur()");
      await sleep(300);
      assert.equal(await evaluate("window.__handoff.locks.filter(e=>e.active).length"), 1);
      await visible(width);

      // Changing the real media preference during a window cancels it immediately.
      await navigate("/");
      await reset();
      const motionLock = waitLock();
      await evaluate("document.querySelector('[data-scene-media-lock]').scrollIntoView({block:'center'})");
      await motionLock;
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
      await until("document.querySelectorAll('[data-scene-entry-lock],[data-scene-text-hold]').length === 0");
      await visible(width);
      await navigate(`/post/${post.id}`);
      assert.equal(await evaluate("document.querySelectorAll('[data-scene-entry-lock],[data-scene-pending],[data-scene-text-hold]').length"), 0);
      assert.equal(await evaluate("[...document.querySelectorAll('.vanta-signal-echo')].every(e=>getComputedStyle(e).animationName==='none' && Number(getComputedStyle(e).opacity)===0)"), true);
      await visible(width);
      await screenshot(`${phone ? "phone" : "desktop"}-transmission-reduced`);
      await send("Emulation.setEmulatedMedia", { features: [] });
      results.push({ layout: phone ? "phone" : "desktop", nominal, retry, navigation, energies,
        focus: "passed", reducedMotion: "passed", overflow: "passed" });
      console.log(JSON.stringify({ layout: phone ? "phone" : "desktop",
        nominalDuration: nominal.windows[0].duration, retryDurations: retry.windows.map(w => w.duration),
        navigationDuration: navigation.windows[0].duration, energies, focus: "passed", reducedMotion: "passed" }));
    }
  } finally {
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: watch.identifier });
  }
  return results;
}