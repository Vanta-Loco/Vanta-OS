import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import type { DistrictMapLocation } from "./DistrictMapView";
import { DistrictMapArtwork } from "./DistrictMapArtwork";
import {
  getDistrictMapBounds,
  projectDistrictWorldPoint,
} from "./district-map-geometry";
import "./DistrictMinimap.css";

export type DistrictPlayerPosition = { x: number; z: number; angle: number };

type Props = {
  locations: DistrictMapLocation[];
  playerPosRef: MutableRefObject<DistrictPlayerPosition>;
  playerDestinationId?: string | null;
};

const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 238;
const IMPORTANT_DESTINATIONS = new Set(["fractured-godhead-portal", "brizz-station"]);

function markerIcon(category: string) {
  if (category === "portal") return "↯";
  if (category === "station") return "✦";
  if (category === "vault") return "V";
  if (category === "music") return "♪";
  if (category === "transport") return "M";
  return "◆";
}

export function DistrictMinimap({ locations, playerPosRef, playerDestinationId = null }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const playerMarkerRef = useRef<SVGGElement>(null);
  const coordinatesRef = useRef<HTMLElement>(null);
  const bounds = useMemo(() => getDistrictMapBounds(locations), [locations]);
  const followCenterRef = useRef<{ x: number; y: number } | null>(null);
  const mapDestinationNodesRef = useRef<SVGGElement[]>([]);

  useEffect(() => {
    let frame = 0;
    let active = true;
    const update = () => {
      if (!active) return;
      const svg = svgRef.current;
      const player = playerPosRef.current;
      const point = projectDistrictWorldPoint(player.x, player.z, bounds);
      const center = followCenterRef.current ?? { ...point };
      if (!followCenterRef.current) followCenterRef.current = center;

      const dx = point.x - center.x;
      const dy = point.y - center.y;
      // Let the player move visibly in the viewport, then smoothly recenter near its edge.
      const recenterAtX = VIEW_WIDTH * 0.34;
      const recenterAtY = VIEW_HEIGHT * 0.34;
      if (Math.abs(dx) > recenterAtX) center.x = point.x - Math.sign(dx) * VIEW_WIDTH * 0.18;
      else center.x += dx * 0.025;
      if (Math.abs(dy) > recenterAtY) center.y = point.y - Math.sign(dy) * VIEW_HEIGHT * 0.18;
      else center.y += dy * 0.025;
      followCenterRef.current = center;

      const viewBox = `${center.x - VIEW_WIDTH / 2} ${center.y - VIEW_HEIGHT / 2} ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
      if (svg) {
        svg.setAttribute("viewBox", viewBox);
        svg.dataset.playerMapX = point.x.toFixed(2);
        svg.dataset.playerMapY = point.y.toFixed(2);
      }
      playerMarkerRef.current?.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${-player.angle * 180 / Math.PI})`);
      if (svg) {
        svg.dataset.worldX = player.x.toFixed(2);
        svg.dataset.worldZ = player.z.toFixed(2);
        svg.dataset.mapX = point.x.toFixed(2);
        svg.dataset.mapY = point.y.toFixed(2);
      }
      if (coordinatesRef.current) {
        coordinatesRef.current.textContent = `X ${player.x.toFixed(1)} · Z ${player.z.toFixed(1)}`;
      }
      for (const marker of mapDestinationNodesRef.current) {
        const markerX = Number(marker.dataset.mapX);
        const markerY = Number(marker.dataset.mapY);
        const important = marker.dataset.important === "true";
        const edgeX = Math.max(center.x - VIEW_WIDTH / 2 + 18, Math.min(center.x + VIEW_WIDTH / 2 - 18, markerX));
        const edgeY = Math.max(center.y - VIEW_HEIGHT / 2 + 16, Math.min(center.y + VIEW_HEIGHT / 2 - 16, markerY));
        const offscreen = important && (edgeX !== markerX || edgeY !== markerY);
        const direction = Math.atan2(markerY - center.y, markerX - center.x) * 180 / Math.PI + 90;
        marker.setAttribute("transform", `translate(${offscreen ? edgeX : markerX} ${offscreen ? edgeY : markerY})`);
        marker.classList.toggle("is-offscreen", offscreen);
        const glyph = marker.querySelector<SVGTextElement>("[data-destination-glyph]");
        if (glyph) {
          glyph.textContent = offscreen ? "›" : marker.dataset.glyph ?? "◆";
          glyph.setAttribute("transform", offscreen ? `rotate(${direction})` : "");
        }
        const label = marker.querySelector<SVGTextElement>(".vdm-minimap__destination-label");
        if (label) label.style.display = offscreen ? "none" : "";
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [bounds, playerPosRef]);

  const startPoint = projectDistrictWorldPoint(playerPosRef.current.x, playerPosRef.current.z, bounds);
  const startView = followCenterRef.current ?? startPoint;
  const viewBox = `${startView.x - VIEW_WIDTH / 2} ${startView.y - VIEW_HEIGHT / 2} ${VIEW_WIDTH} ${VIEW_HEIGHT}`;
  const locationsById = new Map(locations.map((location) => [location.id, location]));
  mapDestinationNodesRef.current = [];

  return (
    <section className="vdm-minimap" data-testid="district-minimap" aria-label="Live Vanta District minimap">
      <header className="vdm-minimap__header">
        <div><span>VANTA DISTRICT</span><strong>LIVE STREET MAP</strong></div>
        <span ref={coordinatesRef} className="vdm-minimap__coords" aria-label="Current District coordinates">X 0.0 · Z 0.0</span>
        <span className="vdm-minimap__north" aria-label="North is up">N ↑</span>
      </header>
      <svg
        ref={svgRef}
        className="vdm-minimap__map"
        viewBox={viewBox}
        role="img"
        aria-label="Cropped Vanta District street map. North is up. The player marker follows the live city position."
        data-world-x="0"
        data-world-z="0"
        data-map-x={startPoint.x.toFixed(2)}
        data-map-y={startPoint.y.toFixed(2)}
        data-player-map-x={startPoint.x.toFixed(2)}
        data-player-map-y={startPoint.y.toFixed(2)}
      >
        <DistrictMapArtwork className="vdm-map-art vdm-minimap__art" viewBox={viewBox} />
        {locations.map((location) => {
          const point = projectDistrictWorldPoint(location.x, location.z, bounds);
          const important = IMPORTANT_DESTINATIONS.has(location.id);
          const selected = location.id === playerDestinationId;
          return (
            <g
              key={location.id}
              ref={(node) => {
                if (node) mapDestinationNodesRef.current.push(node);
              }}
              className={`vdm-minimap__destination${selected ? " is-current" : ""}${location.locked ? " is-locked" : ""}`}
              transform={`translate(${point.x} ${point.y})`}
              role="img"
              aria-label={`${location.name}${location.locked ? ", locked" : ""}${selected ? ", current destination" : ""}`}
              data-destination-id={location.id}
              data-map-x={point.x}
              data-map-y={point.y}
              data-important={important}
              data-glyph={markerIcon(location.category)}
            >
              <title>{location.name}</title>
              <circle className="vdm-minimap__destination-ring" r={selected ? 8 : 6} />
              <circle className="vdm-minimap__destination-core" r="3" style={{ fill: location.color }} />
              <text data-destination-glyph="" y="1.7">{markerIcon(location.category)}</text>
              <text className="vdm-minimap__destination-label" x="7" y="-6">{location.shortName}</text>
            </g>
          );
        })}
        <g ref={playerMarkerRef} className="vdm-minimap__player" transform={`translate(${startView.x} ${startView.y})`}>
          <circle className="vdm-minimap__player-halo" r="13" />
          <path d="M0 -10 L7 7 L0 4 L-7 7 Z" />
          <circle r="2.2" />
        </g>
      </svg>
      <footer className="vdm-minimap__legend" aria-label="District minimap legend">
        <span><i className="is-player" /> YOU</span>
        <span><i className="is-destination" /> DESTINATION</span>
        <span><i className="is-road" /> ROAD</span>
        <span><i className="is-locked" /> LOCKED</span>
        <span className="vdm-minimap__destination-note" title={locationsById.get(playerDestinationId ?? "")?.name}>
          {locationsById.get(playerDestinationId ?? "")?.shortName
            ? `TARGET · ${locationsById.get(playerDestinationId ?? "")!.shortName}`
            : "DISTRICT GRID"}
        </span>
      </footer>
    </section>
  );
}
