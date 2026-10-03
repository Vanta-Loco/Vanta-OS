import { useEffect, useRef } from "react";
import type { StudioScene } from "./vanta-studio-scene";
import "./vanta-studio-atmosphere.css";

const FRAME_MS = 1000 / 24;

/**
 * An optional, hero-local enhancement. The photo and CSS scene never depend on
 * this component's readiness, eligibility, renderer, or context.
 */
export function StudioAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    const hero = host?.closest<HTMLElement>(".vanta-hero-depth");
    if (!host || !hero) return;
    if (!("IntersectionObserver" in window) || !("ResizeObserver" in window)) {
      host.dataset.studioState = "css";
      host.dataset.studioReason = "unsupported-observers";
      return;
    }
    const environment = hero.closest<HTMLElement>(".vanta-environment-root");
    const image = hero.querySelector<HTMLImageElement>(".vanta-hero-image");
    const desktop = matchMedia("(min-width: 768px) and (pointer: fine)");
    const coarse = matchMedia("(any-pointer: coarse)");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let scene: StudioScene | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let viewport = false;
    let failed = false;
    let gone = false;
    let loading = false;
    let generation = 0;
    let timer: number | undefined;
    let frame: number | undefined;
    let clock = 0;
    let previousStamp = 0;
    let count = 0;
    let pointerX = 0;
    let pointerY = 0;
    let currentX = 0;
    let currentY = 0;
    const eligible = () => desktop.matches && !coarse.matches && !motion.matches;
    const active = () => eligible() && viewport && !document.hidden && !gone && !failed;
    const state = (value: string, reason = "") => {
      if (host.dataset.studioState !== value) host.dataset.studioState = value;
      if (host.dataset.studioReason !== reason) host.dataset.studioReason = reason;
    };
    const stop = () => {
      window.clearTimeout(timer);
      timer = undefined;
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      previousStamp = 0;
    };
    const dispose = () => {
      stop();
      generation++;
      loading = false;
      canvas?.removeEventListener("webglcontextlost", contextLost);
      const renderer = scene?.renderer;
      scene?.dispose();
      if (renderer) host.dataset.studioRemainingGeometries = String(renderer.info.memory.geometries);
      scene = undefined;
      canvas?.remove();
      canvas = undefined;
      host.dataset.studioDisposed = "true";
    };
    const fail = (reason: string, error?: unknown) => {
      failed = true;
      dispose();
      state("fallback", reason);
      console.warn("[Vanta studio] Optional atmosphere stopped; original CSS scene retained.", reason, error || "");
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      // Do not fight a lost context or repeatedly allocate new ones.
      fail("context-lost");
    };
    const resize = () => {
      if (!scene) return;
      // Local dimensions exclude inherited camera/parallax transforms. Both the
      // photo and canvas receive those transforms together, without double zoom.
      scene.resize(host.clientWidth, host.clientHeight, devicePixelRatio);
      host.dataset.studioPixelRatio = String(scene.renderer.getPixelRatio());
    };
    const tick = (stamp: number) => {
      frame = undefined;
      if (!active() || !scene) { reconcile(); return; }
      clock += previousStamp ? Math.min((stamp - previousStamp) / 1000, .1) : 0;
      previousStamp = stamp;
      currentX += (pointerX - currentX) * .09;
      currentY += (pointerY - currentY) * .09;
      const signal = environment?.dataset.vantaSignalActive === "true";
      const energy = signal ? 0 : Number(environment?.style.getPropertyValue("--vanta-scroll-energy") || 0);
      try {
        scene.render(clock, currentX, currentY, energy);
        host.dataset.studioFrames = String(++count);
        host.dataset.studioDrawCalls = String(scene.renderer.info.render.calls);
        host.dataset.studioPoints = String(scene.renderer.info.render.points);
        host.dataset.studioTriangles = String(scene.renderer.info.render.triangles);
        state("rendering");
      } catch (error) { fail("render-error", error); return; }
      // One bounded timer and one delivered frame; no permanent 60fps loop.
      timer = window.setTimeout(() => {
        timer = undefined;
        if (active()) frame = requestAnimationFrame(tick);
        else reconcile();
      }, FRAME_MS);
    };
    const start = () => {
      if (!active() || !scene || timer !== undefined || frame !== undefined) return;
      frame = requestAnimationFrame(tick);
    };
    const prepare = () => {
      if (!active() || scene || loading) return;
      const title = hero.querySelector<HTMLElement>('[data-testid="text-hero-title"]');
      if (!image?.complete || !image.naturalWidth || !title || Number(getComputedStyle(title).opacity) < .99) {
        timer = window.setTimeout(() => { timer = undefined; reconcile(); }, 120);
        return;
      }
      loading = true;
      state("loading");
      const request = ++generation;
      // A separate chunk, requested only after normal image AND original title are visible.
      void import("./vanta-studio-scene").then(module => {
        if (gone || failed || request !== generation) return;
        loading = false;
        if (!active()) { reconcile(); return; }
        canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        canvas.addEventListener("webglcontextlost", contextLost);
        try {
          scene = module.createStudioScene(canvas);
          host.append(canvas);
          host.dataset.studioDisposed = "false";
          resize();
          start();
        } catch (error) { fail("webgl-unavailable", error); }
      }).catch(error => {
        if (!gone && request === generation) fail("load-error", error);
      });
    };
    const reconcile = () => {
      if (gone || failed) return;
      if (!eligible()) {
        dispose();
        state("css", motion.matches ? "reduced-motion" : "ineligible-device");
      } else if (!viewport || document.hidden) {
        stop();
        state(scene ? "paused" : "waiting", document.hidden ? "hidden" : "offscreen");
      } else if (scene) start();
      else if (!loading && timer === undefined) prepare();
    };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // No layout reads on pointer movement, and no transforms on the hero.
      pointerX = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1));
    };
    const leave = () => { pointerX = 0; pointerY = 0; };
    const intersection = new IntersectionObserver(entries => {
      viewport = entries.some(entry => entry.isIntersecting);
      reconcile();
    }, { threshold: 0 });
    const size = new ResizeObserver(resize);
    intersection.observe(hero);
    size.observe(host);
    for (const query of [desktop, coarse, motion]) {
      if (query.addEventListener) query.addEventListener("change", reconcile);
      else query.addListener(reconcile);
    }
    document.addEventListener("visibilitychange", reconcile);
    hero.addEventListener("pointermove", pointer, { passive: true });
    hero.addEventListener("pointerleave", leave);
    reconcile();
    return () => {
      gone = true;
      dispose();
      state("disposed");
      intersection.disconnect();
      size.disconnect();
      for (const query of [desktop, coarse, motion]) {
        if (query.removeEventListener) query.removeEventListener("change", reconcile);
        else query.removeListener(reconcile);
      }
      document.removeEventListener("visibilitychange", reconcile);
      hero.removeEventListener("pointermove", pointer);
      hero.removeEventListener("pointerleave", leave);
    };
  }, []);
  return <div ref={ref} className="vanta-studio-atmosphere" data-studio-state="waiting" aria-hidden="true" />;
}