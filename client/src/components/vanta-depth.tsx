import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

type VantaDepthProperties = CSSProperties & {
  "--vanta-depth"?: string;
  "--vanta-depth-mobile"?: string;
};

type VantaDepthProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

type ParallaxLayerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  depth?: number;
  mobileDepth?: number;
};

/**
 * Adds one scroll-progress value to a section. Layers consume that value in CSS,
 * so scrolling does not cause React renders or layout changes.
 */
export function VantaDepth({ children, className = "", ...props }: VantaDepthProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateProgress = () => {
      if (frame) return;

      frame = window.requestAnimationFrame(() => {
        frame = 0;

        if (reducedMotion.matches) {
          section.style.setProperty("--vanta-scroll-progress", "0");
          section.style.setProperty("--vanta-camera-scale", "1");
          return;
        }

        const bounds = section.getBoundingClientRect();
        const viewportHeight = window.innerHeight || 1;
        const sectionCenter = bounds.top + bounds.height / 2;
        const travel = Math.max(viewportHeight / 2 + bounds.height / 2, 1);
        const progress = Math.max(-1, Math.min(1, (viewportHeight / 2 - sectionCenter) / travel));

        const cameraScale = 1.02 + progress * 0.025;
        section.style.setProperty("--vanta-scroll-progress", progress.toFixed(4));
        section.style.setProperty("--vanta-camera-scale", cameraScale.toFixed(4));
      });
    };

    const handleMotionPreference = () => updateProgress();

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    reducedMotion.addEventListener?.("change", handleMotionPreference);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      reducedMotion.removeEventListener?.("change", handleMotionPreference);
    };
  }, []);

  return (
    <section ref={sectionRef} className={`vanta-depth-root ${className}`} {...props}>
      {children}
    </section>
  );
}

export function ParallaxLayer({ children, className = "", depth = 0, mobileDepth, style, ...props }: ParallaxLayerProps) {
  const layerStyle: VantaDepthProperties = {
    ...style,
    "--vanta-depth": `${depth}px`,
    "--vanta-depth-mobile": `${mobileDepth ?? Math.round(depth * 0.88)}px`,
  };

  return (
    <div className={`vanta-depth-layer ${className}`} style={layerStyle} {...props}>
      {children}
    </div>
  );
}

export function AtmosphericOverlay({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`vanta-atmosphere ${className}`} {...props} />;
}