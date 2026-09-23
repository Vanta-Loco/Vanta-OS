import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "wouter";

export type VantaEnvironmentName =
  | "home"
  | "releases"
  | "worlds"
  | "play"
  | "passport"
  | "os"
  | "transmission"
  | "none";

type EnvironmentLayerProperties = CSSProperties & {
  "--vanta-parallax-multiplier"?: number;
};

type EnvironmentDefinition = {
  name: VantaEnvironmentName;
  parallaxMultiplier: number;
};

const environmentDefinitions: Record<VantaEnvironmentName, EnvironmentDefinition> = {
  home: { name: "home", parallaxMultiplier: 1 },
  releases: { name: "releases", parallaxMultiplier: 0.7 },
  worlds: { name: "worlds", parallaxMultiplier: 1.2 },
  play: { name: "play", parallaxMultiplier: 0.9 },
  passport: { name: "passport", parallaxMultiplier: 0.6 },
  os: { name: "os", parallaxMultiplier: 1 },
  transmission: { name: "transmission", parallaxMultiplier: 0.8 },
  none: { name: "none", parallaxMultiplier: 1 },
};

const crossfadeDuration = 760;

function environmentForPath(pathname: string): VantaEnvironmentName {
  if (pathname === "/") return "home";
  if (pathname === "/releases" || pathname.startsWith("/releases/")) return "releases";
  if (
    pathname === "/worlds" ||
    pathname === "/world" ||
    pathname.startsWith("/world/") ||
    pathname === "/fgh" ||
    pathname === "/fract" ||
    pathname === "/himalayas"
  ) {
    return "worlds";
  }
  if (pathname === "/play") return "play";
  if (
    pathname === "/passport" ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/creator") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/dashboard"
  ) {
    return "passport";
  }
  if (
    pathname === "/enter" ||
    pathname.startsWith("/early-access") ||
    pathname.startsWith("/devlogs")
  ) {
    return "os";
  }
  if (
    pathname.startsWith("/post/") ||
    pathname === "/rooms" ||
    pathname.startsWith("/rooms/") ||
    pathname === "/search" ||
    pathname === "/wireline"
  ) {
    return "transmission";
  }
  if (pathname === "/about" || pathname === "/music") return "home";
  return "none";
}

function EnvironmentLayer({
  environment,
  exiting = false,
}: {
  environment: VantaEnvironmentName;
  exiting?: boolean;
}) {
  if (environment === "none") return null;

  return (
    <div
      aria-hidden="true"
      className={`vanta-environment-atmosphere vanta-environment-atmosphere-${environment} ${
        exiting ? "vanta-environment-atmosphere-exiting" : "vanta-environment-atmosphere-current"
      }`}
    />
  );
}

/**
 * Adds one lightweight, route-aware atmospheric state around the existing app.
 * The current and previous states briefly overlap so navigation crossfades
 * environmental properties without delaying route loading.
 */
export function VantaEnvironmentProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const environment = environmentForPath(location);
  const previousEnvironment = useRef(environment);
  const [transition, setTransition] = useState<{
    from: VantaEnvironmentName;
    to: VantaEnvironmentName;
  } | null>(null);

  useEffect(() => {
    if (previousEnvironment.current === environment) return;

    const from = previousEnvironment.current;
    previousEnvironment.current = environment;
    setTransition({ from, to: environment });

    const timeout = window.setTimeout(() => setTransition(null), crossfadeDuration);
    return () => window.clearTimeout(timeout);
  }, [environment]);

  const definition = environmentDefinitions[environment];
  const style: EnvironmentLayerProperties = {
    "--vanta-parallax-multiplier": definition.parallaxMultiplier,
  };

  return (
    <div
      className="vanta-environment-root"
      data-vanta-environment={environment}
      style={style}
    >
      {transition ? (
        <>
          <EnvironmentLayer environment={transition.from} exiting />
          <EnvironmentLayer environment={transition.to} />
        </>
      ) : (
        <EnvironmentLayer environment={environment} />
      )}
      <div className="vanta-environment-content">{children}</div>
    </div>
  );
}

export { environmentForPath };