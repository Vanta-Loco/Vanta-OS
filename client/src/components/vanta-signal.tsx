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
  "--vanta-signal-tear"?: number;
};

type SignalDefinition = {
  intensity: VantaSignalIntensity;
  duration: number;
  split: number;
  tear: number;
};

const signalDefinitions: Record<VantaSignalIntensity, SignalDefinition> = {
  subtle: { intensity: "subtle", duration: 155, split: 8, tear: 0.22 },
  medium: { intensity: "medium", duration: 205, split: 12, tear: 0.34 },
  strong: { intensity: "strong", duration: 235, split: 16, tear: 0.46 },
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

function signalEventForPath(pathname: string, id: number) {
  const environment = environmentForPath(pathname);
  const intensity = signalIntensityForEnvironment[environment];
  if (!intensity) return null;

  const duration = environment === "transmission" ? 245 : signalDefinitions[intensity].duration;

  return {
    id,
    environment,
    intensity,
    duration,
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
    "--vanta-signal-tear": definition.tear,
  };

  return (
    <div
      key={event.id}
      aria-hidden="true"
      className={`vanta-signal-event vanta-signal-event-${event.intensity}`}
      style={style}
      data-vanta-signal-active="true"
      data-vanta-signal-environment={event.environment}
    >
      <div className="vanta-signal-band vanta-signal-band-one" />
      <div className="vanta-signal-band vanta-signal-band-two" />
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
  const homeEntryCount = useRef(0);
  const [event, setEvent] = useState<NonNullable<ReturnType<typeof signalEventForPath>> | null>(null);

  useEffect(() => {
    const environment = environmentForPath(location);
    let shouldSignal = true;

    if (environment === "home") {
      homeEntryCount.current += 1;
      shouldSignal = homeEntryCount.current === 1 || homeEntryCount.current % 4 === 0;
    }

    const nextEvent = shouldSignal
      ? signalEventForPath(location, ++eventId.current)
      : null;
    setEvent(nextEvent);
    if (!nextEvent) return;

    const timeout = window.setTimeout(() => {
      setEvent((current) => current?.id === nextEvent.id ? null : current);
    }, nextEvent.duration);
    return () => window.clearTimeout(timeout);
  }, [location]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".vanta-environment-root");
    if (!root) return;

    if (event) {
      root.dataset.vantaSignalActive = "true";
      root.dataset.vantaSignalIntensity = event.intensity;
      root.dataset.vantaSignalEnvironment = event.environment;
    } else {
      delete root.dataset.vantaSignalActive;
      delete root.dataset.vantaSignalIntensity;
      delete root.dataset.vantaSignalEnvironment;
    }

    return () => {
      delete root.dataset.vantaSignalActive;
      delete root.dataset.vantaSignalIntensity;
      delete root.dataset.vantaSignalEnvironment;
    };
  }, [event]);

  const triggerSignal = (requestedIntensity?: VantaSignalIntensity) => {
    const environment = environmentForPath(location);
    const intensity = requestedIntensity ?? signalIntensityForEnvironment[environment];
    if (!intensity) return;

    const definition = signalDefinitions[intensity];
    const duration = environment === "transmission" ? 245 : definition.duration;
    const id = ++eventId.current;
    setEvent({
      id,
      environment,
      intensity,
      duration,
    });

    window.setTimeout(() => setEvent((current) => (
      current?.id === id ? null : current
    )), duration);
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
      <div className="vanta-signal-content">{children}</div>
      <SignalEchoLayers>{children}</SignalEchoLayers>
    </div>
  );
}

function SignalEchoLayers({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="vanta-signal-echo vanta-signal-echo-one" aria-hidden="true">
        <div className="vanta-signal-echo-content">{children}</div>
      </div>
      <div className="vanta-signal-echo vanta-signal-echo-two" aria-hidden="true">
        <div className="vanta-signal-echo-content">{children}</div>
      </div>
    </>
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
        <div className="vanta-transmission-content">{children}</div>
        <SignalEchoLayers>{children}</SignalEchoLayers>
        <div className="vanta-transmission-screen-glow" />
        <div className="vanta-transmission-scan-sweep" />
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
      data-glitch-text={children.replace(/I/g, "1").replace(/O/g, "0").replace(/S/g, "5")}
    >
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{children}</span>
    </span>
  );
}
