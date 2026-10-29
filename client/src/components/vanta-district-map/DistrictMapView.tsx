import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import "./DistrictMapView.css";
import { DistrictMapArtwork } from "./DistrictMapArtwork";
import {
  DISTRICT_MAP_HEIGHT,
  DISTRICT_MAP_WIDTH,
  getDistrictMapBounds,
  projectDistrictWorldPoint,
} from "./district-map-geometry";
import type { DistrictRoute, DistrictWorldPoint } from "@/lib/district-navigation";

export type DistrictMapLocation = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  district: string;
  x: number;
  z: number;
  color: string;
  description: string;
  status: string;
  actionLabel: string;
  locked?: boolean;
};

export type DistrictMapPlayerPosition = { x: number; z: number } | null;

export interface DistrictMapViewProps {
  locations: DistrictMapLocation[];
  playerPosition: DistrictMapPlayerPosition;
  playerDestinationId?: string | null;
  route?: DistrictRoute | null;
  unlockedDestinationIds?: string[];
  gameplayPaused?: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onSetDestination: (id: string) => void;
  onFastTravel: (id: string) => void;
  onResetNavigation: () => void;
  onClose: () => void;
}

type Point = { x: number; y: number };
type DragState = { pointerId: number; x: number; y: number; moved: boolean };

const MIN_ZOOM = 0.72;
const MAX_ZOOM = 2.7;

function getCategoryMark(category: string) {
  const value = category.toLowerCase();
  if (value.includes("metro") || value.includes("transit")) return "M";
  if (value.includes("music") || value.includes("sound")) return "♪";
  if (value.includes("vault") || value.includes("archive")) return "V";
  if (value.includes("market") || value.includes("exchange")) return "X";
  if (value.includes("terminal") || value.includes("network")) return "↗";
  return "◆";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function DistrictMapView({
  locations,
  playerPosition,
  playerDestinationId = null,
  route = null,
  unlockedDestinationIds = [],
  gameplayPaused = false,
  selectedId,
  onSelect,
  onSetDestination,
  onFastTravel,
  onResetNavigation,
  onClose,
}: DistrictMapViewProps) {
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [confirmingTravel, setConfirmingTravel] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const bounds = useMemo(() => getDistrictMapBounds(locations), [locations]);

  const toPoint = useCallback((x: number, z: number): Point => ({
    ...projectDistrictWorldPoint(x, z, bounds),
  }), [bounds]);

  const selected = locations.find((location) => location.id === selectedId);
  const selectedIsLocked = Boolean(selected?.locked);
  const selectedIsUnlocked = Boolean(selected && unlockedDestinationIds.includes(selected.id));
  const selectedIsObjective = selected?.id === playerDestinationId;
  const districtNames = Array.from(new Set(locations.map((location) => location.district).filter(Boolean)));

  useEffect(() => {
    setConfirmingTravel(false);
  }, [selectedId]);

  const changeZoom = (nextZoom: number, anchor?: Point) => {
    const frame = mapFrameRef.current;
    const targetZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    if (frame && anchor) {
      const rect = frame.getBoundingClientRect();
      const ax = anchor.x - rect.left;
      const ay = anchor.y - rect.top;
      setPan((current) => ({
        x: ax - (ax - current.x) * (targetZoom / zoom),
        y: ay - (ay - current.y) * (targetZoom / zoom),
      }));
    }
    setZoom(targetZoom);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const recenter = () => {
    if (!playerPosition || !mapFrameRef.current) {
      resetView();
      return;
    }
    const point = toPoint(playerPosition.x, playerPosition.z);
    const rect = mapFrameRef.current.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - (point.x / DISTRICT_MAP_WIDTH) * rect.width * zoom,
      y: rect.height / 2 - (point.y / DISTRICT_MAP_HEIGHT) * rect.height * zoom,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    changeZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89), { x: event.clientX, y: event.clientY });
  };

  const handleMapKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 36;
    if (event.key === "ArrowUp") { event.preventDefault(); setPan((current) => ({ ...current, y: current.y + step })); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setPan((current) => ({ ...current, y: current.y - step })); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); setPan((current) => ({ ...current, x: current.x + step })); }
    else if (event.key === "ArrowRight") { event.preventDefault(); setPan((current) => ({ ...current, x: current.x - step })); }
    else if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(zoom * 1.2); }
    else if (event.key === "-") { event.preventDefault(); changeZoom(zoom / 1.2); }
    else if (event.key === "0") { event.preventDefault(); resetView(); }
  };

  const mapStyle = {
      "--map-zoom": zoom,
    "--map-pan-x": `${pan.x}px`,
    "--map-pan-y": `${pan.y}px`,
  } as CSSProperties;

  return (
    <section className="vanta-district-map" aria-label="Vanta City destination map">
      <header className="vdm-header">
        <div className="vdm-brand-lockup">
          <span className="vdm-brand-mark" aria-hidden="true">V</span>
          <div>
            <p className="vdm-kicker">VANTA CITY / DISTRICT ATLAS</p>
            <h1>Find your way in.</h1>
          </div>
        </div>
        <div className="vdm-header-meta">
            <span className={`vdm-live${gameplayPaused ? " vdm-live--paused" : ""}`}>
              <i /> {gameplayPaused ? "CITY GAMEPLAY PAUSED" : "CITY SIGNAL ACTIVE"}
            </span>
          <span className="vdm-coordinates">GRID 04 · NIGHT INDEX</span>
          <button className="vdm-close" type="button" onClick={onClose} aria-label="Close district map">×</button>
        </div>
      </header>

      <div className="vdm-body">
        <main className="vdm-map-column">
          <div className="vdm-map-topline">
            <div>
              <span className="vdm-section-index">01</span>
              <span>METROPOLITAN OVERVIEW</span>
            </div>
            <span className="vdm-location-count">{String(locations.length).padStart(2, "0")} DESTINATIONS</span>
          </div>
          <div
            className={`vdm-map-frame${isDragging ? " is-dragging" : ""}`}
            ref={mapFrameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onKeyDown={handleMapKeyDown}
            role="region"
            aria-label="Interactive Vanta City map. Drag or use arrow keys to pan, use the wheel or plus and minus keys to zoom, and press zero to reset."
            tabIndex={0}
          >
            <div className="vdm-map-viewport" style={mapStyle}>
              <DistrictMapArtwork />

              {route?.points.length ? (
                <svg className="vdm-route-overlay" viewBox={`0 0 ${DISTRICT_MAP_WIDTH} ${DISTRICT_MAP_HEIGHT}`} aria-hidden="true">
                  <path
                    className="vdm-route-shadow"
                    d={route.points.map((point, index) => {
                      const projected = toPoint(point.x, point.z);
                      return `${index === 0 ? "M" : "L"}${projected.x} ${projected.y}`;
                    }).join(" ")}
                  />
                  <path
                    className="vdm-route-line"
                    d={route.points.map((point, index) => {
                      const projected = toPoint(point.x, point.z);
                      return `${index === 0 ? "M" : "L"}${projected.x} ${projected.y}`;
                    }).join(" ")}
                  />
                </svg>
              ) : null}

              {locations.map((location, index) => {
                const point = toPoint(location.x, location.z);
                const isSelected = selectedId === location.id;
                return (
                  <button
                    key={location.id}
                    type="button"
                    className={`vdm-marker${isSelected ? " is-selected" : ""}${location.locked ? " is-locked" : ""}${location.id === playerDestinationId ? " is-current-destination" : ""}`}
                    style={{
                      left: `${(point.x / DISTRICT_MAP_WIDTH) * 100}%`,
                      top: `${(point.y / DISTRICT_MAP_HEIGHT) * 100}%`,
                      "--marker-color": location.color || "#a855f7",
                    } as CSSProperties}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onSelect(location.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(location.id);
                      }
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${location.name}, ${location.district}, ${location.status}${location.locked ? ", locked" : ""}${location.id === playerDestinationId ? ", last entered destination" : ""}`}
                    title={`${location.name} · ${location.district}${location.id === playerDestinationId ? " · last entered destination" : ""}`}
                  >
                    <span className="vdm-marker-node" aria-hidden="true">
                      <span className="vdm-marker-icon">{getCategoryMark(location.category)}</span>
                      {location.locked && <span className="vdm-lock-mark">×</span>}
                    </span>
                    <span className="vdm-marker-label">
                      <span className="vdm-marker-number">{String(index + 1).padStart(2, "0")}</span>
                      <span>{location.shortName || location.name}</span>
                    </span>
                    {location.id === playerDestinationId && <span className="vdm-marker-state">OBJECTIVE</span>}
                    {unlockedDestinationIds.includes(location.id) && <span className="vdm-marker-unlocked">FAST TRAVEL</span>}
                  </button>
                );
              })}

              {playerPosition && (() => {
                const point = toPoint(playerPosition.x, playerPosition.z);
                const markerName = `Your current Vanta District position, X ${playerPosition.x.toFixed(1)}, Z ${playerPosition.z.toFixed(1)}.`;
                return (
                  <div
                    className="vdm-player"
                    style={{ left: `${point.x / DISTRICT_MAP_WIDTH * 100}%`, top: `${point.y / DISTRICT_MAP_HEIGHT * 100}%` }}
                    aria-label={markerName}
                    title={markerName}
                  >
                    <span /><b>YOU · {playerPosition.x.toFixed(0)},{playerPosition.z.toFixed(0)}</b>
                  </div>
                );
              })()}
            </div>

            <div className="vdm-map-stamp" aria-hidden="true"><span>VC</span><i /> URBAN GRID / 04</div>
            <div className="vdm-scale" aria-hidden="true"><span>0</span><i /><i /><i /><span>1 KM</span></div>
            <div className="vdm-map-controls" aria-label="Map controls">
              <button type="button" onClick={() => changeZoom(zoom * 1.2)} aria-label="Zoom in">+</button>
              <span aria-live="polite">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => changeZoom(zoom / 1.2)} aria-label="Zoom out">−</button>
              <i />
              <button type="button" onClick={recenter} aria-label="Recenter on your position">◎</button>
              <button type="button" onClick={resetView} aria-label="Reset map view">↺</button>
            </div>
            <div className="vdm-map-hint"><span>DRAG TO MOVE</span><i /> SCROLL TO ZOOM</div>
          </div>

          <div className="vdm-map-footer">
            <div className="vdm-legend" aria-label="Map legend">
              <span><i className="legend-destination" /> DESTINATION</span>
              <span><i className="legend-road" /> ARTERIAL</span>
              <span><i className="legend-water" /> WATERFRONT</span>
              {playerPosition && <span><i className="legend-player" /> YOUR POSITION · CITY GRID</span>}
              {route && <span><i className="legend-route" /> ACTIVE ROUTE</span>}
              {selectedIsLocked && <span><i className="legend-locked" /> LOCKED</span>}
            </div>
            <span className="vdm-footnote">MAP DATA // VANTA CITY TRANSIT AUTHORITY</span>
          </div>
        </main>

        <aside className="vdm-side-panel" aria-label="Destination details">
          <div className="vdm-side-heading">
            <span><b>02</b> DESTINATION FILE</span>
            <span className="vdm-signal-bars" aria-label="Signal stable"><i /><i /><i /><i /></span>
          </div>
          {selected ? (
            <div className="vdm-detail" key={selected.id} style={{ "--detail-color": selected.color || "#a855f7" } as CSSProperties}>
              <div className="vdm-detail-top">
                <span className="vdm-detail-category">{selected.category}</span>
                <span className={`vdm-status${selected.locked ? " status-locked" : ""}`}><i />{selected.status}</span>
              </div>
              <div className="vdm-detail-glyph" aria-hidden="true"><span>{getCategoryMark(selected.category)}</span><i /></div>
              <p className="vdm-detail-district">{selected.district}</p>
              <h2>{selected.name}</h2>
              <p className="vdm-detail-description">{selected.description || "A point of interest within Vanta City. Select the route to continue."}</p>
              <div className="vdm-detail-coordinates">
                <span><small>GRID X</small>{selected.x.toFixed(1)}</span>
                <span><small>GRID Z</small>{selected.z.toFixed(1)}</span>
                <span><small>ACCESS</small>{selected.locked ? "RESTRICTED" : "OPEN"}</span>
              </div>
              {selectedIsObjective && route && (
                <div className="vdm-route-summary" aria-live="polite">
                  <span>ACTIVE OBJECTIVE</span>
                  <strong>{Math.max(0, Math.round(route.distance))} m · {route.direction}</strong>
                </div>
              )}
              {selectedIsLocked ? (
                <div className="vdm-locked-guidance" role="status">
                  <strong>ROUTE LOCKED</strong>
                  <span>{selected.id === "subway"
                    ? "Metro access has no unlock condition yet. Visit an open landmark to unlock its fast travel; the metro remains locked."
                    : "This location has no active access route yet."}</span>
                </div>
              ) : (
                <>
                  <button
                    className="vdm-enter-button"
                    type="button"
                    onClick={() => {
                      setConfirmingTravel(false);
                      onSetDestination(selected.id);
                    }}
                    aria-pressed={selectedIsObjective}
                  >
                    <span>{selectedIsObjective ? "OBJECTIVE SELECTED" : "SET AS OBJECTIVE"}</span><i>{selectedIsObjective ? "✓" : "⌖"}</i>
                  </button>
                  {selectedIsUnlocked ? (
                    confirmingTravel ? (
                      <div className="vdm-confirm-card" role="group" aria-label={`Confirm fast travel to ${selected.name}`}>
                        <strong>FAST TRAVEL TO {selected.shortName}?</strong>
                        <span>You will arrive at a safe point near this location. Progress is unchanged.</span>
                        <div>
                          <button type="button" onClick={() => { onFastTravel(selected.id); setConfirmingTravel(false); }}>CONFIRM TRAVEL</button>
                          <button type="button" onClick={() => setConfirmingTravel(false)}>STAY HERE</button>
                        </div>
                      </div>
                    ) : (
                      <button className="vdm-fast-travel" type="button" onClick={() => setConfirmingTravel(true)}>
                        FAST TRAVEL · UNLOCKED
                      </button>
                    )
                  ) : (
                    <p className="vdm-entry-note"><span>↳</span> ARRIVE ON FOOT TO UNLOCK FAST TRAVEL</p>
                  )}
                  <p className="vdm-entry-note"><span>↳</span> MAP SELECTION PLOTS A ROUTE; IT DOES NOT TELEPORT YOU</p>
                </>
              )}
            </div>
          ) : (
            <div className="vdm-empty-detail">
              <span className="vdm-empty-mark">+</span>
              <h2>Choose a destination</h2>
              <p>Select a marked location to view its district, access status, and entry route.</p>
            </div>
          )}

          <div className="vdm-district-list">
            <div className="vdm-list-heading"><span>ON THIS GRID</span><span>{String(districtNames.length).padStart(2, "0")} DISTRICTS</span></div>
            {districtNames.length ? districtNames.map((district, index) => {
              const count = locations.filter((location) => location.district === district).length;
              return <div className="vdm-district-row" key={district}><i>{String(index + 1).padStart(2, "0")}</i><span>{district}</span><b>{String(count).padStart(2, "0")}</b></div>;
            }) : <p className="vdm-no-districts">District data unavailable.</p>}
          </div>
          <div className="vdm-reset-area">
            {confirmingReset ? (
              <div className="vdm-confirm-card" role="group" aria-label="Confirm District navigation reset">
                <strong>RESET DISTRICT NAVIGATION?</strong>
                <span>This clears the saved route, fast-travel unlocks, and safe District position. Station progress is untouched.</span>
                <div>
                  <button type="button" onClick={() => { onResetNavigation(); setConfirmingReset(false); }}>RESET DISTRICT</button>
                  <button type="button" onClick={() => setConfirmingReset(false)}>CANCEL</button>
                </div>
              </div>
            ) : (
              <button type="button" className="vdm-reset-button" onClick={() => setConfirmingReset(true)}>
                RESET DISTRICT NAVIGATION
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default DistrictMapView;
