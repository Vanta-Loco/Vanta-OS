import assert from "node:assert/strict";

// Observe native runtime timeline writes and CSS transition lifecycle events.
// Never seek animations, drive their clocks, or infer a 155ms effect from polls.
export function observeHandoff() {
  window.__handoffObserver?.disconnect();
  cancelAnimationFrame(window.__handoffFrame);
  window.__handoffDispose?.();
  const h = window.__handoff = { locks: [], releases: [], samples: [], textSamples: [],
    textStarts: [], signals: [], windows: [], transitions: [], observerErrors: [] };
  const byFrame = new WeakMap();
  const byAnimation = new WeakMap();
  const transitionEffects = new WeakMap();
  const native = window.__handoffNativeTime ||= Object.getOwnPropertyDescriptor(Animation.prototype, "currentTime");
  if (!window.__handoffTimePatched) {
    Object.defineProperty(Animation.prototype, "currentTime", { ...native, set(value) {
      native.set.call(this, value);
      // A passive tap AFTER the application's own write; it cannot alter time.
      try { window.__handoffRecordTime?.(this, value); }
      catch (error) { window.__handoff.observerErrors.push(String(error)); }
    } });
    window.__handoffTimePatched = true;
  }
  window.__handoffRecordTime = (animation, value) => {
    if (!(animation instanceof CSSAnimation) || !animation.animationName.startsWith("vanta-entry-echo-")) return;
    const target = animation.effect?.target;
    const frame = target?.closest("[data-vanta-transmission-frame]");
    if (!frame?.isConnected || !frame.hasAttribute("data-scene-entry-lock")) return;
    let w = byFrame.get(frame);
    if (!w || w.closed) {
      w = { attempt: h.windows.length + 1, start: performance.now(), echoes: [], progress: [], closed: false };
      h.windows.push(w); byFrame.set(frame, w);
    }
    if (!byAnimation.has(animation)) {
      const owner = frame.closest("[data-scene-media-lock]");
      const title = frame.querySelector(".vanta-transmission-content [data-scene-stage=title]");
      w.echoes.push({ name: animation.animationName, initialTime: value,
        duration: animation.effect.getTiming().duration, playState: animation.playState,
        keyframes: animation.effect.getKeyframes().map(k => ({ offset: k.computedOffset, opacity: k.opacity })),
        titleOpacity: Number(getComputedStyle(title).opacity),
        scoped: !!owner, count: document.querySelectorAll("[data-scene-entry-lock]").length,
        global: document.querySelector(".vanta-environment-root")?.dataset.vantaSignalActive });
      byAnimation.set(animation, w);
    }
    const entry = { t: performance.now(), name: animation.animationName, time: Number(value) };
    if (value > 0 && value < 155) {
      const rect = target.getBoundingClientRect();
      entry.opacity = Number(getComputedStyle(target).opacity);
      entry.inViewport = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth;
      entry.ancestorOpacity = 1;
      for (let parent = target.parentElement; parent; parent = parent.parentElement) {
        entry.ancestorOpacity *= Number(getComputedStyle(parent).opacity);
      }
    }
    w.progress.push(entry);
  };
  const lifecycle = event => {
    if (event.propertyName !== "opacity") return;
    const target = event.target;
    if (target.closest(".vanta-signal-echo") || !target.matches(".vanta-transmission-content [data-scene-stage]")) return;
    const frame = target.closest("[data-vanta-transmission-frame]");
    const w = byFrame.get(frame);
    if (!w) return;
    const live = target.getAnimations().find(a => a instanceof CSSTransition && a.transitionProperty === "opacity");
    if (live) transitionEffects.set(target, live);
    const animation = live || transitionEffects.get(target);
    const entry = { t: performance.now(), attempt: w.attempt, stage: target.dataset.sceneStage,
      type: event.type, elapsedTime: event.elapsedTime, delay: animation?.effect.getTiming().delay,
      duration: animation?.effect.getTiming().duration, startTime: animation?.startTime };
    h.transitions.push(entry);
    if (event.type === "transitionstart" && !h.textStarts.some(e => e.attempt === w.attempt && e.stage === entry.stage)) {
      h.textStarts.push(entry);
    }
  };
  for (const type of ["transitionrun", "transitionstart", "transitionend", "transitioncancel"]) {
    document.addEventListener(type, lifecycle, true);
  }
  window.__handoffDispose = () => {
    for (const type of ["transitionrun", "transitionstart", "transitionend", "transitioncancel"]) {
      document.removeEventListener(type, lifecycle, true);
    }
  };
  window.__handoffObserver = new MutationObserver(records => {
    const t = performance.now();
    for (const r of records) {
      if (!r.target.isConnected) continue;
      if (r.attributeName === "data-scene-entry-lock") {
        const active = r.target.hasAttribute("data-scene-entry-lock");
        const w = byFrame.get(r.target);
        const echoes = [...r.target.querySelectorAll(".vanta-signal-echo")].map(e => {
          const a = e.getAnimations().find(a => a.animationName?.startsWith("vanta-entry-echo-"));
          return { name: getComputedStyle(e).animationName, time: a?.currentTime };
        });
        h.locks.push({ t, active, attempt: w?.attempt, echoes, global: document.querySelector(".vanta-environment-root")?.dataset.vantaSignalActive,
          count: document.querySelectorAll("[data-scene-entry-lock]").length,
          scoped: !!r.target.closest("[data-scene-media-lock]") });
        if (!active && w) {
          w.closed = true; w.end = t;
          if (window.__handoffRetry && w.attempt === 1) {
            h.interrupted = { hold: r.target.closest("[data-scene-media-lock]").dataset.sceneTextHold,
              count: document.querySelectorAll("[data-scene-entry-lock]").length };
          }
        }
        if (active && w?.attempt === 1 && window.__handoffRetry) {
            // Interrupt at the observed start boundary, not an 85ms timer that
            // can arrive after the entire effect on a stalled compositor.
            const root = document.querySelector(".vanta-environment-root");
            h.signals.push({ active: true, t: performance.now() });
            root.dataset.vantaSignalActive = "true";
            setTimeout(() => {
              root.dataset.vantaSignalActive = "false";
              h.signals.push({ active: false, t: performance.now() });
            }, 185);
        }
      }
      if (r.attributeName === "data-scene-text-hold" && !r.target.hasAttribute("data-scene-text-hold") &&
          r.target.querySelector("[data-scene-entry-lock]")) {
        const w = byFrame.get(r.target.querySelector("[data-scene-entry-lock]"));
        for (const target of r.target.querySelectorAll(".vanta-transmission-content [data-scene-stage]")) {
          if (target.closest(".vanta-signal-echo")) continue;
          const animation = target.getAnimations().find(a => a instanceof CSSTransition && a.transitionProperty === "opacity");
          if (animation) transitionEffects.set(target, animation);
        }
        h.releases.push({ t, attempt: w?.attempt, delays: Object.fromEntries(
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
    assert.deepEqual(h.observerErrors, [], "Passive lifecycle observer is error-free");
    assert.equal(h.windows.length, starts.length);
    const delays = phone ? { title: 170, metadata: 210, description: 250, controls: 290 }
      : { title: 180, metadata: 250, description: 315, controls: 380 };
    starts.forEach((start, index) => {
      assert.ok(start.scoped && start.count === 1 && start.global !== "true", "Entry stays frame-local");
      assert.deepEqual(start.echoes.map(e => e.name), ["vanta-entry-echo-one", "vanta-entry-echo-two"]);
      assert.ok(start.echoes.every(e => e.time === 0), `Fresh zero timeline: ${JSON.stringify(start)}`);
      const w = h.windows[index];
      assert.equal(w.closed, true);
      const deliveredMiddle = w.progress.filter(p => p.time >= 40 && p.time <= 120);
      if (deliveredMiddle.length) {
        assert.ok(deliveredMiddle.some(p => p.opacity > .03 && p.ancestorOpacity > .1 && p.inViewport),
          "Delivered middle frames show a real visible, viewport-local echo");
      }
      assert.deepEqual(w.echoes.map(e => e.name).sort(), ["vanta-entry-echo-one", "vanta-entry-echo-two"]);
      for (const echo of w.echoes) {
        assert.equal(echo.initialTime, 0);
        assert.equal(echo.duration, 155);
        assert.equal(echo.playState, "paused", "Runtime owns the paused local timeline");
        assert.equal(echo.titleOpacity, 0, "Title held at local-window creation");
        assert.ok(echo.scoped && echo.count === 1 && echo.global !== "true");
        assert.ok(echo.keyframes.some(k => Number(k.opacity) > .03), "Actual echo effect has visible intermediate keyframes");
        const progress = w.progress.filter(e => e.name === echo.name);
        assert.ok(progress.every((e, i) => e.time >= 0 && e.time <= 155 && (i === 0 || e.time >= progress[i - 1].time)),
          "Runtime timeline writes are monotonic and bounded");
        if (!(retry && index === 0)) assert.equal(progress.at(-1).time, 155, "Complete window reaches its real 155ms endpoint before cleanup");
        else assert.ok(progress.at(-1).time < 155, "Interrupted window never reaches completion");
      }
      const release = h.releases[index];
      assert.ok(Math.abs(release.t - start.t) < 5, "Text delay begins at actual local-window start");
      for (const [stage, delay] of Object.entries(release.delays)) assert.equal(Math.round(delay), delays[stage]);
      const duration = ends[index].t - start.t;
      if (retry && index === 0) assert.ok(w.progress.every(e => e.time < 155), "New route signal cancels the incomplete attempt");
      else {
        assert.ok(duration >= 150, `Complete nominal 155ms local window: ${duration}`);
        // Wall time may exceed the nominal animation duration when native frames
        // are delayed. Completion is asserted from real timeline writes above.
        for (const stage of Object.keys(release.delays)) {
          const onset = h.textStarts.find(e => e.attempt === index + 1 && e.stage === stage);
          assert.ok(onset, `${stage}: actual transitionstart event observed`);
          const run = h.transitions.find(e => e.attempt === index + 1 && e.stage === stage && e.type === "transitionrun");
          assert.ok(run && run.t <= onset.t, `${stage}: transitionrun precedes transitionstart`);
          assert.equal(Math.round(run.delay), delays[stage], `${stage}: native transition effect has the preserved delay`);
          assert.equal(onset.elapsedTime, 0, `${stage}: starts at transition's zero boundary`);
        }
        const order = Object.keys(release.delays).sort((a, b) => delays[a] - delays[b]);
        // Events from different targets can be delivered in DOM order in one
        // batch. Their native animation startTime + delay is the real ordering.
        const onsets = order.map(stage => {
          const event = h.textStarts.find(e => e.attempt === index + 1 && e.stage === stage);
          assert.ok(Number.isFinite(event.startTime), `${stage}: native transition startTime available`);
          return event.startTime + event.delay;
        });
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
      lifecycle: h.windows[i], intermediateWritesObserved: h.windows[i].progress.filter(p => p.time > 0 && p.time < 155).length })),
      textStarts: h.textStarts, transitions: h.transitions, routeSignals: h.signals };
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