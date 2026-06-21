import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { X, ChevronRight, AlertTriangle, Lock, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Isometric + camera constants ────────────────────────────────────────────
const TW = 56, TH = 28, HW = TW / 2, HH = TH / 2, WU = 12;
const CAM_SPEED = 3.5;
const MAX_PAN_X = 320;
const MAX_PAN_Y = 200;

// ─── Palettes ────────────────────────────────────────────────────────────────
const PALETTES = {
  violet:  { top: "#1a0835", left: "#110521", right: "#16072e", neon: "#a855f7", accent: "#7c3aed" },
  blue:    { top: "#061530", left: "#04101f", right: "#051228", neon: "#38bdf8", accent: "#0ea5e9" },
  red:     { top: "#2e0808", left: "#1f0505", right: "#260606", neon: "#ef4444", accent: "#b91c1c" },
  green:   { top: "#062215", left: "#04170e", right: "#051c11", neon: "#22c55e", accent: "#15803d" },
  slate:   { top: "#101020", left: "#0b0b18", right: "#0e0e1c", neon: "#94a3b8", accent: "#64748b" },
  dark:    { top: "#0a0a12", left: "#060610", right: "#080810", neon: "#6366f1", accent: "#4f46e5" },
  core:    { top: "#18082e", left: "#0e0520", right: "#140628", neon: "#e879f9", accent: "#c026d3" },
  crimson: { top: "#260606", left: "#1a0404", right: "#200505", neon: "#f87171", accent: "#dc2626" },
  noir:    { top: "#0c0c16", left: "#08080f", right: "#0a0a13", neon: "#a1a1aa", accent: "#52525b" },
  plague:  { top: "#0a1808", left: "#071006", right: "#091407", neon: "#a3e635", accent: "#84cc16" },
} as const;
type PaletteKey = keyof typeof PALETTES;

// ─── Types ───────────────────────────────────────────────────────────────────
interface BuildingDef {
  id: string; name: string; subtitle: string; lore: string;
  href: string | null; col: number; row: number; height: number;
  palette: PaletteKey; comingSoon?: boolean; locked?: boolean;
}
interface DecoDef { col: number; row: number; height: number; palette: PaletteKey; }

// ─── Interactive nodes — col-row values must all be unique ───────────────────
// Existing: 1,6,11,-3,2,5,8,3  New: -4,-2,4,-1  All unique ✓
const BUILDINGS: BuildingDef[] = [
  {
    id: "black-index", name: "BLACK INDEX", subtitle: "Search Protocol",
    col: 1, row: 0, height: 8, palette: "violet",
    lore: "The archive of forbidden transmissions. Every signal leaves a trace.",
    href: "/search",
  },
  {
    id: "transmissions", name: "TRANSMISSIONS", subtitle: "Signal Tower",
    col: 6, row: 0, height: 7, palette: "slate",
    lore: "The primary broadcast node. Raw signal originating from the label's core. Every thought and transmission routes through this tower.",
    href: "/",
  },
  {
    id: "music-hub", name: "MUSIC HUB", subtitle: "Audio Node",
    col: 11, row: 0, height: 7, palette: "blue",
    lore: "The sound engine of Vanta Cold. Releases, previews, and sonic artifacts. The heartbeat of the city, measured in BPM.",
    href: "/releases",
  },
  {
    id: "vault-gate", name: "VAULT GATE", subtitle: "Restricted Access",
    col: 1, row: 4, height: 9, palette: "red",
    lore: "Restricted archive. Code-gated access only.",
    href: "/vault",
  },
  {
    id: "mission-handler", name: "MISSION HANDLER", subtitle: "Command Node",
    col: 5, row: 3, height: 5, palette: "green",
    lore: "The command layer. Assignments, access, and OS directives begin here.",
    href: "/enter",
  },
  {
    id: "worlds-archive", name: "WORLDS ARCHIVE", subtitle: "Universe Registry",
    col: 8, row: 3, height: 6, palette: "violet",
    lore: "The map of connected universes. Every project, mythology, and territory catalogued here.",
    href: "/worlds",
  },
  {
    id: "vanta-os-core", name: "VANTA OS CORE", subtitle: "System Heart",
    col: 12, row: 4, height: 11, palette: "core",
    lore: "The central system node. All roads eventually route back to the core.",
    href: "/enter",
  },
  {
    id: "vanta-box", name: "VANTA BOX", subtitle: "Sector Unknown",
    col: 10, row: 7, height: 3, palette: "dark", comingSoon: true,
    lore: "A structure whose purpose remains classified. Signals go in. Nothing comes back.",
    href: null,
  },
  {
    id: "fract-terminal", name: "FRACT TERMINAL", subtitle: "Reputation Economy",
    col: 3, row: 7, height: 4, palette: "plague",
    lore: "Terminal node for the FRACT network — the reputation layer of the system. Earned, never bought.",
    href: "/fract",
  },
  {
    id: "wireline-terminal", name: "WIRELINE TERMINAL", subtitle: "Dispatch Relay",
    col: 6, row: 8, height: 3, palette: "noir",
    lore: "A hardwired access point. Monitor public channels, announcements, and mission relays.",
    href: "/wireline",
  },
  {
    id: "hidden-himalayas", name: "HIDDEN HIMALAYAS", subtitle: "Cold Expansion",
    col: 12, row: 8, height: 5, palette: "blue",
    lore: "A spiritual zone buried in the snow. The Equinox Eye shrine waits beneath the mountain.",
    href: "/himalayas",
  },
  {
    id: "fractured-godhead", name: "FRACTURED GODHEAD", subtitle: "Lore Archive",
    col: 7, row: 8, height: 6, palette: "crimson",
    lore: "The mythology archive — characters, factions, locations, and artifacts of the universe.",
    href: "/fgh",
  },
];

// ─── Fast travel destinations ─────────────────────────────────────────────────
const FAST_TRAVEL = [
  { label: "BLACK INDEX",    col: 1,  row: 0, height: 8  },
  { label: "MUSIC HUB",     col: 11, row: 0, height: 7  },
  { label: "VAULT GATE",    col: 1,  row: 4, height: 9  },
  { label: "VANTA OS CORE", col: 12, row: 4, height: 11 },
  { label: "HIMALAYAS",     col: 12, row: 8, height: 5  },
];

// ─── Decorative city fill (positions of new interactive nodes removed) ────────
const DECO: DecoDef[] = [
  // NW block
  { col:0, row:0, height:6, palette:"crimson" }, { col:2, row:0, height:4, palette:"noir" },
  { col:3, row:0, height:5, palette:"dark" },    { col:0, row:1, height:3, palette:"plague" },
  { col:2, row:1, height:5, palette:"noir" },    { col:3, row:1, height:2, palette:"crimson" },
  // NC block
  { col:5, row:0, height:5, palette:"violet" },  { col:7, row:0, height:4, palette:"noir" },
  { col:8, row:0, height:3, palette:"blue" },    { col:5, row:1, height:3, palette:"dark" },
  { col:7, row:1, height:4, palette:"slate" },   { col:8, row:1, height:2, palette:"crimson" },
  // NE block
  { col:10, row:0, height:5, palette:"blue" },   { col:12, row:0, height:4, palette:"noir" },
  { col:13, row:0, height:6, palette:"dark" },   { col:10, row:1, height:2, palette:"plague" },
  { col:12, row:1, height:3, palette:"blue" },   { col:13, row:1, height:4, palette:"slate" },
  // SW block
  { col:0, row:3, height:5, palette:"crimson" }, { col:2, row:3, height:3, palette:"dark" },
  { col:3, row:3, height:4, palette:"noir" },    { col:0, row:4, height:7, palette:"noir" },
  { col:2, row:4, height:4, palette:"violet" },  { col:3, row:4, height:2, palette:"dark" },
  { col:0, row:5, height:4, palette:"crimson" }, { col:2, row:5, height:3, palette:"plague" },
  { col:3, row:5, height:5, palette:"noir" },
  // Center block
  { col:6, row:3, height:4, palette:"violet" },  { col:7, row:3, height:3, palette:"noir" },
  { col:5, row:4, height:3, palette:"slate" },   { col:6, row:4, height:3, palette:"dark" },
  { col:7, row:4, height:4, palette:"crimson" }, { col:5, row:5, height:4, palette:"noir" },
  { col:6, row:5, height:3, palette:"violet" },  { col:7, row:5, height:5, palette:"blue" },
  { col:8, row:4, height:3, palette:"crimson" }, { col:8, row:5, height:2, palette:"dark" },
  // SE block
  { col:10, row:3, height:5, palette:"blue" },   { col:11, row:3, height:3, palette:"dark" },
  { col:13, row:3, height:6, palette:"noir" },   { col:10, row:4, height:3, palette:"crimson" },
  { col:11, row:4, height:4, palette:"slate" },  { col:13, row:4, height:2, palette:"plague" },
  { col:10, row:5, height:4, palette:"violet" }, { col:11, row:5, height:5, palette:"blue" },
  { col:13, row:5, height:3, palette:"crimson" },
  // Far south (new interactive nodes at (3,7) (6,8) (7,8) (12,8) removed from deco)
  { col:0, row:7, height:3, palette:"dark" },    { col:1, row:7, height:4, palette:"noir" },
  { col:2, row:7, height:2, palette:"crimson" },
  { col:5, row:7, height:4, palette:"violet" },  { col:8, row:7, height:2, palette:"dark" },
  { col:11, row:7, height:3, palette:"crimson" },{ col:13, row:7, height:3, palette:"noir" },
  { col:0, row:8, height:2, palette:"plague" },  { col:2, row:8, height:3, palette:"dark" },
  { col:3, row:8, height:2, palette:"slate" },   { col:5, row:8, height:3, palette:"violet" },
  { col:8, row:8, height:3, palette:"blue" },    { col:11, row:8, height:2, palette:"dark" },
  { col:13, row:8, height:2, palette:"crimson" },
];

// ─── Streets ──────────────────────────────────────────────────────────────────
const STREET_ROWS = new Set([2, 6]);
const STREET_COLS = new Set([4, 9]);
const isStreet = (col: number, row: number) => STREET_ROWS.has(row) || STREET_COLS.has(col);

// ─── Pre-sorted render lists ──────────────────────────────────────────────────
const ALL_TILES = (() => {
  const t: { col: number; row: number }[] = [];
  for (let c = 0; c <= 13; c++) for (let r = 0; r <= 8; r++) t.push({ col: c, row: r });
  return t.sort((a, b) => (a.col + a.row) - (b.col + b.row));
})();

const ALL_BUILDINGS = [
  ...BUILDINGS.map(b => ({ ...b, interactive: true as const })),
  ...DECO.map(d => ({
    ...d, id: `d-${d.col}-${d.row}`, name: "", subtitle: "", lore: "",
    href: null, comingSoon: false, locked: false, interactive: false as const,
  })),
].sort((a, b) => (a.col + a.row) - (b.col + b.row));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoXY(col: number, row: number, ox: number, oy: number) {
  return { x: (col - row) * HW + ox, y: (col + row) * HH + oy };
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function drawTile(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const street = isStreet(col, row);
  const intersection = STREET_ROWS.has(row) && STREET_COLS.has(col);
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + HW, y + HH);
  ctx.lineTo(x, y + TH); ctx.lineTo(x - HW, y + HH);
  ctx.closePath();
  ctx.fillStyle = intersection ? "#0e0e1e" : street ? "#0a0a16" : (col + row) % 2 === 0 ? "#07070f" : "#060609";
  ctx.fill();
  ctx.strokeStyle = street ? "#13132a" : "#0d0d18"; ctx.lineWidth = 0.5; ctx.stroke();
  if (STREET_ROWS.has(row) && !STREET_COLS.has(col)) {
    ctx.beginPath();
    ctx.moveTo(x - HW * 0.35, y + HH); ctx.lineTo(x + HW * 0.35, y + HH);
    ctx.strokeStyle = "#1c1c3830"; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  col: number, row: number, height: number, palette: PaletteKey,
  ox: number, oy: number, isHov: boolean, tick: number,
  sign?: string, locked?: boolean,
) {
  const { x, y } = isoXY(col, row, ox, oy);
  const p = PALETTES[palette];
  const wh = height * WU;
  const pulse = Math.sin(tick * 0.05 + col * 0.7 + row * 0.4) * 0.15 + 0.85;
  const dim = locked ? 0.45 : 1;

  if (isHov) { ctx.save(); ctx.shadowColor = p.neon; ctx.shadowBlur = 28; }

  ctx.save(); ctx.globalAlpha = dim;

  // Left face
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.lineTo(x - HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = p.left; ctx.fill();
  if (isHov) { ctx.strokeStyle = p.neon + "55"; ctx.lineWidth = 0.5; ctx.stroke(); }

  // Right face
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x + HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = p.right; ctx.fill();
  if (isHov) { ctx.strokeStyle = p.neon + "40"; ctx.lineWidth = 0.5; ctx.stroke(); }

  // Windows — left face
  const winRows = Math.max(1, height - 1);
  for (let wr = 0; wr < winRows; wr++) {
    for (let wc = 0; wc < 2; wc++) {
      if (Math.sin(tick * 0.018 + col * 1.5 + row * 0.9 + wr * 2.3 + wc * 1.8) < (locked ? 0.7 : 0.2)) continue;
      const wx = x - HW * (0.25 + wc * 0.35), wy = y - wh + wr * WU + WU * 0.35;
      ctx.save(); ctx.globalAlpha = isHov ? 0.85 : 0.5;
      ctx.fillStyle = p.neon; ctx.shadowColor = p.neon; ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(wx, wy - 2.5); ctx.lineTo(wx - 3.5, wy);
      ctx.lineTo(wx, wy + 2.5); ctx.lineTo(wx + 3.5, wy);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  // Windows — right face
  for (let wr = 0; wr < winRows; wr++) {
    if (Math.sin(tick * 0.022 + col * 1.1 + row * 1.6 + wr * 1.9) < (locked ? 0.8 : 0.3)) continue;
    const wx = x + HW * 0.38, wy = y - wh + wr * WU + WU * 0.35;
    ctx.save(); ctx.globalAlpha = isHov ? 0.55 : 0.3;
    ctx.fillStyle = p.accent; ctx.shadowColor = p.neon; ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(wx, wy - 2); ctx.lineTo(wx + 3, wy);
    ctx.lineTo(wx, wy + 2); ctx.lineTo(wx - 3, wy);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // Roof
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x, y + TH - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.closePath(); ctx.fillStyle = p.top; ctx.fill();

  // Gothic peaked roof
  if (height >= 6 && sign) {
    ctx.beginPath();
    ctx.moveTo(x - HW, y + HH - wh); ctx.lineTo(x, y - wh - height * 1.6);
    ctx.lineTo(x + HW, y + HH - wh);
    ctx.fillStyle = p.top + "90"; ctx.fill();
    ctx.strokeStyle = p.neon + (locked ? "18" : "28"); ctx.lineWidth = 0.5; ctx.stroke();
  }

  ctx.restore(); // globalAlpha

  // Neon roof + sign (reduced for locked)
  if (sign) {
    ctx.save();
    ctx.shadowColor = p.neon; ctx.shadowBlur = 14 * pulse * (locked ? 0.3 : 1);
    ctx.globalAlpha = locked ? 0.35 : 1;
    ctx.strokeStyle = p.neon + (locked ? "44" : "cc"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh); ctx.stroke();
    ctx.restore();

    const sy = y - wh - (height >= 6 ? 22 : 14);
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 7px monospace";
    ctx.globalAlpha = locked ? 0.28 : (0.65 + pulse * 0.35);
    for (let g = 3; g >= 0; g--) {
      ctx.shadowColor = p.neon; ctx.shadowBlur = g * 8 + 3;
      ctx.fillStyle = g === 0 ? "#ffffff" : p.neon;
      ctx.fillText(sign, x, sy);
    }
    ctx.restore();
  }

  // Antenna
  if (height >= 8) {
    ctx.save();
    ctx.globalAlpha = locked ? 0.3 : 1;
    ctx.strokeStyle = isHov ? p.neon : p.accent + "55";
    ctx.lineWidth = 1; ctx.shadowColor = p.neon; ctx.shadowBlur = isHov ? 10 : 3;
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x, y - wh - 16); ctx.stroke();
    if (!locked && Math.floor(tick / 25) % 2 === 0) {
      ctx.beginPath(); ctx.arc(x, y - wh - 16, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.neon; ctx.shadowBlur = 10; ctx.fill();
    }
    ctx.restore();
  }

  if (isHov) ctx.restore();

  // Bottom label
  if (sign) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = '8px "Space Grotesk", monospace';
    ctx.globalAlpha = locked ? 0.4 : 1;
    ctx.fillStyle = isHov ? p.neon : "#33334a";
    if (isHov) { ctx.shadowColor = p.neon; ctx.shadowBlur = 8; }
    ctx.fillText(sign, x, y + HH + 14);
    if (locked) {
      ctx.font = "6px monospace"; ctx.fillStyle = "#44444a"; ctx.globalAlpha = 0.6;
      ctx.fillText("LOCKED", x, y + HH + 25);
    }
    ctx.restore();
  }
}

function drawCheckpoints(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const pts = [{ col: 4, row: 2 }, { col: 9, row: 2 }, { col: 4, row: 6 }, { col: 9, row: 6 }];
  for (const cp of pts) {
    const { x, y } = isoXY(cp.col, cp.row, ox, oy);
    ctx.save();
    ctx.strokeStyle = "#ef444440"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - HW * 0.6, y + HH * 0.55); ctx.lineTo(x - HW * 0.6, y + HH * 0.55 - 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + HW * 0.6, y + HH * 0.55); ctx.lineTo(x + HW * 0.6, y + HH * 0.55 - 11); ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = "#ef444428";
    ctx.beginPath(); ctx.moveTo(x - HW * 0.6, y + HH * 0.55 - 11); ctx.lineTo(x + HW * 0.6, y + HH * 0.55 - 11); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y + HH * 0.55 - 11, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 7; ctx.fill();
    ctx.restore();
  }
}

function drawFog(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  const bands = [
    { y: h * 0.18, a: 0.09, span: 100 }, { y: h * 0.48, a: 0.06, span: 140 }, { y: h * 0.72, a: 0.12, span: 80 },
  ];
  for (const b of bands) {
    const drift = Math.sin(tick * 0.002 + b.y * 0.01) * 18;
    const g = ctx.createLinearGradient(0, b.y - b.span / 2 + drift, 0, b.y + b.span / 2 + drift);
    g.addColorStop(0, "transparent"); g.addColorStop(0.5, `rgba(8,3,22,${b.a})`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  const bf = ctx.createLinearGradient(0, h * 0.72, 0, h);
  bf.addColorStop(0, "transparent"); bf.addColorStop(1, "rgba(3,1,10,0.38)");
  ctx.fillStyle = bf; ctx.fillRect(0, 0, w, h);
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, h * 0.88);
  g.addColorStop(0, "transparent"); g.addColorStop(1, "rgba(2,1,8,0.72)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = "#000";
  const off = (tick * 0.4) % 4;
  for (let y = off; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  ctx.restore();
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef   = useRef(0);
  const animRef   = useRef<number>(0);
  const hoveredRef = useRef<string | null>(null);
  const hitRef    = useRef<{ id: string; cx: number; cy: number; r: number }[]>([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const keysRef   = useRef(new Set<string>());
  const camTargetRef = useRef<{ x: number; y: number } | null>(null);
  const touchRef  = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);

  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<BuildingDef | null>(null);
  const [showJumpMenu, setShowJumpMenu] = useState(false);

  const calcOrigin = useCallback((w: number, h: number) => ({
    x: w / 2 - 112,
    y: h / 2 - 100,
  }), []);

  const nodesOnline = BUILDINGS.filter(b => !b.comingSoon && !b.locked).length;

  function jumpTo(col: number, row: number, height: number) {
    const tx = Math.max(-MAX_PAN_X, Math.min(MAX_PAN_X, 112 - (col - row) * HW));
    const ty = Math.max(-MAX_PAN_Y, Math.min(MAX_PAN_Y, 100 - (col + row) * HH - height * WU * 0.35));
    camTargetRef.current = { x: tx, y: ty };
    setShowJumpMenu(false);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Key input
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      keysRef.current.add(e.key);
      const moveKeys = ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","s","a","d","W","S","A","D"];
      if (moveKeys.includes(e.key)) { e.preventDefault(); camTargetRef.current = null; }
    }
    function onKeyUp(e: KeyboardEvent) { keysRef.current.delete(e.key); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Touch input (non-passive for preventDefault)
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      touchRef.current = { x: t.clientX, y: t.clientY, camX: cameraRef.current.x, camY: cameraRef.current.y };
      camTargetRef.current = null;
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!touchRef.current) return;
      const t = e.touches[0];
      cameraRef.current.x = Math.max(-MAX_PAN_X, Math.min(MAX_PAN_X, touchRef.current.camX + t.clientX - touchRef.current.x));
      cameraRef.current.y = Math.max(-MAX_PAN_Y, Math.min(MAX_PAN_Y, touchRef.current.camY + t.clientY - touchRef.current.y));
    }
    function onTouchEnd() { touchRef.current = null; }
    canvas.addEventListener("touchstart", onTouchStart);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    function drawHUD(w: number, h: number, tick: number) {
      const hovB = BUILDINGS.find(b => b.id === hoveredRef.current);
      const cam = cameraRef.current;

      // Main panel — top left
      ctx.save();
      ctx.fillStyle = "#ffffff05"; ctx.fillRect(20, 78, 232, 90);
      ctx.strokeStyle = "#ffffff0c"; ctx.lineWidth = 0.5; ctx.strokeRect(20, 78, 232, 90);

      const lines = [
        { text: "VANTA CITY  ·  DISTRICT 01", font: "bold 9px monospace", color: "#c084fc", glow: "#c084fc" },
        { text: `${nodesOnline} NODES ONLINE  ·  ${ALL_BUILDINGS.length} STRUCTURES`, font: "8px monospace", color: "#2a2a42", glow: "" },
        { text: hovB ? `> ${hovB.name}` : "HOVER TO IDENTIFY NODE", font: "8px monospace", color: hovB ? PALETTES[hovB.palette].neon : "#2a2a42", glow: hovB ? PALETTES[hovB.palette].neon : "" },
        { text: hovB ? hovB.subtitle.toUpperCase() : "", font: "7px monospace", color: "#1e1e38", glow: "" },
        { text: "WASD / ARROWS TO MOVE", font: "7px monospace", color: "#1e1e38", glow: "" },
      ];
      lines.forEach(({ text, font, color, glow }, i) => {
        if (!text) return;
        ctx.font = font; ctx.fillStyle = color;
        ctx.shadowColor = glow || "transparent"; ctx.shadowBlur = glow ? 6 : 0;
        ctx.fillText(text, 28, 94 + i * 15);
      });

      if (Math.floor(tick / 32) % 2 === 0) {
        ctx.fillStyle = "#c084fc1a"; ctx.fillRect(20, 168, 232, 1);
      }

      // Camera coords
      ctx.shadowBlur = 0; ctx.font = "7px monospace"; ctx.fillStyle = "#18182e";
      ctx.fillText(`CAM  ${cam.x >= 0 ? "+" : ""}${cam.x.toFixed(0)}, ${cam.y >= 0 ? "+" : ""}${cam.y.toFixed(0)}`, 28, 162);
      ctx.restore();

      // Vanta Radio — bottom right
      const rw = 188, rh = 54, rx = w - rw - 20, ry = h - 30 - rh - 10;
      ctx.save();
      ctx.fillStyle = "#ffffff05"; ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = "#ffffff0c"; ctx.lineWidth = 0.5; ctx.strokeRect(rx, ry, rw, rh);
      ctx.font = "bold 8px monospace"; ctx.fillStyle = "#c084fc";
      ctx.shadowColor = "#c084fc"; ctx.shadowBlur = 4;
      ctx.fillText("VANTA RADIO", rx + 12, ry + 16);
      const blink = Math.floor(tick / 38) % 2 === 0;
      ctx.font = "7px monospace"; ctx.fillStyle = blink ? "#ef4444" : "#5a1a1a";
      ctx.shadowColor = blink ? "#ef4444" : "transparent"; ctx.shadowBlur = blink ? 5 : 0;
      ctx.fillText("● LIVE", rx + 12, ry + 30);
      ctx.shadowBlur = 0; ctx.fillStyle = "#2a2a42";
      ctx.fillText("Now Playing: Babyboi Loco", rx + 12, ry + 44);
      ctx.restore();

      // Status bar
      ctx.save();
      ctx.fillStyle = "#ffffff04"; ctx.fillRect(0, h - 30, w, 30);
      ctx.strokeStyle = "#ffffff0a"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h - 30); ctx.lineTo(w, h - 30); ctx.stroke();
      ctx.font = "8px monospace"; ctx.fillStyle = "#2a2a40";
      const status = hovB
        ? `NODE: ${hovB.name}  ·  ${hovB.subtitle.toUpperCase()}  ·  CLICK TO ENTER`
        : `VANTA CITY / DISTRICT 01  ·  ${ALL_BUILDINGS.length} STRUCTURES  ·  ${nodesOnline} ONLINE`;
      ctx.fillText(status, 16, h - 10);
      ctx.fillText(`SYS ${new Date().toLocaleTimeString("en-US", { hour12: false })}`, w - 90, h - 10);
      ctx.restore();
    }

    function draw() {
      tickRef.current++;
      const tick = tickRef.current;
      const w = canvas!.width, h = canvas!.height;
      const cam = cameraRef.current;
      const keys = keysRef.current;

      // Keyboard camera movement
      if (keys.has("w") || keys.has("W") || keys.has("ArrowUp"))    cam.y = Math.max(-MAX_PAN_Y, cam.y - CAM_SPEED);
      if (keys.has("s") || keys.has("S") || keys.has("ArrowDown"))  cam.y = Math.min(MAX_PAN_Y,  cam.y + CAM_SPEED);
      if (keys.has("a") || keys.has("A") || keys.has("ArrowLeft"))  cam.x = Math.max(-MAX_PAN_X, cam.x - CAM_SPEED);
      if (keys.has("d") || keys.has("D") || keys.has("ArrowRight")) cam.x = Math.min(MAX_PAN_X,  cam.x + CAM_SPEED);

      // Smooth lerp to fast-travel target
      if (camTargetRef.current) {
        const { x: tx, y: ty } = camTargetRef.current;
        cam.x += (tx - cam.x) * 0.09;
        cam.y += (ty - cam.y) * 0.09;
        if (Math.abs(tx - cam.x) < 0.4 && Math.abs(ty - cam.y) < 0.4) {
          cam.x = tx; cam.y = ty; camTargetRef.current = null;
        }
      }

      const { x: baseOx, y: baseOy } = calcOrigin(w, h);
      const ox = baseOx + cam.x;
      const oy = baseOy + cam.y;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#04040b"; ctx.fillRect(0, 0, w, h);

      for (const tile of ALL_TILES) drawTile(ctx, tile.col, tile.row, ox, oy);

      hitRef.current = [];
      for (const b of ALL_BUILDINGS) {
        const isHov = b.interactive && hoveredRef.current === b.id;
        drawBuilding(ctx, b.col, b.row, b.height, b.palette, ox, oy, isHov, tick,
          b.interactive ? b.name : undefined, b.locked);
        if (b.interactive) {
          const { x, y } = isoXY(b.col, b.row, ox, oy);
          hitRef.current.push({ id: b.id, cx: x, cy: y - b.height * WU * 0.55, r: 34 });
        }
      }

      drawCheckpoints(ctx, ox, oy);
      drawFog(ctx, w, h, tick);
      drawVignette(ctx, w, h);
      drawScanlines(ctx, w, h, tick);
      drawHUD(w, h, tick);

      animRef.current = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [calcOrigin, nodesOnline]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found: string | null = null;
    for (const h of hitRef.current) {
      if (Math.hypot(mx - h.cx, my - h.cy) < h.r) { found = h.id; break; }
    }
    hoveredRef.current = found;
    setHovered(found);
    canvasRef.current!.style.cursor = found ? "pointer" : "default";
  }

  function handleClick() {
    if (hoveredRef.current) {
      const b = BUILDINGS.find(b => b.id === hoveredRef.current);
      if (b) setSelected(b);
    }
  }

  function handleLeave() {
    hoveredRef.current = null; setHovered(null);
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }

  const hoveredBuilding = BUILDINGS.find(b => b.id === hovered);

  return (
    <div className="fixed inset-0 bg-[#04040b] overflow-hidden">
      <Header />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleLeave}
        data-testid="canvas-world"
      />

      {/* Fast travel menu */}
      <div className="fixed z-20" style={{ top: 82, right: 20 }}>
        <button
          onClick={() => setShowJumpMenu(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors rounded-sm backdrop-blur-sm"
          data-testid="button-jump-menu"
        >
          <Compass className="w-3 h-3" /> DISTRICT MAP
        </button>
        {showJumpMenu && (
          <div className="absolute top-full right-0 mt-1 bg-black/92 border border-white/10 rounded-sm backdrop-blur-sm min-w-[170px] overflow-hidden">
            {FAST_TRAVEL.map(ft => (
              <button
                key={ft.label}
                onClick={() => jumpTo(ft.col, ft.row, ft.height)}
                className="w-full text-left px-4 py-2.5 text-[10px] font-mono text-muted-foreground hover:text-purple-400 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 tracking-widest"
                data-testid={`button-jump-${ft.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredBuilding && !selected && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none" data-testid="tooltip-building">
          <div className="bg-black/80 border border-white/10 backdrop-blur-sm px-6 py-3 rounded-sm text-center">
            <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: PALETTES[hoveredBuilding.palette].neon }}>
              {hoveredBuilding.name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{hoveredBuilding.subtitle}</p>
          </div>
        </div>
      )}

      {/* Node modal */}
      {selected && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            className="relative z-10 max-w-md w-full bg-[#06060f] border border-white/10 rounded-sm p-8"
            onClick={e => e.stopPropagation()}
            data-testid="modal-building"
            style={{ boxShadow: `0 0 48px ${PALETTES[selected.palette].neon}18` }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: PALETTES[selected.palette].neon }}>
                  {selected.subtitle}
                </p>
                <h2 className="text-2xl font-display font-bold text-foreground">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground transition-colors mt-1" data-testid="button-close-modal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: PALETTES[selected.palette].neon + "30" }} />
              <span className="text-xs font-mono text-muted-foreground tracking-widest">NODE BRIEFING</span>
              <div className="h-px flex-1" style={{ background: PALETTES[selected.palette].neon + "30" }} />
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mb-8 font-mono">{selected.lore}</p>

            <div className="flex gap-3 flex-wrap">
              {selected.locked ? (
                <Badge variant="secondary" className="font-mono text-xs gap-1.5" data-testid="badge-locked">
                  <Lock className="w-3 h-3" /> SECTOR LOCKED
                </Badge>
              ) : selected.comingSoon ? (
                <Badge variant="secondary" className="font-mono text-xs gap-1.5" data-testid="badge-coming-soon">
                  <AlertTriangle className="w-3 h-3" /> SECTOR UNAVAILABLE
                </Badge>
              ) : (
                <Button
                  onClick={() => { setSelected(null); if (selected.href) navigate(selected.href); }}
                  className="flex-1 font-mono text-xs uppercase tracking-widest"
                  variant="outline"
                  style={{
                    backgroundColor: PALETTES[selected.palette].neon + "15",
                    borderColor: PALETTES[selected.palette].neon + "40",
                    color: PALETTES[selected.palette].neon,
                  }}
                  data-testid="button-enter-node"
                >
                  <ChevronRight className="w-3.5 h-3.5 mr-1.5" /> ENTER NODE
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSelected(null)} className="font-mono text-xs" data-testid="button-dismiss-modal">
                DISMISS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
