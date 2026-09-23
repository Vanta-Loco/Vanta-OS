import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { environmentForPath, type VantaEnvironmentName } from "@/components/vanta-environment";

export type VantaSignalIntensity = "subtle" | "medium" | "strong";

type SignalStyle = CSSProperties & {
  "--vanta-signal-duration"?: string;
  "--vanta-signal-split"?: string;
  "--vanta-signal-noise"?: number;
  "--vanta-signal-tear"?: number;
  "--vanta-signal-flash"?: number;
};

type SignalDefinition = {
  intensity: VantaSignalIntensity;
  duration: number;
  split: number;
  noise: number;
  tear: number;
  flash: number;
};

const signalDefinitions: Record<VantaSignalIntensity, SignalDefinition> = {
  subtle: { intensity: "subtle", duration: 190, split: 2, noise: 0.16, tear: 0.22, flash: 0.035 },
  medium: { intensity: "medium", duration: 280, split: 5, noise: 0.25, tear: 0.34, flash: 0.055 },
  strong: { intensity: "strong", duration: 330, split: 8, noise: 0.34, tear: 0.48, flash: 0.08 },
};

const signalIntensityForEnvironment: Record<VantaEnvironmentName, VantaSignalIntensity | null> = {
  home: "subtle",
  releases: "subtle",
  worlds: "medium",
  play: null,
  passport: null,
  os: "strong",
  transmission: "medium",
  none: null,
};

const signalContext = createContext<((intensity?: VantaSignalIntensity) => void) | null>(null);

function signalLabel(environment: VantaEnvironmentName) {
  if (environment === "transmission") return "VANTA TRANSMISSION // FEED";
  if (environment === "os") return "VANTA OS // SIGNAL";
  if (environment === "worlds") return "WORLD CHANNEL IDENTIFIED";
  return "VANTA SIGNAL // CHANNEL SHIFT";
}

function signalEventForPath(pathname: string, id: number) {
  const environment = environmentForPath(pathname);
  const intensity = signalIntensityForEnvironment[environment];
  if (!intensity) return null;

  const definition = signalDefinitions[intensity];
  const duration = environment === "transmission" ? 480 : definition.duration;

  return {
    id,
    environment,
    intensity,
    duration,
    label: signalLabel(environment),
  };
}

function SignalOverlay({
  event,
}: {
  event: NonNullable<ReturnType<typeof signalEventForPath>>;
}) {
  const definition = signalDefinitions[event.intensity];
  const style: SignalStyle = {
    "--vanta-signal-duration": `${event.duration}ms`,
    "--vanta-signal-split": `${definition.split}px`,
    "--vanta-signal-noise": definition.noise,
    "--vanta-signal-tear": definition.tear,
    "--vanta-signal-flash": definition.flash,
  };

  return (
    <div
      key={event.id}
      aria-hidden="true"
      className={`vanta-signal-overlay vanta-signal-overlay-${event.intensity}`}
      style={style}
      data-vanta-signal-active="true"
      data-vanta-signal-environment={event.environment}
    >
      <div className="vanta-signal-noise" />
      <div className="vanta-signal-tear vanta-signal-tear-one" />
      <div className="vanta-signal-tear vanta-signal-tear-two" />
      <div className="vanta-signal-readout">
        <span>{event.label}</span>
        <span className="vanta-signal-readout-status">SIGNAL LOCKED</span>
      </div>
    </div>
  );
}

/**
 * Adds deterministic, short signal events for page entry and route changes.
 * The overlay never captures input and never delays rendering the next route.
 */
export function VantaSignalProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const eventId = useRef(0);
  const [event, setEvent] = useState<NonNullable<ReturnType<typeof signalEventForPath>> | null>(null);

  useEffect(() => {
    const nextEvent = signalEventForPath(location, ++eventId.current);
    setEvent(nextEvent);
    if (!nextEvent) return;

    const timeout = window.setTimeout(() => setEvent(null), nextEvent.duration + 80);
    return () => window.clearTimeout(timeout);
  }, [location]);

  const triggerSignal = (requestedIntensity?: VantaSignalIntensity) => {
    const environment = environmentForPath(location);
    const intensity = requestedIntensity ?? signalIntensityForEnvironment[environment];
    if (!intensity) return;

    const definition = signalDefinitions[intensity];
    const duration = environment === "transmission" ? 480 : definition.duration;
    setEvent({
      id: ++eventId.current,
      environment,
      intensity,
      duration,
      label: signalLabel(environment),
    });
  };

  return (
    <signalContext.Provider value={triggerSignal}>
      {children}
      {event && <SignalOverlay event={event} />}
    </signalContext.Provider>
  );
}

export function useVantaSignal() {
  const triggerSignal = useContext(signalContext);
  return triggerSignal ?? (() => undefined);
}

type SignalGlitchProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  intensity?: VantaSignalIntensity;
};

/**
 * A contained, hover/focus signal disturbance for selected media or controls.
 */
export function SignalGlitch({
  children,
  intensity = "subtle",
  className = "",
  ...props
}: SignalGlitchProps) {
  return (
    <div
      className={`vanta-signal-glitch vanta-signal-glitch-${intensity} ${className}`}
      data-vanta-signal-glitch="interactive"
      {...props}
    >
      {children}
    </div>
  );
}

type TransmissionFrameProps = {
  children: ReactNode;
  label?: string;
  metadata?: string;
  intensity?: VantaSignalIntensity;
  className?: string;
};

/**
 * Frames existing Transmission media as a restrained Vanta broadcast screen.
 */
export function TransmissionFrame({
  children,
  label = "VANTA TRANSMISSION",
  metadata = "NOW RECEIVING",
  intensity = "medium",
  className = "",
}: TransmissionFrameProps) {
  return (
    <div
      className={`vanta-transmission-frame vanta-transmission-frame-${intensity} ${className}`}
      data-vanta-transmission-frame="true"
    >
      <div className="vanta-transmission-screen">
        {children}
        <div className="vanta-transmission-screen-glow" />
        <div className="vanta-transmission-scanlines" />
        <div className="vanta-transmission-vignette" />
        <div className="vanta-transmission-label">{label}</div>
        <div className="vanta-transmission-metadata">{metadata}</div>
      </div>
    </div>
  );
}

type GlitchTextProps = {
  children: string;
  intensity?: VantaSignalIntensity;
  className?: string;
};

/**
 * Briefly corrupts selected system labels while keeping the accessible text stable.
 */
export function GlitchText({
  children,
  intensity = "subtle",
  className = "",
}: GlitchTextProps) {
  return (
    <span
      className={`vanta-glitch-text vanta-glitch-text-${intensity} ${className}`}
      data-text={children}
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{children}</span>
    </span>
  );
}

export { signalDefinitions, signalIntensityForEnvironment };