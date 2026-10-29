import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject } from "react";
import type { ActiveMission } from "./progression";
import {
  STATION_BOUNDS,
  STATION_EXIT,
  STATION_INTERACTABLES,
  STATION_NPCS,
  STATION_PATHS,
  STATION_ROOMS,
  STATION_WALLS,
  getStationObjectivePins,
  stationLocalToMap,
  stationRectToMap,
  type StationLocalPoint,
} from "./station-world";
import "./StationMinimap.css";

export type StationMinimapNpcPosition = { id: string; x: number; y: number };
export type StationMinimapLiveState = {
  player: StationLocalPoint;
  npcs: StationMinimapNpcPosition[];
};

type Props = {
  liveStateRef: MutableRefObject<StationMinimapLiveState>;
  activeMission: ActiveMission | null;
  hidden?: boolean;
};

function markerTransform(point: StationLocalPoint) {
  const mapped = stationLocalToMap(point);
  return `translate(${mapped.x} ${mapped.y})`;
}

export function StationMinimap({ liveStateRef, activeMission, hidden = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const positionRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const objectivePins = getStationObjectivePins(activeMission);
  const mapBounds = stationRectToMap({
    x: STATION_BOUNDS.minX,
    y: STATION_BOUNDS.minY,
    width: STATION_BOUNDS.maxX - STATION_BOUNDS.minX,
    height: STATION_BOUNDS.maxY - STATION_BOUNDS.minY,
  });
  const exitPoint = stationLocalToMap(STATION_EXIT);

  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    let active = true;
    const updateLiveMarkers = () => {
      if (!active) return;
      const svg = svgRef.current;
      const state = liveStateRef.current;
      const player = svg?.querySelector<SVGGElement>("[data-live-player]");
      if (player) {
        player.setAttribute("transform", markerTransform(state.player));
        player.setAttribute(
          "aria-label",
          `Player, station-local position X ${state.player.x.toFixed(1)}, Y ${state.player.y.toFixed(1)}`,
        );
      }

      for (const npc of state.npcs) {
        svg?.querySelector<SVGGElement>(`[data-npc-marker="${npc.id}"]`)
          ?.setAttribute("transform", markerTransform(npc));
      }

      svg?.querySelectorAll<SVGGElement>("[data-follow-npc-id]").forEach((marker) => {
        const npcId = marker.dataset.followNpcId;
        const target = state.npcs.find((npc) => npc.id === npcId);
        if (target) marker.setAttribute("transform", markerTransform(target));
      });

      if (positionRef.current) {
        positionRef.current.textContent = `X ${state.player.x.toFixed(1)} · Y ${state.player.y.toFixed(1)}`;
      }
      frame = requestAnimationFrame(updateLiveMarkers);
    };
    frame = requestAnimationFrame(updateLiveMarkers);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [hidden, liveStateRef]);

  useEffect(() => {
    if (!expanded || hidden) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded, hidden]);

  return (
    <section
      className={`gp-station-map${expanded ? " gp-station-map--expanded" : ""}${hidden ? " is-hidden" : ""}`}
      aria-label="Live station minimap"
      data-testid="gp-station-minimap"
      aria-hidden={hidden}
    >
      <header className="gp-station-map__header">
        <div>
          <span className="gp-station-map__kicker">THE BRIZZ GENERAL’S STATION</span>
          <strong>DECK MAP <i aria-hidden="true">·</i> LIVE</strong>
        </div>
        <span ref={positionRef} className="gp-station-map__position" data-live-position aria-label="Player station-local coordinates">
          X 0.0 · Y 0.0
        </span>
        <button
          type="button"
          className="gp-station-map__toggle"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse station map" : "Expand station map"}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "−" : "+"}
        </button>
      </header>

      <svg
        ref={svgRef}
        className="gp-station-map__svg"
        viewBox="-5 -5 290 280"
        role="group"
        aria-label="Top-down station map. Station-local X and Y coordinates. Player marker updates live."
      >
        <defs>
          <pattern id="gp-station-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke="rgba(185,205,190,.11)" strokeWidth=".65" />
          </pattern>
          <pattern id="gp-station-lock-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="rgba(140,76,69,.11)" />
            <path d="M0 0V6" stroke="rgba(216,116,102,.35)" strokeWidth="1.5" />
          </pattern>
        </defs>

        <rect x={mapBounds.x} y={mapBounds.y} width={mapBounds.width} height={mapBounds.height} className="gp-station-map__floor" />
        <rect x={mapBounds.x} y={mapBounds.y} width={mapBounds.width} height={mapBounds.height} fill="url(#gp-station-grid)" />

        <g className="gp-station-map__rooms" aria-label="Station rooms">
          {STATION_ROOMS.map((room) => {
            const rect = stationRectToMap(room);
            const label = stationLocalToMap({ x: room.labelX, y: room.labelY });
            const isLocked = "locked" in room && room.locked;
            return (
              <g key={room.id} className={`gp-station-room${isLocked ? " is-locked" : ""}`}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  rx="1.2"
                  style={{ "--room-tint": room.color } as CSSProperties}
                />
                {isLocked && <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx="1.2" fill="url(#gp-station-lock-hatch)" />}
                <text x={label.x} y={label.y} className="gp-station-room__label">
                  <title>{room.name}</title>
                  {expanded ? room.name : room.shortName}
                </text>
              </g>
            );
          })}
        </g>

        <g className="gp-station-map__paths" aria-label="Walkable deck paths">
          {STATION_PATHS.map((path) => (
            <polyline
              key={path.id}
              points={path.points.map((point) => {
                const mapped = stationLocalToMap(point);
                return `${mapped.x},${mapped.y}`;
              }).join(" ")}
            />
          ))}
        </g>

        <g className="gp-station-map__walls" aria-label="Collision walls">
          {STATION_WALLS.map((wall) => {
            const rect = stationRectToMap({ x: wall.x, y: wall.y, width: wall.w, height: wall.h });
            return (
              <rect
                key={wall.label}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx=".7"
                className="gp-station-wall"
                role="img"
                aria-label={`${wall.label} wall`}
              >
                <title>{wall.label}</title>
              </rect>
            );
          })}
        </g>

        <g
          transform={`translate(${exitPoint.x} ${exitPoint.y})`}
          className="gp-station-marker gp-station-marker--exit"
          role="img"
          aria-label="Vanta Worlds portal at the station entrance. Use the Vanta Worlds link to exit."
        >
          <title>Vanta Worlds portal / station entrance</title>
          <circle r="4.1" />
          <text y="1.2">{STATION_EXIT.icon}</text>
          <text className="gp-station-marker__label" x="5.2" y="-3.8">{STATION_EXIT.shortLabel}</text>
        </g>

        {STATION_INTERACTABLES.map((interactable) => {
          const point = stationLocalToMap(interactable);
          const isLocked = "locked" in interactable && interactable.locked;
          return (
            <g
              key={interactable.id}
              transform={`translate(${point.x} ${point.y})`}
              className={`gp-station-marker gp-station-marker--interactable${isLocked ? " is-locked" : ""}`}
              role="img"
              aria-label={`${interactable.label}${isLocked ? ", locked" : ""}`}
            >
              <title>{`${interactable.label}${isLocked ? " · locked" : ""}`}</title>
              <circle r="3.4" />
              <text y="1.2">{interactable.icon}</text>
              {expanded && <text className="gp-station-marker__label" x="4.6" y="1.6">{interactable.shortLabel}</text>}
            </g>
          );
        })}

        {STATION_NPCS.map((npc) => {
          const point = stationLocalToMap(npc);
          return (
            <g
              key={npc.id}
              data-npc-marker={npc.id}
              transform={`translate(${point.x} ${point.y})`}
              className="gp-station-marker gp-station-marker--npc"
              role="img"
              aria-label={`Crew member ${npc.name}`}
            >
              <title>{npc.name}</title>
              <circle r="3.1" />
              <text y="1.15">{npc.shortLabel}</text>
              {expanded && <text className="gp-station-marker__label" x="4.4" y="1.6">{npc.name}</text>}
            </g>
          );
        })}

        {objectivePins.map((pin) => {
          const point = stationLocalToMap(pin);
          return (
            <g
              key={pin.id}
              data-objective-marker={pin.id}
              data-follow-npc-id={pin.followNpcId}
              transform={`translate(${point.x} ${point.y})`}
              className="gp-station-marker gp-station-marker--objective"
              role="img"
              aria-label={`Active objective: ${pin.label}`}
            >
              <title>{`Active objective: ${pin.label}`}</title>
              <circle r="4.4" />
              <text y="1.35">!</text>
              {expanded && <text className="gp-station-marker__label" x="5.8" y="1.6">{pin.shortLabel}</text>}
            </g>
          );
        })}

        <g
          data-live-player
          transform={markerTransform({ x: 0, y: 0 })}
          className="gp-station-marker gp-station-marker--player"
          role="img"
          aria-label="Player, station-local position X 0.0, Y 0.0"
          data-testid="gp-station-map-player"
        >
          <title>Player location · station-local coordinates</title>
          <circle className="gp-station-marker__halo" r="7.4" />
          <circle className="gp-station-marker__body" r="3.6" />
          <circle className="gp-station-marker__core" r="1.1" />
        </g>
      </svg>

      <footer className="gp-station-map__legend" aria-label="Station map legend">
        <span><i className="legend-player" /> YOU</span>
        <span><i className="legend-objective" /> OBJECTIVE</span>
        <span><i className="legend-interactable" /> STATION</span>
        <span><i className="legend-crew" /> CREW</span>
      </footer>
    </section>
  );
}
