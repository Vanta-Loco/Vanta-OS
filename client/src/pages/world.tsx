import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import {
  X, ChevronRight, AlertTriangle, Lock, Compass,
  ChevronUp, ChevronDown, ChevronLeft, ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Isometric constants ──────────────────────────────────────────────────────
const TW = 56, TH = 28, HW = TW / 2, HH = TH / 2, WU = 15;
const COLS = 34, ROWS = 22;
const PLAYER_SPEED = 4.4;        // tiles / second
const ENTER_DIST = 1.7;          // tile distance to a node entrance to allow entry
const CAM_ANCHOR_Y = 0.6;        // fraction of height the avatar sits at (near street-level)

// ─── Palettes ─────────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface NodeDef {
  id: string; name: string; subtitle: string; lore: string; region: string;
  href: string | null; col: number; row: number;
  entranceCol: number; entranceRow: number;
  height: number; palette: PaletteKey; comingSoon?: boolean;
}
interface Building {
  col: number; row: number; height: number; palette: PaletteKey;
  interactive: boolean; node?: NodeDef;
}
interface RenderItem {
  kind: "building" | "lamp"; col: number; row: number; sort: number;
  building?: Building;
}

// ─── Interactive nodes (routes preserved) ─────────────────────────────────────
const NODES: NodeDef[] = [
  { id: "black-index", name: "BLACK INDEX", subtitle: "Search Protocol", region: "INDEX QUARTER",
    col: 2, row: 1, entranceCol: 3, entranceRow: 1, height: 9, palette: "violet", href: "/search",
    lore: "The archive of forbidden transmissions. Every signal leaves a trace." },
  { id: "transmissions", name: "TRANSMISSIONS", subtitle: "Signal Tower", region: "SIGNAL HEIGHTS",
    col: 8, row: 2, entranceCol: 9, entranceRow: 2, height: 12, palette: "slate", href: "/",
    lore: "The primary broadcast node. Raw signal originating from the label's core. Every thought routes through this tower." },
  { id: "music-hub", name: "MUSIC HUB", subtitle: "Audio Node", region: "SOUND DISTRICT",
    col: 14, row: 2, entranceCol: 15, entranceRow: 2, height: 9, palette: "blue", href: "/releases",
    lore: "The sound engine of Vanta Cold. Releases, previews, and sonic artifacts. The heartbeat of the city, measured in BPM." },
  { id: "worlds-archive", name: "WORLDS ARCHIVE", subtitle: "Universe Registry", region: "ARCHIVE WARD",
    col: 20, row: 2, entranceCol: 21, entranceRow: 2, height: 8, palette: "violet", href: "/worlds",
    lore: "The map of connected universes. Every project, mythology, and territory catalogued here." },
  { id: "vault-gate", name: "VAULT GATE", subtitle: "Restricted Access", region: "VAULT PRECINCT",
    col: 2, row: 7, entranceCol: 3, entranceRow: 7, height: 11, palette: "red", href: "/vault",
    lore: "Restricted archive. Code-gated access only. The city's deepest secrets sit behind this door." },
  { id: "mission-handler", name: "MISSION HANDLER", subtitle: "Command Node", region: "COMMAND ROW",
    col: 8, row: 7, entranceCol: 9, entranceRow: 7, height: 6, palette: "green", href: "/enter",
    lore: "The command layer. Assignments, access, and OS directives begin here." },
  { id: "vanta-os-core", name: "VANTA OS CORE", subtitle: "System Heart", region: "THE CORE",
    col: 14, row: 11, entranceCol: 15, entranceRow: 11, height: 16, palette: "core", href: "/enter",
    lore: "The central system node. All roads in Vanta City eventually route back to the core." },
  { id: "vanta-box", name: "VANTA BOX", subtitle: "Sector Unknown", region: "DEAD SECTOR",
    col: 25, row: 11, entranceCol: 24, entranceRow: 11, height: 4, palette: "dark", comingSoon: true, href: null,
    lore: "A structure whose purpose remains classified. Signals go in. Nothing comes back." },
  { id: "fract-terminal", name: "FRACT TERMINAL", subtitle: "Reputation Economy", region: "FRACT EXCHANGE",
    col: 2, row: 12, entranceCol: 3, entranceRow: 12, height: 5, palette: "plague", href: "/fract",
    lore: "Terminal node for the FRACT network — the reputation layer of the system. Earned, never bought." },
  { id: "wireline-terminal", name: "WIRELINE TERMINAL", subtitle: "Dispatch Relay", region: "WIRELINE YARDS",
    col: 20, row: 12, entranceCol: 21, entranceRow: 12, height: 5, palette: "noir", href: "/wireline",
    lore: "A hardwired access point. Monitor public channels, announcements, and mission relays." },
  { id: "fractured-godhead", name: "FRACTURED GODHEAD", subtitle: "Lore Archive", region: "GODHEAD SLUMS",
    col: 14, row: 17, entranceCol: 15, entranceRow: 17, height: 8, palette: "crimson", href: "/fgh",
    lore: "The mythology archive — characters, factions, locations, and artifacts of the universe." },
  { id: "hidden-himalayas", name: "HIDDEN HIMALAYAS", subtitle: "Cold Expansion", region: "HIMALAYA GATE",
    col: 32, row: 9, entranceCol: 32, entranceRow: 8, height: 7, palette: "blue", href: "/himalayas",
    lore: "A spiritual zone buried in the snow at the city's edge. The Equinox Eye shrine waits beneath the mountain." },
];

// ─── Street / alley / lot grid ────────────────────────────────────────────────
const isStreet = (c: number, r: number) => c % 6 === 3 || r % 5 === 3;
const isAlley = (c: number, r: number) => c % 6 === 0 || r % 5 === 0;
const inGrid = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

const LOTS = new Set([
  "5,1", "5,2", "11,6", "11,7", "23,1", "23,2", "7,12", "7,11",
  "26,16", "26,17", "17,11", "17,12", "29,6", "29,7", "11,17", "5,17",
]);
const isLot = (c: number, r: number) => LOTS.has(`${c},${r}`);
const isWalkable = (c: number, r: number) =>
  inGrid(c, r) && (isStreet(c, r) || isAlley(c, r) || isLot(c, r));

// ─── Deterministic city generation ────────────────────────────────────────────
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function zoneInfo(c: number, r: number) {
  const cb = c < 11 ? 0 : c < 23 ? 1 : 2;
  const rb = r < 8 ? 0 : r < 14 ? 1 : 2;
  const PAL: PaletteKey[][][] = [
    [["violet", "noir", "dark"], ["slate", "noir", "dark"], ["blue", "noir", "dark"]],
    [["red", "crimson", "noir"], ["core", "violet", "dark"], ["dark", "noir", "slate"]],
    [["plague", "noir", "dark"], ["crimson", "red", "noir"], ["blue", "noir", "dark"]],
  ];
  const pals = PAL[rb][cb];
  let hMin = 2, hMax = 4;
  if (rb === 1 && cb === 1) { hMin = 4; hMax = 8; }
  else if (rb === 0) { hMin = 3; hMax = 7; }
  else if (rb === 1) { hMin = 3; hMax = 6; }
  return { pals, hMin, hMax };
}

const NODE_TILES = new Set(NODES.map((n) => `${n.col},${n.row}`));

const BUILDINGS: Building[] = (() => {
  const out: Building[] = [];
  for (const n of NODES) {
    out.push({ col: n.col, row: n.row, height: n.height, palette: n.palette, interactive: true, node: n });
  }
  const rng = mulberry32(1337);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (isWalkable(c, r) || NODE_TILES.has(`${c},${r}`)) continue;
      const z = zoneInfo(c, r);
      const pal = z.pals[Math.floor(rng() * z.pals.length)];
      let h = z.hMin + Math.floor(rng() * (z.hMax - z.hMin + 1));
      if (rng() < 0.06) h += 2 + Math.floor(rng() * 4); // occasional spire
      out.push({ col: c, row: r, height: h, palette: pal, interactive: false });
    }
  }
  return out;
})();

const LAMPS: { col: number; row: number }[] = (() => {
  const out: { col: number; row: number }[] = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++)
      if (c % 6 === 3 && r % 5 === 3) out.push({ col: c, row: r });
  return out;
})();

const CHECKPOINTS = [
  { col: 9, row: 8 }, { col: 21, row: 8 }, { col: 15, row: 13 },
  { col: 9, row: 13 }, { col: 21, row: 13 }, { col: 15, row: 3 },
];

// Combined, painter-sorted render list (buildings + lamps)
const RENDER_LIST: RenderItem[] = [
  ...BUILDINGS.map<RenderItem>((b) => ({ kind: "building", col: b.col, row: b.row, sort: b.col + b.row, building: b })),
  ...LAMPS.map<RenderItem>((l) => ({ kind: "lamp", col: l.col, row: l.row, sort: l.col + l.row - 0.05 })),
].sort((a, b) => a.sort - b.sort || a.row - b.row);

const FAST_TRAVEL = [
  "black-index", "music-hub", "vault-gate", "vanta-os-core",
  "fractured-godhead", "hidden-himalayas",
].map((id) => NODES.find((n) => n.id === id)!);

const NODES_ONLINE = NODES.filter((n) => !n.comingSoon).length;

function regionAt(col: number, row: number) {
  const cb = col < 11 ? 0 : col < 23 ? 1 : 2;
  const rb = row < 8 ? 0 : row < 14 ? 1 : 2;
  const NAMES = [
    ["INDEX QUARTER", "SIGNAL HEIGHTS", "ARCHIVE WARD"],
    ["VAULT PRECINCT", "THE CORE", "DEAD SECTOR"],
    ["FRACT EXCHANGE", "GODHEAD SLUMS", "HIMALAYA GATE"],
  ];
  return NAMES[rb][cb];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoXY(col: number, row: number, ox: number, oy: number) {
  return { x: (col - row) * HW + ox, y: (col + row) * HH + oy };
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function drawGround(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const street = isStreet(col, row);
  const alley = isAlley(col, row);
  const lot = isLot(col, row);
  const intersection = col % 6 === 3 && row % 5 === 3;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + HW, y + HH);
  ctx.lineTo(x, y + TH); ctx.lineTo(x - HW, y + HH);
  ctx.closePath();
  ctx.fillStyle = intersection ? "#0e0e1e"
    : street ? "#0a0a16"
    : lot ? "#0c0a12"
    : alley ? "#08080f"
    : (col + row) % 2 === 0 ? "#07070f" : "#060609";
  ctx.fill();
  ctx.strokeStyle = street ? "#13132a" : "#0c0c16"; ctx.lineWidth = 0.5; ctx.stroke();
  // center road dashes along horizontal street rows
  if (row % 5 === 3 && col % 6 !== 3) {
    ctx.beginPath();
    ctx.moveTo(x - HW * 0.35, y + HH); ctx.lineTo(x + HW * 0.35, y + HH);
    ctx.strokeStyle = "#26264a40"; ctx.lineWidth = 1; ctx.stroke();
  }
  if (lot) {
    // rubble specks
    ctx.fillStyle = "#1a1622";
    ctx.fillRect(x - 6, y + HH - 1, 3, 2);
    ctx.fillRect(x + 3, y + HH + 3, 4, 2);
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D, b: Building, ox: number, oy: number,
  hovered: boolean, near: boolean, tick: number,
) {
  const { x, y } = isoXY(b.col, b.row, ox, oy);
  const p = PALETTES[b.palette];
  const wh = b.height * WU;
  const node = b.node;
  const comingSoon = node?.comingSoon;
  const pulse = Math.sin(tick * 0.05 + b.col * 0.7 + b.row * 0.4) * 0.15 + 0.85;

  if (hovered) { ctx.save(); ctx.shadowColor = p.neon; ctx.shadowBlur = 26; }
  ctx.save(); ctx.globalAlpha = comingSoon ? 0.7 : 1;

  // Left face
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.lineTo(x - HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = p.left; ctx.fill();
  if (hovered) { ctx.strokeStyle = p.neon + "55"; ctx.lineWidth = 0.5; ctx.stroke(); }

  // Right face
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x + HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = p.right; ctx.fill();
  if (hovered) { ctx.strokeStyle = p.neon + "40"; ctx.lineWidth = 0.5; ctx.stroke(); }

  // Roof
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x, y + TH - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.closePath(); ctx.fillStyle = p.top; ctx.fill();

  // Gothic peaked roof for tall landmarks
  if (b.height >= 8) {
    ctx.beginPath();
    ctx.moveTo(x - HW, y + HH - wh); ctx.lineTo(x, y - wh - b.height * 1.4);
    ctx.lineTo(x + HW, y + HH - wh);
    ctx.fillStyle = p.top + "90"; ctx.fill();
    ctx.strokeStyle = p.neon + "26"; ctx.lineWidth = 0.5; ctx.stroke();
  }

  // Windows — only when near the player (perf) or interactive
  if (near || b.interactive) {
    const winRows = Math.max(1, b.height - 1);
    for (let wr = 0; wr < winRows; wr++) {
      for (let wc = 0; wc < 2; wc++) {
        if (Math.sin(tick * 0.018 + b.col * 1.5 + b.row * 0.9 + wr * 2.3 + wc * 1.8) < 0.25) continue;
        const wx = x - HW * (0.25 + wc * 0.35), wy = y - wh + wr * WU + WU * 0.4;
        ctx.globalAlpha = (b.interactive ? 0.7 : 0.4) * (comingSoon ? 0.4 : 1);
        ctx.fillStyle = p.neon;
        ctx.beginPath();
        ctx.moveTo(wx, wy - 2.2); ctx.lineTo(wx - 3, wy);
        ctx.lineTo(wx, wy + 2.2); ctx.lineTo(wx + 3, wy);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = comingSoon ? 0.7 : 1;
  }
  ctx.restore();

  // Neon roof edges + sign (interactive only)
  if (b.interactive && node) {
    ctx.save();
    ctx.shadowColor = p.neon; ctx.shadowBlur = 13 * pulse * (comingSoon ? 0.35 : 1);
    ctx.globalAlpha = comingSoon ? 0.4 : 1;
    ctx.strokeStyle = p.neon + (comingSoon ? "44" : "cc"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh); ctx.stroke();
    ctx.restore();

    // Antenna for tall towers
    if (b.height >= 9 && !comingSoon) {
      ctx.save();
      ctx.strokeStyle = hovered ? p.neon : p.accent + "66"; ctx.lineWidth = 1;
      ctx.shadowColor = p.neon; ctx.shadowBlur = hovered ? 10 : 3;
      ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x, y - wh - 18); ctx.stroke();
      if (Math.floor(tick / 25) % 2 === 0) {
        ctx.beginPath(); ctx.arc(x, y - wh - 18, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.neon; ctx.shadowBlur = 10; ctx.fill();
      }
      ctx.restore();
    }

    // Floating sign
    const sy = y - wh - (b.height >= 8 ? 24 : 14);
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 7px monospace";
    ctx.globalAlpha = comingSoon ? 0.3 : 0.65 + pulse * 0.35;
    for (let g = 3; g >= 0; g--) {
      ctx.shadowColor = p.neon; ctx.shadowBlur = g * 8 + 3;
      ctx.fillStyle = g === 0 ? "#ffffff" : p.neon;
      ctx.fillText(node.name, x, sy);
    }
    ctx.restore();

    // Ground label
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = '8px "Space Grotesk", monospace';
    ctx.fillStyle = hovered ? p.neon : "#3a3a52";
    if (hovered) { ctx.shadowColor = p.neon; ctx.shadowBlur = 8; }
    ctx.fillText(node.name, x, y + HH + 14);
    ctx.restore();
  }

  if (hovered) ctx.restore();
}

function drawLamp(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number, tick: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const flick = Math.sin(tick * 0.08 + col + row) * 0.1 + 0.9;
  ctx.save();
  ctx.strokeStyle = "#2a2440"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y + HH * 0.4); ctx.lineTo(x, y + HH * 0.4 - 22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + HH * 0.4 - 22); ctx.lineTo(x + 6, y + HH * 0.4 - 22); ctx.stroke();
  ctx.fillStyle = "#c084fc"; ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 12 * flick;
  ctx.beginPath(); ctx.arc(x + 6, y + HH * 0.4 - 21, 2.2, 0, Math.PI * 2); ctx.fill();
  // pool of light on ground
  ctx.globalAlpha = 0.06 * flick;
  ctx.fillStyle = "#a855f7";
  ctx.beginPath(); ctx.ellipse(x + 4, y + HH * 0.4, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number, tick: number, facing: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const bob = Math.sin(tick * 0.18) * 1.2;
  // shadow
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(x, y + HH * 0.25, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const baseY = y + HH * 0.25 + bob;
  const bh = 22;
  ctx.save();
  ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 16;
  // cloak body
  ctx.fillStyle = "#0b0712";
  ctx.beginPath();
  ctx.moveTo(x, baseY - bh);
  ctx.lineTo(x - 7, baseY);
  ctx.lineTo(x + 7, baseY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1; ctx.stroke();
  // hood / head
  ctx.fillStyle = "#15101f";
  ctx.beginPath(); ctx.arc(x, baseY - bh + 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1; ctx.stroke();
  // red eye glow (faces movement)
  ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 7;
  ctx.beginPath(); ctx.arc(x + facing * 1.6, baseY - bh + 4, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCheckpoint(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number) {
  const { x, y } = isoXY(col, row, ox, oy);
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

function drawFog(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  const bands = [
    { y: h * 0.16, a: 0.09, span: 110 }, { y: h * 0.46, a: 0.06, span: 150 }, { y: h * 0.78, a: 0.13, span: 90 },
  ];
  for (const b of bands) {
    const drift = Math.sin(tick * 0.002 + b.y * 0.01) * 20;
    const g = ctx.createLinearGradient(0, b.y - b.span / 2 + drift, 0, b.y + b.span / 2 + drift);
    g.addColorStop(0, "transparent"); g.addColorStop(0.5, `rgba(8,3,22,${b.a})`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  const bf = ctx.createLinearGradient(0, h * 0.74, 0, h);
  bf.addColorStop(0, "transparent"); bf.addColorStop(1, "rgba(3,1,10,0.42)");
  ctx.fillStyle = bf; ctx.fillRect(0, 0, w, h);
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.16, w / 2, h / 2, h * 0.9);
  g.addColorStop(0, "transparent"); g.addColorStop(1, "rgba(2,1,8,0.76)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

function drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = "#000";
  const off = (tick * 0.4) % 4;
  for (let y = off; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const playerRef = useRef({ col: 15, row: 8, facing: 1 });
  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  const hoveredRef = useRef<string | null>(null);
  const nearRef = useRef<string | null>(null);
  const hitRef = useRef<{ id: string; cx: number; cy: number; r: number }[]>([]);
  const teleportRef = useRef<{ col: number; row: number } | null>(null);

  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [near, setNear] = useState<string | null>(null);
  const [selected, setSelected] = useState<NodeDef | null>(null);
  const [showJumpMenu, setShowJumpMenu] = useState(false);

  function openNear() {
    const id = nearRef.current;
    if (!id) return;
    const n = NODES.find((x) => x.id === id);
    if (n) setSelected(n);
  }

  function jumpTo(n: NodeDef) {
    teleportRef.current = { col: n.entranceCol, row: n.entranceRow };
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

    let clockStr = new Date().toLocaleTimeString("en-US", { hour12: false });

    const KEY_DIR: Record<string, keyof typeof moveRef.current> = {
      w: "up", W: "up", ArrowUp: "up",
      s: "down", S: "down", ArrowDown: "down",
      a: "left", A: "left", ArrowLeft: "left",
      d: "right", D: "right", ArrowRight: "right",
    };

    function onKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "e" || e.key === "E") { openNear(); return; }
      if (e.key === "Escape") { setSelected(null); return; }
      const dir = KEY_DIR[e.key];
      if (dir) { e.preventDefault(); moveRef.current[dir] = true; }
    }
    function onKeyUp(e: KeyboardEvent) {
      const dir = KEY_DIR[e.key];
      if (dir) moveRef.current[dir] = false;
    }
    function onBlur() {
      moveRef.current.up = moveRef.current.down = moveRef.current.left = moveRef.current.right = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // Collision: sample the avatar footprint (center + cardinal offsets) so it
    // keeps a small radius away from blocked tiles instead of penetrating them.
    const RAD = 0.3;
    function canStand(c: number, r: number) {
      return (
        isWalkable(Math.round(c), Math.round(r)) &&
        isWalkable(Math.round(c - RAD), Math.round(r)) &&
        isWalkable(Math.round(c + RAD), Math.round(r)) &&
        isWalkable(Math.round(c), Math.round(r - RAD)) &&
        isWalkable(Math.round(c), Math.round(r + RAD))
      );
    }

    function drawHUD(w: number, h: number, tick: number) {
      const p = playerRef.current;
      const nearNode = NODES.find((n) => n.id === nearRef.current);
      const region = regionAt(Math.round(p.col), Math.round(p.row));

      // Top-left panel
      ctx.save();
      ctx.fillStyle = "#ffffff05"; ctx.fillRect(20, 78, 244, 92);
      ctx.strokeStyle = "#ffffff0c"; ctx.lineWidth = 0.5; ctx.strokeRect(20, 78, 244, 92);
      const lines = [
        { t: `VANTA CITY  ·  ${region}`, f: "bold 9px monospace", c: "#c084fc", g: "#c084fc" },
        { t: `${NODES_ONLINE} NODES ONLINE  ·  ${BUILDINGS.length} STRUCTURES`, f: "8px monospace", c: "#2a2a42", g: "" },
        { t: nearNode ? `> ${nearNode.name}` : "WALK TO A NODE TO ENTER", f: "8px monospace", c: nearNode ? PALETTES[nearNode.palette].neon : "#2a2a42", g: nearNode ? PALETTES[nearNode.palette].neon : "" },
        { t: nearNode ? nearNode.subtitle.toUpperCase() : "", f: "7px monospace", c: "#1e1e38", g: "" },
        { t: "WASD / ARROWS MOVE  ·  E ENTER", f: "7px monospace", c: "#1e1e38", g: "" },
      ];
      lines.forEach(({ t, f, c, g }, i) => {
        if (!t) return;
        ctx.font = f; ctx.fillStyle = c;
        ctx.shadowColor = g || "transparent"; ctx.shadowBlur = g ? 6 : 0;
        ctx.fillText(t, 28, 94 + i * 15);
      });
      ctx.shadowBlur = 0; ctx.font = "7px monospace"; ctx.fillStyle = "#18182e";
      ctx.fillText(`POS  ${p.col.toFixed(1)}, ${p.row.toFixed(1)}`, 28, 164);
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
      const status = nearNode
        ? `NODE: ${nearNode.name}  ·  ${nearNode.subtitle.toUpperCase()}  ·  PRESS E`
        : `VANTA CITY  ·  ${region}  ·  ${BUILDINGS.length} STRUCTURES  ·  ${NODES_ONLINE} ONLINE`;
      ctx.fillText(status, 16, h - 10);
      ctx.fillText(`SYS ${clockStr}`, w - 90, h - 10);
      ctx.restore();
    }

    function draw(now: number) {
      tickRef.current++;
      const tick = tickRef.current;
      if (tick % 30 === 0) clockStr = new Date().toLocaleTimeString("en-US", { hour12: false });
      if (!lastRef.current) lastRef.current = now;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;

      const w = canvas!.width, h = canvas!.height;
      const p = playerRef.current;
      const m = moveRef.current;

      // Teleport (fast travel)
      if (teleportRef.current) {
        p.col = teleportRef.current.col;
        p.row = teleportRef.current.row;
        teleportRef.current = null;
      }

      // Movement: screen-space input → tile delta
      const ix = (m.right ? 1 : 0) - (m.left ? 1 : 0);
      const iy = (m.down ? 1 : 0) - (m.up ? 1 : 0);
      if (ix !== 0 || iy !== 0) {
        let dcol = ix + iy;
        let drow = iy - ix;
        const mag = Math.hypot(dcol, drow) || 1;
        dcol = (dcol / mag) * PLAYER_SPEED * dt;
        drow = (drow / mag) * PLAYER_SPEED * dt;
        const nc = p.col + dcol, nr = p.row + drow;
        if (canStand(nc, nr)) { p.col = nc; p.row = nr; }
        else if (canStand(nc, p.row)) { p.col = nc; }
        else if (canStand(p.col, nr)) { p.row = nr; }
        if (ix !== 0) p.facing = ix > 0 ? 1 : -1;
      }

      // Camera origin → keep player anchored (near street-level)
      const ox = w / 2 - (p.col - p.row) * HW;
      const oy = h * CAM_ANCHOR_Y - (p.col + p.row) * HH;

      // Nearest interactive entrance
      let bestId: string | null = null, bestD = ENTER_DIST;
      for (const n of NODES) {
        const d = Math.hypot(n.entranceCol - p.col, n.entranceRow - p.row);
        if (d < bestD) { bestD = d; bestId = n.id; }
      }
      if (nearRef.current !== bestId) { nearRef.current = bestId; setNear(bestId); }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#04040b"; ctx.fillRect(0, 0, w, h);

      // Ground (culled)
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const sx = (c - r) * HW + ox, sy = (c + r) * HH + oy;
          if (sx < -HW - 20 || sx > w + HW + 20 || sy < -TH - 20 || sy > h + TH + 20) continue;
          drawGround(ctx, c, r, ox, oy);
        }
      }
      for (const cp of CHECKPOINTS) {
        const sx = (cp.col - cp.row) * HW + ox, sy = (cp.col + cp.row) * HH + oy;
        if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
        drawCheckpoint(ctx, cp.col, cp.row, ox, oy);
      }

      // Buildings + lamps + player (painter-sorted, culled)
      hitRef.current = [];
      const pSort = p.col + p.row;
      let playerDrawn = false;
      for (const item of RENDER_LIST) {
        if (!playerDrawn && item.sort > pSort) {
          drawPlayer(ctx, p.col, p.row, ox, oy, tick, p.facing);
          playerDrawn = true;
        }
        const sx = (item.col - item.row) * HW + ox, sy = (item.col + item.row) * HH + oy;
        // Generous bottom margin: tall foreground towers with bases below the
        // viewport still extend upward into view, so don't cull them too early.
        if (sx < -HW - 60 || sx > w + HW + 60 || sy < -300 || sy > h + 320) continue;
        if (item.kind === "lamp") {
          drawLamp(ctx, item.col, item.row, ox, oy, tick);
        } else if (item.building) {
          const b = item.building;
          const isHov = b.interactive && hoveredRef.current === b.node!.id;
          const isNear = Math.abs(b.col - p.col) + Math.abs(b.row - p.row) < 9;
          drawBuilding(ctx, b, ox, oy, isHov, isNear, tick);
          if (b.interactive) {
            hitRef.current.push({ id: b.node!.id, cx: sx, cy: sy - b.height * WU * 0.55, r: 34 });
          }
        }
      }
      if (!playerDrawn) drawPlayer(ctx, p.col, p.row, ox, oy, tick, p.facing);

      drawFog(ctx, w, h, tick);
      drawVignette(ctx, w, h);
      drawScanlines(ctx, w, h, tick);
      drawHUD(w, h, tick);

      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found: string | null = null;
    for (const hh of hitRef.current) {
      if (Math.hypot(mx - hh.cx, my - hh.cy) < hh.r) { found = hh.id; break; }
    }
    hoveredRef.current = found;
    if (found !== hovered) setHovered(found);
    canvasRef.current!.style.cursor = found ? "pointer" : "default";
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const hh of hitRef.current) {
      if (Math.hypot(mx - hh.cx, my - hh.cy) < hh.r) {
        const n = NODES.find((x) => x.id === hh.id);
        if (n) setSelected(n);
        return;
      }
    }
  }

  const setMove = (dir: keyof typeof moveRef.current, v: boolean) => { moveRef.current[dir] = v; };
  const nearNode = NODES.find((n) => n.id === near);

  return (
    <div className="fixed inset-0 bg-[#04040b] overflow-hidden">
      <Header />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        data-testid="canvas-world"
      />

      {/* Fast travel menu */}
      <div className="fixed z-20" style={{ top: 82, right: 20 }}>
        <button
          onClick={() => setShowJumpMenu((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/10 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors rounded-sm backdrop-blur-sm"
          data-testid="button-jump-menu"
        >
          <Compass className="w-3 h-3" /> FAST TRAVEL
        </button>
        {showJumpMenu && (
          <div className="absolute top-full right-0 mt-1 bg-black/92 border border-white/10 rounded-sm backdrop-blur-sm min-w-[180px] overflow-hidden">
            {FAST_TRAVEL.map((n) => (
              <button
                key={n.id}
                onClick={() => jumpTo(n)}
                className="w-full text-left px-4 py-2.5 text-[10px] font-mono text-muted-foreground hover:text-purple-400 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 tracking-widest"
                data-testid={`button-jump-${n.id}`}
              >
                {n.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile / on-screen d-pad (hidden on desktop, which uses WASD/arrows) */}
      <div className="fixed bottom-6 left-6 z-20 select-none md:hidden" style={{ touchAction: "none" }}>
        <div className="grid grid-cols-3 gap-1.5" style={{ width: 150 }}>
          <span />
          <DPadBtn dir="up" testid="dpad-up" onPress={setMove}><ChevronUp className="w-5 h-5" /></DPadBtn>
          <span />
          <DPadBtn dir="left" testid="dpad-left" onPress={setMove}><ChevronLeft className="w-5 h-5" /></DPadBtn>
          <span />
          <DPadBtn dir="right" testid="dpad-right" onPress={setMove}><ChevronRight className="w-5 h-5" /></DPadBtn>
          <span />
          <DPadBtn dir="down" testid="dpad-down" onPress={setMove}><ChevronDown className="w-5 h-5" /></DPadBtn>
          <span />
        </div>
      </div>

      {/* Proximity prompt — doubles as the mobile "enter" action */}
      {nearNode && !selected && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-20" data-testid="prompt-enter">
          <button
            onClick={openNear}
            className="flex items-center gap-3 px-6 py-3 bg-black/80 border rounded-sm backdrop-blur-sm hover-elevate active-elevate-2"
            style={{ borderColor: PALETTES[nearNode.palette].neon + "55" }}
            data-testid="button-enter-prompt"
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded-sm border font-mono text-xs font-bold"
              style={{ borderColor: PALETTES[nearNode.palette].neon + "88", color: PALETTES[nearNode.palette].neon }}
            >
              E
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-foreground">
              Enter {nearNode.name}
            </span>
            <ChevronsRight className="w-4 h-4" style={{ color: PALETTES[nearNode.palette].neon }} />
          </button>
        </div>
      )}

      {/* Hover tooltip (desktop) */}
      {hovered && !nearNode && !selected && (() => {
        const b = NODES.find((n) => n.id === hovered);
        if (!b) return null;
        return (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none" data-testid="tooltip-building">
            <div className="bg-black/80 border border-white/10 backdrop-blur-sm px-6 py-3 rounded-sm text-center">
              <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: PALETTES[b.palette].neon }}>{b.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{b.subtitle}</p>
            </div>
          </div>
        );
      })()}

      {/* Node modal */}
      {selected && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div
            className="relative z-10 max-w-md w-full bg-[#06060f] border border-white/10 rounded-sm p-8"
            onClick={(e) => e.stopPropagation()}
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
              {selected.comingSoon ? (
                <Badge variant="secondary" className="font-mono text-xs gap-1.5" data-testid="badge-coming-soon">
                  <AlertTriangle className="w-3 h-3" /> SECTOR UNAVAILABLE
                </Badge>
              ) : (
                <Button
                  onClick={() => { const href = selected.href; setSelected(null); if (href) navigate(href); }}
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

// ─── On-screen d-pad button ───────────────────────────────────────────────────
function DPadBtn({
  dir, testid, onPress, children,
}: {
  dir: "up" | "down" | "left" | "right";
  testid: string;
  onPress: (dir: "up" | "down" | "left" | "right", v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(dir, true); }}
      onPointerUp={(e) => { e.preventDefault(); onPress(dir, false); }}
      onPointerLeave={() => onPress(dir, false)}
      onPointerCancel={() => onPress(dir, false)}
      className="flex items-center justify-center w-11 h-11 bg-black/55 border border-white/10 rounded-sm text-muted-foreground backdrop-blur-sm hover-elevate active-elevate-2"
      data-testid={`button-${testid}`}
      aria-label={dir}
    >
      {children}
    </button>
  );
}
