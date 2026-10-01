import { useLayoutEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

type SceneRevealProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  delay?: number;
  onReveal?: () => void;
  variant?: "staged" | "simple" | "mechanical";
  mediaLock?: boolean;
};

type SpatialSectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

/**
 * One-time, viewport-aware assembly. The section is never removed from the
 * accessibility tree; focus and unsupported observer environments reveal it.
 */
export function SceneReveal({ children, className = "", delay = 0, onReveal, variant = "staged", mediaLock = false, style, ...props }: SceneRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (element.dataset.sceneRevealed === "true") return;

    let observer: IntersectionObserver | undefined;
    let signalObserver: MutationObserver | undefined;
    const timers: number[] = [];
    const clearLock = () => {
      signalObserver?.disconnect();
      signalObserver = undefined;
      timers.forEach(window.clearTimeout);
      timers.length = 0;
      element.querySelectorAll("[data-scene-entry-lock]").forEach((frame) => {
        frame.removeAttribute("data-scene-entry-lock");
      });
    };
    const revealForFocus = () => {
      element.dataset.sceneImmediate = "true";
      clearLock();
      reveal();
    };
    const reveal = () => {
      if (element.dataset.sceneRevealed === "true") return;
      element.dataset.sceneRevealed = "true";
      delete element.dataset.scenePending;
      onRevealRef.current?.();
      observer?.unobserve(element);
      // The local echo follows a route signal rather than disappearing beneath it.
      // No provider event is dispatched, so other signal surfaces stay clean.
      if (mediaLock && !reducedMotion.matches && !element.matches(":focus-within")) {
        const frames = Array.from(element.querySelectorAll<HTMLElement>("[data-vanta-transmission-frame]"));
        const mobile = window.matchMedia("(max-width: 767px)").matches;
        const start = mobile ? 90 : 140;
        const stagger = mobile ? Math.round(delay * .5) : delay;
        const environment = element.closest<HTMLElement>(".vanta-environment-root");
        const beginLock = () => {
          if (reducedMotion.matches || element.matches(":focus-within")) return;
          frames.forEach((frame) => frame.dataset.sceneEntryLock = "true");
          timers.push(window.setTimeout(clearLock, 155));
        };
        timers.push(window.setTimeout(() => {
          if (reducedMotion.matches || element.matches(":focus-within")) return;
          if (environment?.dataset.vantaSignalActive === "true") {
            signalObserver = new MutationObserver(() => {
              if (environment.dataset.vantaSignalActive === "true") return;
              signalObserver?.disconnect();
              signalObserver = undefined;
              beginLock();
            });
            signalObserver.observe(environment, { attributes: true, attributeFilter: ["data-vanta-signal-active"] });
          } else {
            beginLock();
          }
        }, stagger + start));
      }
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      if (event.matches) {
        element.dataset.sceneImmediate = "true";
        clearLock();
        reveal();
      }
    };

    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", handleMotionPreference);
    } else {
      reducedMotion.addListener(handleMotionPreference);
    }

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      reveal();
    } else {
      element.dataset.scenePending = "true";
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        // Tall articles cannot reach a percentage threshold in a phone viewport.
        { threshold: 0, rootMargin: "0px 0px -48px 0px" },
      );
      observer.observe(element);
    }
    element.addEventListener("focusin", revealForFocus);

    return () => {
      observer?.disconnect();
      clearLock();
      if (reducedMotion.removeEventListener) {
        reducedMotion.removeEventListener("change", handleMotionPreference);
      } else {
        reducedMotion.removeListener(handleMotionPreference);
      }
      element.removeEventListener("focusin", revealForFocus);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`vanta-scene-reveal ${className}`}
      data-scene-variant={variant}
      data-scene-media-lock={mediaLock ? "true" : undefined}
      style={{ "--scene-reveal-delay": `${delay}ms`, "--scene-phone-delay": `${Math.round(delay * .5)}ms`, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}

/** Atmospheric layers are decorative; underlying photography remains intact. */
export function LivingScene({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`vanta-living-scene ${className}`} aria-hidden="true" {...props}>
      <span className="vanta-scene-light" />
      <span className="vanta-scene-fog vanta-scene-fog-one" />
      <span className="vanta-scene-fog vanta-scene-fog-two" />
      {children}
    </div>
  );
}

export function SceneLayer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`vanta-scene-layer ${className}`} aria-hidden="true" {...props} />;
}

export function SceneLight({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`vanta-scene-light ${className}`} aria-hidden="true" {...props} />;
}

export function SceneFog({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`vanta-scene-fog ${className}`} aria-hidden="true" {...props} />;
}

export function SceneAccent({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`vanta-scene-accent ${className}`} aria-hidden="true" {...props} />;
}

export function SpatialSection({ children, className = "", ...props }: SpatialSectionProps) {
  return (
    <section className={`vanta-spatial-section ${className}`} {...props}>
      {children}
    </section>
  );
}