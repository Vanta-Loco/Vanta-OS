import { useCallback, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, WheelEvent } from "react";
import "./DistrictMapView.css";

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
  selectedId: string;
  onSelect: (id: string) => void;
  onEnter: (id: string) => void;
  onClose: () => void;
}

type Point = { x: number; y: number };
type DragState = { pointerId: number; x: number; y: number; moved: boolean };

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 700;
const MAP_PADDING = 110;
const MIN_ZOOM = 0.72;
const MAX_ZOOM = 2.7;

const districts = [
  { name: "INDUSTRIAL", points: "42,35 488,35 454,223 270,278 42,234", tint: "amber", labelX: 166, labelY: 67 },
  { name: "TECH", points: "488,35 958,35 958,255 704,293 454,223", tint: "violet", labelX: 743, labelY: 67 },
  { name: "RESIDENTIAL", points: "42,234 270,278 454,223 512,426 354,652 42,652", tint: "blue", labelX: 171, labelY: 625 },
  { name: "COMMERCIAL", points: "454,223 704,293 958,255 958,652 574,652 512,426", tint: "rose", labelX: 797, labelY: 625 },
];

const blocks = [
  [70, 77, 80, 42], [178, 78, 74, 42], [279, 78, 74, 42], [377, 77, 77, 42],
  [567, 77, 75, 42], [671, 77, 74, 42], [774, 77, 78, 42], [873, 77, 54, 42],
  [70, 137, 80, 45], [177, 137, 72, 45], [280, 137, 73, 45], [376, 137, 78, 45],
  [567, 137, 75, 45], [671, 137, 75, 45], [774, 137, 78, 45], [873, 137, 54, 45],
  [70, 292, 82, 58], [178, 295, 74, 56], [277, 294, 77, 58], [386, 285, 57, 68],
  [564, 310, 74, 53], [666, 312, 82, 55], [772, 302, 78, 59], [873, 294, 54, 62],
  [70, 382, 82, 55], [177, 382, 76, 55], [280, 382, 73, 55], [386, 382, 57, 55],
  [564, 382, 74, 55], [666, 382, 82, 55], [772, 382, 78, 55], [873, 382, 54, 55],
  [70, 478, 82, 62], [177, 478, 76, 62], [280, 478, 73, 62], [386, 478, 57, 62],
  [564, 478, 74, 62], [666, 478, 82, 62], [772, 478, 78, 62], [873, 478, 54, 62],
];

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
  selectedId,
  onSelect,
  onEnter,
  onClose,
}: DistrictMapViewProps) {
  const mapFrameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const bounds = useMemo(() => {
    const points = [
      ...locations.map(({ x, z }) => ({ x, z })),
      ...(playerPosition ? [playerPosition] : []),
    ];
    if (!points.length) return { minX: -160, maxX: 160, minZ: -120, maxZ: 120 };
    const xs = points.map((point) => point.x);
    const zs = points.map((point) => point.z);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanZ = Math.max(...zs) - Math.min(...zs);
    const padX = Math.max(spanX * 0.22, 42);
    const padZ = Math.max(spanZ * 0.22, 42);
    return {
      minX: Math.min(...xs) - padX,
      maxX: Math.max(...xs) + padX,
      minZ: Math.min(...zs) - padZ,
      maxZ: Math.max(...zs) + padZ,
    };
  }, [locations, playerPosition]);

  const toPoint = useCallback((x: number, z: number): Point => ({
    x: MAP_PADDING + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * (MAP_WIDTH - MAP_PADDING * 2),
    y: MAP_PADDING + ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * (MAP_HEIGHT - MAP_PADDING * 2),
  }), [bounds]);

  const selected = locations.find((location) => location.id === selectedId);
  const districtNames = Array.from(new Set(locations.map((location) => location.district).filter(Boolean)));

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
      x: rect.width / 2 - (point.x / MAP_WIDTH) * rect.width * zoom,
      y: rect.height / 2 - (point.y / MAP_HEIGHT) * rect.height * zoom,
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
          <span className="vdm-live"><i /> CITY SIGNAL ACTIVE</span>
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
              <svg className="vdm-map-art" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <pattern id="vdm-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                    <path d="M 34 0 L 0 0 0 34" fill="none" stroke="rgba(190,155,238,.075)" strokeWidth="1" />
                  </pattern>
                  <pattern id="vdm-water-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                    <path d="M0 11 Q5 7 11 11 T22 11" fill="none" stroke="rgba(106,151,181,.12)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="1000" height="700" fill="#0b0a12" />
                <rect width="1000" height="700" fill="url(#vdm-grid)" />
                {districts.map((district) => (
                  <g key={district.name}>
                    <polygon className={`vdm-district-zone zone-${district.tint}`} points={district.points} />
                    <text className="vdm-district-name" x={district.labelX} y={district.labelY}>{district.name}</text>
                  </g>
                ))}
                <path className="vdm-water" d="M-10 251 C112 225 172 268 258 256 C344 244 402 230 476 256 C555 284 606 320 691 305 C803 286 875 242 1010 268 L1010 294 C875 268 803 311 694 332 C600 350 551 312 466 284 C398 262 344 278 262 288 C166 300 112 258 -10 282 Z" />
                <path className="vdm-water-highlight" d="M-10 265 C112 239 172 282 258 270 C344 258 402 244 476 270 C555 298 606 334 691 319 C803 300 875 256 1010 282" />
                <path className="vdm-park" d="M73 557 L197 541 L232 618 L179 670 L54 663 Z" />
                <path className="vdm-park-detail" d="M85 575 L124 614 L177 565 M124 614 L163 652 M124 614 L75 645" />
                <path className="vdm-park" d="M786 447 L865 431 L933 458 L916 520 L837 532 L776 499 Z" />
                <path className="vdm-park-detail" d="M798 471 L844 487 L891 452 M844 487 L858 521 M844 487 L803 510" />
                {blocks.map(([x, y, width, height], index) => (
                  <g key={`block-${index}`} className="vdm-city-block">
                    <rect x={x} y={y} width={width} height={height} rx="2" />
                    <path d={`M${x + 8} ${y + 8}h${width * 0.28} M${x + 8} ${y + 15}h${width * 0.54}`} />
                    <circle cx={x + width - 9} cy={y + 10} r="2" />
                  </g>
                ))}
                <g className="vdm-roads">
                  <path className="vdm-road-edge" d="M-20 116 H1020 M-20 365 H1020 M-20 450 H1020 M155 -20 V720 M365 -20 V720 M652 -20 V720 M856 -20 V720" />
                  <path className="vdm-road-fill" d="M-20 116 H1020 M-20 365 H1020 M-20 450 H1020 M155 -20 V720 M365 -20 V720 M652 -20 V720 M856 -20 V720" />
                  <path className="vdm-road-center" d="M-20 116 H1020 M-20 365 H1020 M-20 450 H1020 M155 -20 V720 M365 -20 V720 M652 -20 V720 M856 -20 V720" />
                  <path className="vdm-arterial-edge" d="M-20 211 C167 191 282 212 424 208 S689 220 1020 190 M489 -20 C472 128 501 224 491 341 S514 559 548 720" />
                  <path className="vdm-arterial" d="M-20 211 C167 191 282 212 424 208 S689 220 1020 190 M489 -20 C472 128 501 224 491 341 S514 559 548 720" />
                </g>
                <g className="vdm-road-labels">
                  <text x="66" y="108">WESTLINE AVE</text><text x="667" y="358">CROWN CIRCUIT</text>
                  <text x="505" y="558" transform="rotate(85 505 558)">NORTH / SOUTH SPINE</text>
                  <text x="789" y="201">EAST RELAY</text>
                </g>
                <g className="vdm-crossings">
                  {[155, 365, 652, 856].map((x) => [116, 365, 450].map((y) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />
                  )))}
                </g>
                <path className="vdm-map-border" d="M22 22H978V678H22Z" />
                <path className="vdm-map-corner" d="M22 53V22H53 M947 22H978V53 M22 647V678H53 M947 678H978V647" />
              </svg>

              {locations.map((location, index) => {
                const point = toPoint(location.x, location.z);
                const isSelected = selectedId === location.id;
                return (
                  <button
                    key={location.id}
                    type="button"
                    className={`vdm-marker${isSelected ? " is-selected" : ""}${location.locked ? " is-locked" : ""}`}
                    style={{
                      left: `${(point.x / MAP_WIDTH) * 100}%`,
                      top: `${(point.y / MAP_HEIGHT) * 100}%`,
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
                    aria-label={`${location.name}, ${location.district}, ${location.status}${location.locked ? ", locked" : ""}`}
                    title={`${location.name} · ${location.district}`}
                  >
                    <span className="vdm-marker-node" aria-hidden="true">
                      <span className="vdm-marker-icon">{getCategoryMark(location.category)}</span>
                      {location.locked && <span className="vdm-lock-mark">×</span>}
                    </span>
                    <span className="vdm-marker-label">
                      <span className="vdm-marker-number">{String(index + 1).padStart(2, "0")}</span>
                      <span>{location.shortName || location.name}</span>
                    </span>
                  </button>
                );
              })}

              {playerPosition && (() => {
                const point = toPoint(playerPosition.x, playerPosition.z);
                return <div className="vdm-player" style={{ left: `${point.x / MAP_WIDTH * 100}%`, top: `${point.y / MAP_HEIGHT * 100}%` }} aria-label="Your position"><span /><b>YOU</b></div>;
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
              {playerPosition && <span><i className="legend-player" /> YOUR POSITION</span>}
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
              {selected.locked ? (
                <button className="vdm-enter-button is-disabled" type="button" disabled aria-disabled="true">
                  <span>{selected.actionLabel || "ACCESS RESTRICTED"}</span><i>×</i>
                </button>
              ) : (
                <button className="vdm-enter-button" type="button" onClick={() => onEnter(selected.id)}>
                  <span>{selected.actionLabel || "ENTER DESTINATION"}</span><i>↗</i>
                </button>
              )}
              <p className="vdm-entry-note"><span>↳</span> SELECT TO PLOT A DIRECT ENTRY</p>
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
        </aside>
      </div>
    </section>
  );
}

export default DistrictMapView;
