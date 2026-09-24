import { useEffect, useRef } from "react";

type ScrollState = "calm" | "active" | "unstable" | "settling";

type ScrollRootRef = {
  current: HTMLElement | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Samples native scrolling once per animation frame and writes bounded motion
 * values to the environment root without scheduling React renders.
 */
export function useVantaScrollVelocity(rootRef: ScrollRootRef, intensity: number) {
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | null = null;
    let lastScrollY = window.scrollY;
    let lastSampleAt = performance.now();
    let lastInputAt = 0;
    let lastFrameAt = lastSampleAt;
    let scrollDelta = 0;
    let direction = 0;
    let rawVelocity = 0;
    let smoothedVelocity = 0;
    let state: ScrollState = "calm";
    let active = false;

    const writeValues = (energy: number) => {
      const scaledEnergy = clamp(energy * intensityRef.current, 0, 1);
      const signedEnergy = direction * scaledEnergy;

      root.style.setProperty("--vanta-scroll-velocity", rawVelocity.toFixed(3));
      root.style.setProperty("--vanta-scroll-smoothed-velocity", smoothedVelocity.toFixed(3));
      root.style.setProperty("--vanta-scroll-energy", scaledEnergy.toFixed(3));
      root.style.setProperty("--vanta-scroll-direction", String(direction));
      root.style.setProperty("--vanta-scroll-delta", `${scrollDelta.toFixed(1)}px`);
      root.style.setProperty("--vanta-scroll-parallax-boost", (1 + scaledEnergy * 0.16).toFixed(3));
      root.style.setProperty("--vanta-scroll-split-one", `${(signedEnergy * 3).toFixed(2)}px`);
      root.style.setProperty("--vanta-scroll-split-two", `${(signedEnergy * -2).toFixed(2)}px`);
      root.style.setProperty("--vanta-scroll-echo-opacity", (scaledEnergy * 0.17).toFixed(3));
      root.style.setProperty("--vanta-scroll-band-opacity", (scaledEnergy * 0.085).toFixed(3));
      root.style.setProperty("--vanta-scroll-band-offset", `${(signedEnergy * 2).toFixed(2)}px`);
      root.style.setProperty("--vanta-scroll-haze-offset", `${(signedEnergy * 8).toFixed(2)}px`);
      root.style.setProperty("--vanta-scroll-sweep-opacity", (scaledEnergy * 0.1).toFixed(3));
      root.style.setProperty("--vanta-scroll-sweep-offset", `${(signedEnergy * 2).toFixed(2)}px`);
      root.style.setProperty("--vanta-scroll-brightness", (1 + scaledEnergy * 0.025).toFixed(3));
      root.dataset.vantaScrollEnergy = scaledEnergy.toFixed(3);
    };

    const reset = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      rawVelocity = 0;
      smoothedVelocity = 0;
      scrollDelta = 0;
      direction = 0;
      active = false;
      state = "calm";
      lastScrollY = window.scrollY;
      lastSampleAt = performance.now();
      lastFrameAt = lastSampleAt;
      lastInputAt = 0;
      root.dataset.vantaScrollState = state;
      root.dataset.vantaScrollActive = "false";
      root.dataset.vantaScrollDirection = "idle";
      writeValues(0);
    };

    const updateState = (recentInput: boolean) => {
      if (!recentInput) {
        return smoothedVelocity > 0.018 ? "settling" : "calm";
      }

      if (state === "unstable") {
        if (smoothedVelocity >= 0.36) return "unstable";
        if (smoothedVelocity >= 0.045) return "active";
        return "calm";
      }

      if (state === "active") {
        if (smoothedVelocity >= 0.5) return "unstable";
        if (smoothedVelocity >= 0.035) return "active";
        return "calm";
      }

      if (smoothedVelocity >= 0.5) return "unstable";
      if (smoothedVelocity >= 0.055) return "active";
      return "calm";
    };

    const tick = (now: number) => {
      frameId = null;
      const elapsed = clamp(now - lastFrameAt, 1, 50);
      lastFrameAt = now;

      const recentInput = now - lastInputAt < 95;
      const targetVelocity = recentInput ? rawVelocity : 0;
      const timeConstant = targetVelocity > smoothedVelocity ? 58 : 170;
      const smoothing = 1 - Math.exp(-elapsed / timeConstant);
      smoothedVelocity += (targetVelocity - smoothedVelocity) * smoothing;
      rawVelocity *= Math.exp(-elapsed / 90);

      const nextState = updateState(recentInput);
      active = recentInput;
      if (nextState !== state) {
        state = nextState;
        root.dataset.vantaScrollState = state;
      }
      root.dataset.vantaScrollActive = active ? "true" : "false";
      root.dataset.vantaScrollDirection = direction > 0 ? "down" : direction < 0 ? "up" : "idle";
      writeValues(smoothedVelocity);

      if (active || smoothedVelocity > 0.006 || rawVelocity > 0.006) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        rawVelocity = 0;
        smoothedVelocity = 0;
        scrollDelta = 0;
        direction = 0;
        state = "calm";
        root.dataset.vantaScrollState = state;
        root.dataset.vantaScrollActive = "false";
        root.dataset.vantaScrollDirection = "idle";
        writeValues(0);
      }
    };

    const handleScroll = () => {
      const now = performance.now();
      const nextScrollY = window.scrollY;
      const elapsed = Math.max(8, now - lastSampleAt);
      scrollDelta = nextScrollY - lastScrollY;
      lastScrollY = nextScrollY;
      lastSampleAt = now;
      lastInputAt = now;

      if (scrollDelta !== 0) {
        direction = Math.sign(scrollDelta);
        rawVelocity = clamp(Math.abs(scrollDelta) / elapsed / 2.2, 0, 1);
      } else {
        rawVelocity = 0;
      }

      if (reducedMotion.matches) return;
      if (frameId === null) frameId = window.requestAnimationFrame(tick);
    };

    const handleMotionPreference = () => {
      reset();
    };

    root.dataset.vantaScrollState = "calm";
    root.dataset.vantaScrollActive = "false";
    root.dataset.vantaScrollDirection = "idle";
    writeValues(0);
    window.addEventListener("scroll", handleScroll, { passive: true });
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", handleMotionPreference);
    } else {
      reducedMotion.addListener(handleMotionPreference);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (reducedMotion.removeEventListener) {
        reducedMotion.removeEventListener("change", handleMotionPreference);
      } else {
        reducedMotion.removeListener(handleMotionPreference);
      }
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [rootRef]);
}