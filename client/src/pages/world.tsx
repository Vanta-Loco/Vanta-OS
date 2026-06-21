import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight } from "lucide-react";

// ─── Tile geometry ───────────────────────────────────────────────
const TW = 88;   // tile width (diamond)
const TH = 44;   // tile height (diamond)
const WU = 19;   // pixels per height unit

// ─── Types ──────────────────────────────────────────────────────
interface BuildingDef {
  id: string;
  name: string;
  subtitle: string;
  lore: string;
  href: string | null;
  col: number;
  row: number;
  height: number;
  palette: keyof typeof PALETTES;
  comingSoon?: boolean;
}

// ─── Palettes ────────────────────────────────────────────────────
const PALETTES = {
  violet: { top: "#2d1b5e", left: "#1a0f3d", right: "#110a2a", win: "#a855f7", glow: "#a855f7" },
  blue:   { top: "#1a2658", left: "#0f183a", right: "#0a1028", win: "#60a5fa", glow: "#3b82f6" },
  red:    { top: "#5a1818", left: "#3b0f0f", right: "#280a0a", win: "#f87171", glow: "#ef4444" },
  green:  { top: "#193e27", left: "#0f2518", right: "#0a1a10", win: "#4ade80", glow: "#22c55e" },
  slate:  { top: "#1c1c2e", left: "#131320", right: "#0e0e18", win: "#94a3b8", glow: "#64748b" },
  dark:   { top: "#111118", left: "#09090f", right: "#06060c", win: "#374151", glow: "#1f2937" },
  core:   { top: "#3d1a70", left: "#260f48", right: "#1a0a30", win: "#c084fc", glow: "#a855f7" },
} as const;

// ─── District buildings ──────────────────────────────────────────
// col-row values (screen-column) per building — must all be unique to prevent occlusion:
// Black Index: 2, Transmissions: -2, Music Hub: 4, Vault Gate: -4,
// Mission Handler: 0, Worlds Archive: -3, Vanta OS Core: 1, Vanta Box: 3
const BUILDINGS: BuildingDef[] = [
  {
    id: "black-index", name: "Black Index", subtitle: "Search Protocol",
    lore: "The searchable record of all transmissions. Nothing in the district is hidden from the Index.",
    href: "/search", col: 2, row: 0, height: 5, palette: "violet",
  },
  {
    id: "transmissions", name: "Transmissions", subtitle: "Signal Archive",
    lore: "The full frequency log of Vanta Cold. Every transmission, catalogued and accessible.",
    href: "/", col: 0, row: 2, height: 3, palette: "slate",
  },
  {
    id: "music-hub", name: "Music Hub", subtitle: "Release Station",
    lore: "Every release from the Vanta catalog. Singles, EPs, albums — the sonic output of the system.",
    href: "/releases", col: 4, row: 0, height: 4, palette: "blue",
  },
  {
    id: "vault-gate", name: "Vault Gate", subtitle: "Restricted Access",
    lore: "Code-locked archive containing unreleased material, private demos, and classified content.",
    href: "/vault", col: 0, row: 4, height: 6, palette: "red",
  },
  {
    id: "mission-handler", name: "Mission Handler", subtitle: "Authorization Node",
    lore: "Entry point to Vanta OS. Authenticate and gain access to the restricted system layer.",
    href: "/enter", col: 2, row: 2, height: 3, palette: "green",
  },
  {
    id: "worlds-archive", name: "Worlds Archive", subtitle: "Universe Registry",
    lore: "A documented map of all active and developing Vanta worlds. The known universe.",
    href: "/worlds", col: 1, row: 4, height: 4, palette: "violet",
  },
  {
    id: "vanta-os-core", name: "Vanta OS Core", subtitle: "System Core",
    lore: "The central node of Vanta OS. All systems route through here. Access requires authorization.",
    href: "/enter", col: 4, row: 3, height: 7, palette: "core",
  },
  {
    id: "vanta-box", name: "Vanta Box", subtitle: "Classified",
    lore: "Node under construction. Classification: unknown. ETA: unconfirmed.",
    href: null, col: 5, row: 2, height: 2, palette: "dark", comingSoon: true,
  },
];

// ─── Isometric math ──────────────────────────────────────────────
function isoXY(col: number, row: number, ox: number, oy: number) {
  return {
    x: (col - row) * (TW / 2) + ox,
    y: (col + row) * (TH / 2) + oy,
  };
}

function pointInPoly(px: number, py: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function buildingHitPoly(col: number, row: number, height: number, ox: number, oy: number): [number, number][] {
  const { x, y } = isoXY(col, row, ox, oy);
  const hw = TW / 2, hh = TH / 2, wh = height * WU;
  return [
    [x - hw, y + hh - wh],
    [x,      y      - wh],
    [x + hw, y + hh - wh],
    [x + hw, y + hh     ],
    [x,      y + TH     ],
    [x - hw, y + hh     ],
  ];
}

// ─── Drawing ─────────────────────────────────────────────────────
function drawTile(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const hw = TW / 2, hh = TH / 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + hw, y + hh);
  ctx.lineTo(x, y + TH);
  ctx.lineTo(x - hw, y + hh);
  ctx.closePath();
  ctx.fillStyle = (col + row) % 2 === 0 ? "#0d0d1a" : "#0b0b16";
  ctx.fill();
  ctx.strokeStyle = "#18182a";
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function hexBright(hex: string, amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amt);
  const g = Math.min(255, ((n >> 8)  & 0xff) + amt);
  const b = Math.min(255, ( n        & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: BuildingDef,
  ox: number, oy: number,
  hovered: boolean,
  tick: number,
  idx: number,
) {
  const { x, y } = isoXY(b.col, b.row, ox, oy);
  const hw = TW / 2, hh = TH / 2, wh = b.height * WU;
  const pal = PALETTES[b.palette];
  const lift = hovered ? 22 : 0;

  // Left wall
  ctx.beginPath();
  ctx.moveTo(x - hw, y + hh);
  ctx.lineTo(x,      y + TH);
  ctx.lineTo(x,      y + TH - wh);
  ctx.lineTo(x - hw, y + hh - wh);
  ctx.closePath();
  ctx.fillStyle = hexBright(pal.left, lift);
  ctx.fill();
  if (hovered) { ctx.strokeStyle = pal.win + "33"; ctx.lineWidth = 1; ctx.stroke(); }

  // Right wall
  ctx.beginPath();
  ctx.moveTo(x,      y + TH);
  ctx.lineTo(x + hw, y + hh);
  ctx.lineTo(x + hw, y + hh - wh);
  ctx.lineTo(x,      y + TH - wh);
  ctx.closePath();
  ctx.fillStyle = hexBright(pal.right, lift - 6);
  ctx.fill();
  if (hovered) { ctx.strokeStyle = pal.win + "22"; ctx.lineWidth = 1; ctx.stroke(); }

  // Top face
  ctx.beginPath();
  ctx.moveTo(x,      y       - wh);
  ctx.lineTo(x + hw, y + hh  - wh);
  ctx.lineTo(x,      y + TH  - wh);
  ctx.lineTo(x - hw, y + hh  - wh);
  ctx.closePath();
  ctx.fillStyle = hexBright(pal.top, lift + 8);
  ctx.fill();
  if (hovered) { ctx.strokeStyle = pal.win + "55"; ctx.lineWidth = 1; ctx.stroke(); }

  // Glow outline
  if (hovered) {
    ctx.save();
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = 28;
    ctx.strokeStyle = pal.glow + "aa";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - hw, y + hh  - wh);
    ctx.lineTo(x,      y       - wh);
    ctx.lineTo(x + hw, y + hh  - wh);
    ctx.lineTo(x + hw, y + hh      );
    ctx.lineTo(x,      y + TH      );
    ctx.lineTo(x - hw, y + hh      );
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Windows
  const winRows = Math.min(b.height - 1, 5);
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < 2; c++) {
      const u = (c + 1) / 3;
      const v = (r + 0.5) / winRows;
      const seed = idx * 17 + r * 5 + c * 3;
      const lit = hovered || Math.sin(tick * 0.018 + seed) > -0.35;
      if (!lit) continue;

      const alpha = hovered ? "ee" : "77";
      ctx.save();
      if (hovered) { ctx.shadowColor = pal.win; ctx.shadowBlur = 7; }

      // Left wall window
      const lwx = x - hw + u * hw;
      const lwy = y + hh - wh + u * hh + v * wh;
      ctx.fillStyle = pal.win + alpha;
      ctx.fillRect(lwx - 2, lwy - 1.5, 4, 3);

      // Right wall window
      const rwx = x + u * hw;
      const rwy = y + TH - wh - u * hh + v * wh;
      ctx.fillStyle = pal.win + (hovered ? "cc" : "55");
      ctx.fillRect(rwx - 2, rwy - 1.5, 4, 3);

      ctx.restore();
    }
  }

  // Label
  const lx = x;
  const ly = y + TH + 13;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = hovered ? "bold 10px monospace" : "10px monospace";
  ctx.fillStyle = hovered ? "#ddddff" : "#3a3a55";
  if (hovered) { ctx.shadowColor = pal.glow; ctx.shadowBlur = 12; }
  ctx.fillText(b.name.toUpperCase(), lx, ly);
  if (hovered) {
    ctx.shadowBlur = 0;
    ctx.font = "9px monospace";
    ctx.fillStyle = "#6666aa";
    ctx.fillText(b.subtitle.toUpperCase(), lx, ly + 14);
  }
  ctx.restore();
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  const off = (tick * 0.35) % 4;
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = "#000";
  for (let y = off; y < h; y += 4) ctx.fillRect(0, y, w, 1.5);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.82);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.68)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ─── Component ───────────────────────────────────────────────────
export default function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, navigate] = useLocation();

  // Hover tracked via ref (read by RAF loop) + state (used by React HUD)
  const hoveredIdRef = useRef<string | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingDef | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDef | null>(null);

  const animRef   = useRef<number>(0);
  const tickRef   = useRef(0);
  const hitRef    = useRef<Array<{ id: string; poly: [number, number][] }>>([]);
  const originRef = useRef({ x: 0, y: 0 });

  const calcOrigin = useCallback((w: number, h: number) => ({
    x: w / 2,
    y: h / 2 - 50,
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      originRef.current = calcOrigin(canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loop = () => {
      const tick = tickRef.current++;
      const { x: ox, y: oy } = originRef.current;
      const cw = canvas.width, ch = canvas.height;

      ctx.fillStyle = "#08080f";
      ctx.fillRect(0, 0, cw, ch);

      // Ground — draw tiles diagonally (back-to-front)
      for (let d = 0; d <= 10; d++) {
        for (let col = Math.max(0, d - 5); col <= Math.min(d, 5); col++) {
          const row = d - col;
          if (row < 0 || row > 5) continue;
          drawTile(ctx, col, row, ox, oy);
        }
      }

      // Buildings — back-to-front
      const sorted = [...BUILDINGS].sort((a, b) => (a.col + a.row) - (b.col + b.row));
      hitRef.current = [];
      sorted.forEach((b, idx) => {
        drawBuilding(ctx, b, ox, oy, hoveredIdRef.current === b.id, tick, idx);
        hitRef.current.push({ id: b.id, poly: buildingHitPoly(b.col, b.row, b.height, ox, oy) });
      });

      drawScanlines(ctx, cw, ch, tick);
      drawVignette(ctx, cw, ch);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [calcOrigin]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: BuildingDef | null = null;
    for (let i = hitRef.current.length - 1; i >= 0; i--) {
      const h = hitRef.current[i];
      if (pointInPoly(mx, my, h.poly)) {
        found = BUILDINGS.find(b => b.id === h.id) ?? null;
        break;
      }
    }
    hoveredIdRef.current = found?.id ?? null;
    setHoveredBuilding(found);
    if (canvasRef.current) canvasRef.current.style.cursor = found ? "pointer" : "default";
  }, []);

  const onClick = useCallback(() => {
    if (hoveredBuilding) setSelectedBuilding(hoveredBuilding);
  }, [hoveredBuilding]);

  const onLeave = useCallback(() => {
    hoveredIdRef.current = null;
    setHoveredBuilding(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  return (
    <>
      <Header />

      <div className="fixed inset-0 bg-[#08080f]" style={{ zIndex: 0 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseMove={onMouseMove}
          onClick={onClick}
          onMouseLeave={onLeave}
          data-testid="canvas-world-district"
        />

        {/* HUD — top left (below fixed header) */}
        <div className="absolute left-5 font-mono pointer-events-none select-none space-y-1" style={{ top: 80 }}>
          <div className="text-[11px] tracking-[0.22em] text-[#5555aa] font-bold">VANTA OS</div>
          <div className="text-[10px] tracking-[0.18em] text-[#33334a]">DISTRICT&nbsp;01&nbsp;·&nbsp;SECTOR MAP</div>
          <div className="text-[10px] tracking-[0.14em] text-[#22223a] mt-1">{BUILDINGS.length} NODES MAPPED</div>
        </div>

        {/* HUD — bottom centre hover label */}
        <div
          className="absolute bottom-8 inset-x-0 flex flex-col items-center pointer-events-none select-none transition-opacity duration-150"
          style={{ opacity: hoveredBuilding && !selectedBuilding ? 1 : 0 }}
        >
          <div className="text-[10px] font-mono tracking-[0.2em] text-[#5555aa] mb-1">
            {hoveredBuilding?.subtitle?.toUpperCase()}
          </div>
          <div className="text-xl font-display font-bold text-white tracking-wider">
            {hoveredBuilding?.name}
          </div>
          <div className="text-[10px] font-mono tracking-[0.18em] text-[#2a2a44] mt-2">
            CLICK TO ENTER
          </div>
        </div>

        {/* Modal */}
        {selectedBuilding && (
          <div
            className="absolute inset-0 flex items-center justify-center z-20"
            style={{ background: "rgba(4,4,10,0.82)", backdropFilter: "blur(6px)" }}
            onClick={() => setSelectedBuilding(null)}
            data-testid="modal-building"
          >
            <div
              className="bg-[#0c0c18] border border-[#2a2a44] rounded-md p-8 max-w-md w-full mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
              data-testid="modal-building-content"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[10px] font-mono tracking-[0.22em] text-[#5555aa] mb-2">
                    {selectedBuilding.subtitle.toUpperCase()}
                  </p>
                  <h2 className="text-2xl font-display font-bold text-white leading-tight">
                    {selectedBuilding.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="text-[#33334a] hover:text-white transition-colors ml-6 mt-1 shrink-0"
                  data-testid="button-close-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-[#7777a0] text-sm leading-relaxed mb-7">
                {selectedBuilding.lore}
              </p>

              {selectedBuilding.comingSoon ? (
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] tracking-[0.18em] border-[#2a2a44] text-[#33334a]"
                  data-testid="badge-coming-soon"
                >
                  COMING SOON
                </Badge>
              ) : (
                <Button
                  onClick={() => { navigate(selectedBuilding.href!); setSelectedBuilding(null); }}
                  className="w-full gap-2 font-mono tracking-widest text-xs"
                  data-testid="button-enter-node"
                >
                  ENTER NODE <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
