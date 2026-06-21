import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { X, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Isometric constants ─────────────────────────────────────────────────────
const TW = 56, TH = 28, HW = TW / 2, HH = TH / 2, WU = 12;

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
  palette: PaletteKey; comingSoon?: boolean;
}
interface DecoDef { col: number; row: number; height: number; palette: PaletteKey; }

// ─── Interactive nodes — col-row values must all be unique ───────────────────
// 1, 6, 11, -3, 2, 5, 8, 3  → all distinct
const BUILDINGS: BuildingDef[] = [
  {
    id: "black-index", name: "BLACK INDEX", subtitle: "Search Protocol",
    col: 1, row: 0, height: 8, palette: "violet",
    lore: "The encrypted archive engine of Vanta City. Every transmission is indexed, cross-referenced, and retrievable. Nothing in the district stays hidden from the Index — the city's memory made searchable.",
    href: "/search",
  },
  {
    id: "transmissions", name: "TRANSMISSIONS", subtitle: "Signal Tower",
    col: 6, row: 0, height: 7, palette: "slate",
    lore: "The primary broadcast node. Raw signal originating from the label's core. Every thought, document, and transmission routes through this tower before entering the wider network.",
    href: "/",
  },
  {
    id: "music-hub", name: "MUSIC HUB", subtitle: "Audio Node",
    col: 11, row: 0, height: 7, palette: "blue",
    lore: "Where the sound gets made. The Music Hub houses every release, every session, and every transmission that carries audio. The heartbeat of the city, measured in BPM.",
    href: "/releases",
  },
  {
    id: "vault-gate", name: "VAULT GATE", subtitle: "Restricted Access",
    col: 1, row: 4, height: 9, palette: "red",
    lore: "The armored entrance to the deep archive. Behind these doors — classified material, unreleased work, and the earliest documents of the operation. Access requires authentication.",
    href: "/vault",
  },
  {
    id: "mission-handler", name: "MISSION HANDLER", subtitle: "Command Node",
    col: 5, row: 3, height: 5, palette: "green",
    lore: "The checkpoint where objectives get assigned and tracked. Requests, directives, and operations all flow through here. The militant administration of the district.",
    href: "/enter",
  },
  {
    id: "worlds-archive", name: "WORLDS ARCHIVE", subtitle: "Universe Registry",
    col: 8, row: 3, height: 6, palette: "violet",
    lore: "The registry of all Vanta worlds. Every project, mythology, and creative territory is catalogued here. The map of the empire — past, present, and incoming.",
    href: "/worlds",
  },
  {
    id: "vanta-os-core", name: "VANTA OS CORE", subtitle: "System Heart",
    col: 12, row: 4, height: 11, palette: "core",
    lore: "The central intelligence of Vanta City. The OS Core runs everything — authentication, signal routing, access control. The tallest building in the district for a reason.",
    href: "/enter",
  },
  {
    id: "vanta-box", name: "VANTA BOX", subtitle: "Sector Unknown",
    col: 10, row: 7, height: 3, palette: "dark", comingSoon: true,
    lore: "A structure whose purpose remains classified. Signals go in. Nothing comes back. The district's open secret — everyone sees it, no one talks about it.",
    href: null,
  },
];

// ─── Decorative city fill ─────────────────────────────────────────────────────
const DECO: DecoDef[] = [
  // NW block (cols 0-3, rows 0-1)
  { col:0, row:0, height:6, palette:"crimson" }, { col:2, row:0, height:4, palette:"noir" },
  { col:3, row:0, height:5, palette:"dark" },    { col:0, row:1, height:3, palette:"plague" },
  { col:2, row:1, height:5, palette:"noir" },    { col:3, row:1, height:2, palette:"crimson" },
  // NC block (cols 5-8, rows 0-1)
  { col:5, row:0, height:5, palette:"violet" },  { col:7, row:0, height:4, palette:"noir" },
  { col:8, row:0, height:3, palette:"blue" },    { col:5, row:1, height:3, palette:"dark" },
  { col:7, row:1, height:4, palette:"slate" },   { col:8, row:1, height:2, palette:"crimson" },
  // NE block (cols 10-13, rows 0-1)
  { col:10, row:0, height:5, palette:"blue" },   { col:12, row:0, height:4, palette:"noir" },
  { col:13, row:0, height:6, palette:"dark" },   { col:10, row:1, height:2, palette:"plague" },
  { col:12, row:1, height:3, palette:"blue" },   { col:13, row:1, height:4, palette:"slate" },
  // SW block (cols 0-3, rows 3-5)
  { col:0, row:3, height:5, palette:"crimson" }, { col:2, row:3, height:3, palette:"dark" },
  { col:3, row:3, height:4, palette:"noir" },    { col:0, row:4, height:7, palette:"noir" },
  { col:2, row:4, height:4, palette:"violet" },  { col:3, row:4, height:2, palette:"dark" },
  { col:0, row:5, height:4, palette:"crimson" }, { col:2, row:5, height:3, palette:"plague" },
  { col:3, row:5, height:5, palette:"noir" },
  // Center block (cols 5-8, rows 3-5)
  { col:6, row:3, height:4, palette:"violet" },  { col:7, row:3, height:3, palette:"noir" },
  { col:5, row:4, height:3, palette:"slate" },   { col:6, row:4, height:3, palette:"dark" },
  { col:7, row:4, height:4, palette:"crimson" }, { col:5, row:5, height:4, palette:"noir" },
  { col:6, row:5, height:3, palette:"violet" },  { col:7, row:5, height:5, palette:"blue" },
  { col:8, row:4, height:3, palette:"crimson" }, { col:8, row:5, height:2, palette:"dark" },
  // SE block (cols 10-13, rows 3-5)
  { col:10, row:3, height:5, palette:"blue" },   { col:11, row:3, height:3, palette:"dark" },
  { col:13, row:3, height:6, palette:"noir" },   { col:10, row:4, height:3, palette:"crimson" },
  { col:11, row:4, height:4, palette:"slate" },  { col:13, row:4, height:2, palette:"plague" },
  { col:10, row:5, height:4, palette:"violet" }, { col:11, row:5, height:5, palette:"blue" },
  { col:13, row:5, height:3, palette:"crimson" },
  // Far south (rows 7-8)
  { col:0, row:7, height:3, palette:"dark" },    { col:1, row:7, height:4, palette:"noir" },
  { col:2, row:7, height:2, palette:"crimson" }, { col:3, row:7, height:3, palette:"slate" },
  { col:5, row:7, height:4, palette:"violet" },  { col:6, row:7, height:3, palette:"blue" },
  { col:7, row:7, height:5, palette:"noir" },    { col:8, row:7, height:2, palette:"dark" },
  { col:11, row:7, height:3, palette:"crimson" },{ col:12, row:7, height:4, palette:"blue" },
  { col:13, row:7, height:3, palette:"noir" },
  { col:0, row:8, height:2, palette:"plague" },  { col:2, row:8, height:3, palette:"dark" },
  { col:3, row:8, height:2, palette:"slate" },   { col:5, row:8, height:3, palette:"violet" },
  { col:6, row:8, height:2, palette:"noir" },    { col:7, row:8, height:4, palette:"crimson" },
  { col:8, row:8, height:3, palette:"blue" },    { col:11, row:8, height:2, palette:"dark" },
  { col:12, row:8, height:3, palette:"slate" },  { col:13, row:8, height:2, palette:"crimson" },
];

// ─── Streets ─────────────────────────────────────────────────────────────────
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
    href: null, comingSoon: false, interactive: false as const,
  })),
].sort((a, b) => (a.col + a.row) - (b.col + b.row));

// ─── Isometric helpers ────────────────────────────────────────────────────────
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
  ctx.strokeStyle = street ? "#13132a" : "#0d0d18";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // Lane dash on horizontal streets
  if (STREET_ROWS.has(row) && !STREET_COLS.has(col)) {
    ctx.beginPath();
    ctx.moveTo(x - HW * 0.35, y + HH); ctx.lineTo(x + HW * 0.35, y + HH);
    ctx.strokeStyle = "#1c1c3830"; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D, col: number, row: number,
  height: number, palette: PaletteKey,
  ox: number, oy: number, isHov: boolean, tick: number, sign?: string,
) {
  const { x, y } = isoXY(col, row, ox, oy);
  const p = PALETTES[palette];
  const wh = height * WU;
  const pulse = Math.sin(tick * 0.05 + col * 0.7 + row * 0.4) * 0.15 + 0.85;

  if (isHov) { ctx.save(); ctx.shadowColor = p.neon; ctx.shadowBlur = 28; }

  // Left face
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.lineTo(x - HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = p.left; ctx.fill();
  if (isHov) { ctx.strokeStyle = p.neon + "55"; ctx.lineWidth = 0.5; ctx.stroke(); }

  // Right face
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x + HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = p.right; ctx.fill();
  if (isHov) { ctx.strokeStyle = p.neon + "40"; ctx.lineWidth = 0.5; ctx.stroke(); }

  // Windows — left face
  const winRows = Math.max(1, height - 1);
  for (let wr = 0; wr < winRows; wr++) {
    for (let wc = 0; wc < 2; wc++) {
      if (Math.sin(tick * 0.018 + col * 1.5 + row * 0.9 + wr * 2.3 + wc * 1.8) < 0.2) continue;
      const wx = x - HW * (0.25 + wc * 0.35), wy = y - wh + wr * WU + WU * 0.35;
      ctx.save();
      ctx.globalAlpha = isHov ? 0.85 : 0.5;
      ctx.fillStyle = p.neon; ctx.shadowColor = p.neon; ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(wx, wy - 2.5); ctx.lineTo(wx - 3.5, wy);
      ctx.lineTo(wx, wy + 2.5); ctx.lineTo(wx + 3.5, wy);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  // Windows — right face
  for (let wr = 0; wr < winRows; wr++) {
    if (Math.sin(tick * 0.022 + col * 1.1 + row * 1.6 + wr * 1.9) < 0.3) continue;
    const wx = x + HW * 0.38, wy = y - wh + wr * WU + WU * 0.35;
    ctx.save();
    ctx.globalAlpha = isHov ? 0.55 : 0.3;
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
  ctx.closePath();
  ctx.fillStyle = p.top; ctx.fill();

  // Gothic peaked roof for taller interactive buildings
  if (height >= 6 && sign) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - HW, y + HH - wh);
    ctx.lineTo(x, y - wh - height * 1.6);
    ctx.lineTo(x + HW, y + HH - wh);
    ctx.fillStyle = p.top + "90"; ctx.fill();
    ctx.strokeStyle = p.neon + "28"; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  }

  // Neon roof edges + floating sign for interactive buildings
  if (sign) {
    ctx.save();
    ctx.shadowColor = p.neon; ctx.shadowBlur = 14 * pulse;
    ctx.strokeStyle = p.neon + "cc"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh); ctx.stroke();
    ctx.restore();
    // Floating neon text
    const sy = y - wh - (height >= 6 ? 22 : 14);
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 7px monospace";
    ctx.globalAlpha = 0.65 + pulse * 0.35;
    for (let g = 3; g >= 0; g--) {
      ctx.shadowColor = p.neon; ctx.shadowBlur = g * 8 + 3;
      ctx.fillStyle = g === 0 ? "#ffffff" : p.neon;
      ctx.fillText(sign, x, sy);
    }
    ctx.restore();
  }

  // Antenna for tall buildings
  if (height >= 8) {
    ctx.save();
    ctx.strokeStyle = isHov ? p.neon : p.accent + "55";
    ctx.lineWidth = 1; ctx.shadowColor = p.neon; ctx.shadowBlur = isHov ? 10 : 3;
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x, y - wh - 16); ctx.stroke();
    if (Math.floor(tick / 25) % 2 === 0) {
      ctx.beginPath(); ctx.arc(x, y - wh - 16, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.neon; ctx.shadowBlur = 10; ctx.fill();
    }
    ctx.restore();
  }

  if (isHov) ctx.restore();

  // Bottom label for interactive buildings
  if (sign) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = '8px "Space Grotesk", monospace';
    ctx.fillStyle = isHov ? p.neon : "#33334a";
    if (isHov) { ctx.shadowColor = p.neon; ctx.shadowBlur = 8; }
    ctx.fillText(sign, x, y + HH + 14);
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
    { y: h * 0.18, a: 0.09, span: 100 },
    { y: h * 0.48, a: 0.06, span: 140 },
    { y: h * 0.72, a: 0.12, span: 80 },
  ];
  for (const b of bands) {
    const drift = Math.sin(tick * 0.002 + b.y * 0.01) * 18;
    const g = ctx.createLinearGradient(0, b.y - b.span / 2 + drift, 0, b.y + b.span / 2 + drift);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, `rgba(8,3,22,${b.a})`);
    g.addColorStop(1, "transparent");
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
  const tickRef = useRef(0);
  const animRef = useRef<number>(0);
  const hoveredRef = useRef<string | null>(null);
  const hitRef = useRef<{ id: string; cx: number; cy: number; r: number }[]>([]);
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<BuildingDef | null>(null);

  const calcOrigin = useCallback((w: number, h: number) => ({
    x: w / 2 - 112,
    y: h / 2 - 100,
  }), []);

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

    function drawHUD(w: number, h: number, tick: number) {
      const hovB = BUILDINGS.find(b => b.id === hoveredRef.current);
      ctx.save();
      ctx.fillStyle = "#ffffff05"; ctx.fillRect(20, 78, 230, 72);
      ctx.strokeStyle = "#ffffff0c"; ctx.lineWidth = 0.5; ctx.strokeRect(20, 78, 230, 72);

      const rows = [
        { text: "VANTA OS / DISTRICT 01", font: "bold 9px monospace", color: "#c084fc", glow: "#c084fc" },
        { text: `${BUILDINGS.length} NODES  ·  ${ALL_BUILDINGS.length} STRUCTURES`, font: "8px monospace", color: "#2d2d45", glow: "" },
        { text: hovB ? `> ${hovB.name}` : "HOVER TO IDENTIFY NODE", font: "8px monospace", color: hovB ? PALETTES[hovB.palette].neon : "#2d2d45", glow: hovB ? PALETTES[hovB.palette].neon : "" },
        { text: hovB ? hovB.subtitle.toUpperCase() : "", font: "7px monospace", color: "#22223a", glow: "" },
      ];
      rows.forEach(({ text, font, color, glow }, i) => {
        if (!text) return;
        ctx.font = font; ctx.fillStyle = color;
        ctx.shadowColor = glow || "transparent"; ctx.shadowBlur = glow ? 6 : 0;
        ctx.fillText(text, 28, 94 + i * 16);
      });

      if (Math.floor(tick / 32) % 2 === 0) {
        ctx.fillStyle = "#c084fc22"; ctx.fillRect(20, 150, 230, 1);
      }

      // Status bar
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff04"; ctx.fillRect(0, h - 30, w, 30);
      ctx.strokeStyle = "#ffffff0a"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, h - 30); ctx.lineTo(w, h - 30); ctx.stroke();
      ctx.font = "8px monospace"; ctx.fillStyle = "#2a2a40";
      const status = hovB
        ? `NODE: ${hovB.name}  ·  ${hovB.subtitle.toUpperCase()}  ·  CLICK TO ENTER`
        : `VANTA CITY / DISTRICT 01  ·  ${ALL_BUILDINGS.length} STRUCTURES ACTIVE  ·  CLICK A NODE TO ENTER`;
      ctx.fillText(status, 16, h - 10);
      ctx.fillText(`SYS ${new Date().toLocaleTimeString("en-US", { hour12: false })}`, w - 90, h - 10);
      ctx.restore();
    }

    function draw() {
      tickRef.current++;
      const tick = tickRef.current;
      const w = canvas!.width, h = canvas!.height;
      const { x: ox, y: oy } = calcOrigin(w, h);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#04040b"; ctx.fillRect(0, 0, w, h);

      for (const tile of ALL_TILES) drawTile(ctx, tile.col, tile.row, ox, oy);

      hitRef.current = [];
      for (const b of ALL_BUILDINGS) {
        const isHov = b.interactive && hoveredRef.current === b.id;
        drawBuilding(ctx, b.col, b.row, b.height, b.palette, ox, oy, isHov, tick,
          b.interactive ? b.name : undefined);
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
    };
  }, [calcOrigin]);

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
    hoveredRef.current = null;
    setHovered(null);
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

      {/* Hover tooltip */}
      {hoveredBuilding && !selected && (
        <div
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          data-testid="tooltip-building"
        >
          <div className="bg-black/80 border border-white/10 backdrop-blur-sm px-6 py-3 rounded-sm text-center">
            <p className="text-xs uppercase tracking-widest font-mono mb-0.5"
              style={{ color: PALETTES[hoveredBuilding.palette].neon }}>
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
                <p className="text-xs uppercase tracking-widest font-mono mb-2"
                  style={{ color: PALETTES[selected.palette].neon }}>
                  {selected.subtitle}
                </p>
                <h2 className="text-2xl font-display font-bold text-foreground">{selected.name}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground transition-colors mt-1"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1" style={{ background: PALETTES[selected.palette].neon + "30" }} />
              <span className="text-xs font-mono text-muted-foreground tracking-widest">NODE BRIEFING</span>
              <div className="h-px flex-1" style={{ background: PALETTES[selected.palette].neon + "30" }} />
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed mb-8 font-mono">{selected.lore}</p>

            <div className="flex gap-3">
              {selected.comingSoon ? (
                <Badge variant="secondary" className="font-mono text-xs" data-testid="badge-coming-soon">
                  <AlertTriangle className="w-3 h-3 mr-1.5" /> SECTOR UNAVAILABLE
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
              <Button
                variant="ghost"
                onClick={() => setSelected(null)}
                className="font-mono text-xs"
                data-testid="button-dismiss-modal"
              >
                DISMISS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
