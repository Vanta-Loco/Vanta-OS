import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import {
  X, ChevronRight, AlertTriangle, Compass,
  ChevronUp, ChevronDown, ChevronLeft, ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Isometric constants ──────────────────────────────────────────────────────
const TW = 56, TH = 28, HW = TW / 2, HH = TH / 2, WU = 15;
const COLS = 48, ROWS = 32;
const PLAYER_SPEED = 4.8;        // tiles / second
const ENTER_DIST = 1.7;          // tile distance to a node entrance to allow entry
const CAM_ANCHOR_Y = 0.6;        // fraction of height the avatar sits at (near street-level)
const SIGN_NEAR = 13;            // Manhattan tile distance to light up minor signs
const WIN_NEAR = 9;              // Manhattan tile distance to draw lit windows

// ─── Building palettes (purple / black / crimson / deep-blue family) ───────────
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

// ─── Neon sign colors ─────────────────────────────────────────────────────────
const SIGNS = {
  purple: "#c084fc", magenta: "#e879f9", crimson: "#f87171", red: "#ef4444",
  blue: "#60a5fa", cyan: "#22d3ee", amber: "#fbbf24", pink: "#fb7185",
  green: "#a3e635", white: "#e5e7eb",
} as const;
type SignKey = keyof typeof SIGNS;

// ─── Types ────────────────────────────────────────────────────────────────────
type DrawKind =
  | "tower" | "lowrise" | "rowhouse" | "compound" | "hotel" | "lounge"
  | "shop" | "warehouse" | "garage" | "civic" | "club"
  | "billboard" | "radiotower" | "gas" | "tunnel" | "openlot";

interface NodeDef {
  id: string; name: string; subtitle: string; lore: string; region: string;
  href: string | null; col: number; row: number;
  entranceCol: number; entranceRow: number;
  height: number; palette: PaletteKey; comingSoon?: boolean;
}
interface Building {
  col: number; row: number; height: number; palette: PaletteKey;
  kind: DrawKind; label?: string; sign?: SignKey; category?: string;
  interactive: boolean; hoverable: boolean; node?: NodeDef; seed: number;
}
interface Feature { col: number; row: number; kind: "truck" | "stall" | "bridge"; label?: string; sign?: SignKey; }
interface RenderItem {
  kind: "building" | "lamp" | "feature"; col: number; row: number; sort: number;
  building?: Building; feature?: Feature;
}

// ─── Interactive nodes — the 12 Vanta landmarks (routes preserved, spread out) ──
const NODES: NodeDef[] = [
  { id: "transmissions", name: "TRANSMISSIONS", subtitle: "Signal Tower", region: "SIGNAL HEIGHTS",
    col: 7, row: 2, entranceCol: 7, entranceRow: 3, height: 13, palette: "slate", href: "/",
    lore: "The primary broadcast node. Raw signal originating from the label's core. Every thought routes through this tower." },
  { id: "black-index", name: "BLACK INDEX", subtitle: "Search Protocol", region: "INDEX QUARTER",
    col: 22, row: 2, entranceCol: 22, entranceRow: 3, height: 10, palette: "violet", href: "/search",
    lore: "The archive of forbidden transmissions. Every signal leaves a trace." },
  { id: "music-hub", name: "MUSIC HUB", subtitle: "Audio Node", region: "ARCHIVE WARD",
    col: 38, row: 2, entranceCol: 38, entranceRow: 3, height: 10, palette: "blue", href: "/releases",
    lore: "The sound engine of Vanta Cold. Releases, previews, and sonic artifacts. The heartbeat of the city, measured in BPM." },
  { id: "worlds-archive", name: "WORLDS ARCHIVE", subtitle: "Universe Registry", region: "INDEX QUARTER",
    col: 28, row: 7, entranceCol: 28, entranceRow: 8, height: 8, palette: "violet", href: "/worlds",
    lore: "The map of connected universes. Every project, mythology, and territory catalogued here." },
  { id: "vault-gate", name: "VAULT GATE", subtitle: "Restricted Access", region: "VAULT PRECINCT",
    col: 4, row: 16, entranceCol: 3, entranceRow: 16, height: 11, palette: "red", href: "/vault",
    lore: "Restricted archive. Code-gated access only. The city's deepest secrets sit behind this door." },
  { id: "mission-handler", name: "MISSION HANDLER", subtitle: "Command Node", region: "THE CORE",
    col: 19, row: 12, entranceCol: 19, entranceRow: 13, height: 7, palette: "green", href: "/enter",
    lore: "The command layer. Assignments, access, and OS directives begin here." },
  { id: "vanta-os-core", name: "VANTA OS CORE", subtitle: "System Heart", region: "THE CORE",
    col: 25, row: 16, entranceCol: 25, entranceRow: 15, height: 17, palette: "core", href: "/enter",
    lore: "The central system node. All roads in Vanta City eventually route back to the core." },
  { id: "wireline-terminal", name: "WIRELINE TERMINAL", subtitle: "Dispatch Relay", region: "WIRELINE YARDS",
    col: 38, row: 12, entranceCol: 38, entranceRow: 13, height: 6, palette: "noir", href: "/wireline",
    lore: "A hardwired access point. Monitor public channels, announcements, and mission relays." },
  { id: "vanta-box", name: "VANTA BOX", subtitle: "Sector Unknown", region: "DEAD SECTOR",
    col: 40, row: 16, entranceCol: 39, entranceRow: 16, height: 4, palette: "dark", comingSoon: true, href: null,
    lore: "A structure whose purpose remains classified. Signals go in. Nothing comes back." },
  { id: "hidden-himalayas", name: "HIDDEN HIMALAYAS", subtitle: "Cold Expansion", region: "HIMALAYA GATE",
    col: 46, row: 14, entranceCol: 45, entranceRow: 14, height: 8, palette: "blue", href: "/himalayas",
    lore: "A spiritual zone buried in the snow at the city's edge. The Equinox Eye shrine waits beneath the mountain." },
  { id: "fract-terminal", name: "FRACT TERMINAL", subtitle: "Reputation Economy", region: "FRACT EXCHANGE",
    col: 4, row: 26, entranceCol: 4, entranceRow: 25, height: 5, palette: "plague", href: "/fract",
    lore: "Terminal node for the FRACT network — the reputation layer of the system. Earned, never bought." },
  { id: "fractured-godhead", name: "FRACTURED GODHEAD", subtitle: "Lore Archive", region: "NEON MILE",
    col: 22, row: 26, entranceCol: 22, entranceRow: 25, height: 9, palette: "crimson", href: "/fgh",
    lore: "The mythology archive — characters, factions, locations, and artifacts of the universe." },
];

// ─── Street / alley / plaza / lot grid ────────────────────────────────────────
const isStreet = (c: number, r: number) => c % 6 === 3 || r % 5 === 3;
const isAlley = (c: number, r: number) => c % 6 === 0 || r % 5 === 0;
const inGrid = (c: number, r: number) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

const PLAZAS = [
  { c0: 22, c1: 27, r0: 13, r1: 15, center: [24, 14] as [number, number] }, // Core plaza
  { c0: 16, c1: 18, r0: 5, r1: 6, center: [17, 5] as [number, number] },     // Transit plaza
  { c0: 20, c1: 24, r0: 22, r1: 24, center: [22, 23] as [number, number] },  // Neon plaza
];
const isPlaza = (c: number, r: number) =>
  PLAZAS.some((p) => c >= p.c0 && c <= p.c1 && r >= p.r0 && r <= p.r1);
const plazaCenter = (c: number, r: number) =>
  PLAZAS.some((p) => p.center[0] === c && p.center[1] === r);

const LOTS = new Set([
  "5,1", "11,7", "31,2", "13,11", "44,12", "8,21", "35,21", "29,29", "11,17",
]);
const isLot = (c: number, r: number) => LOTS.has(`${c},${r}`);
const isWalkable = (c: number, r: number) =>
  inGrid(c, r) && (isStreet(c, r) || isAlley(c, r) || isPlaza(c, r) || isLot(c, r));

// ─── Deterministic city generation ────────────────────────────────────────────
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Building type catalogue ──────────────────────────────────────────────────
interface BType {
  cat: string; kind: DrawKind; hMin: number; hMax: number;
  names: string[]; sign: SignKey; signFreq: number;
}
const TYPES: Record<string, BType> = {
  // Residential
  apt_tower: { cat: "Residential", kind: "tower", hMin: 7, hMax: 12, sign: "purple", signFreq: 0.5,
    names: ["VANTA HEIGHTS", "OBSIDIAN TOWER", "CROWN BLOCK", "ASH SPIRE", "NULL HEIGHTS", "GRID TOWER", "BLACKSTONE"] },
  lowrise: { cat: "Residential", kind: "lowrise", hMin: 3, hMax: 5, sign: "purple", signFreq: 0.22,
    names: ["BLOCK 7", "UNIT D", "ROW 12", "THE STACKS", "FLATS", "TENEMENT 9", "BLOCK C"] },
  rowhouse: { cat: "Residential", kind: "rowhouse", hMin: 2, hMax: 3, sign: "purple", signFreq: 0.04, names: [] },
  penthouse: { cat: "Residential", kind: "tower", hMin: 11, hMax: 15, sign: "magenta", signFreq: 0.7,
    names: ["THE PENTHOUSE", "SKY SUITE", "APEX", "HALO DECK"] },
  // Hospitality
  hotel: { cat: "Hospitality", kind: "hotel", hMin: 6, hMax: 9, sign: "pink", signFreq: 0.85,
    names: ["HOTEL NOIR", "THE MERIDIAN", "HOTEL 88", "VELVET INN", "THE OBSIDIAN"] },
  motel: { cat: "Hospitality", kind: "lowrise", hMin: 2, hMax: 3, sign: "amber", signFreq: 0.85,
    names: ["ROADSIDE MOTEL", "MOTEL 6IX", "NIGHTOWL MOTEL", "REST STOP"] },
  lounge: { cat: "Hospitality", kind: "lounge", hMin: 4, hMax: 6, sign: "cyan", signFreq: 0.8,
    names: ["ROOFTOP LOUNGE", "SKY BAR", "ALTITUDE", "THE TERRACE"] },
  // Food & drink
  noodle: { cat: "Food & Drink", kind: "shop", hMin: 1, hMax: 2, sign: "crimson", signFreq: 0.9,
    names: ["NOODLE BAR", "RAMEN 24", "WOK HOUSE", "SLURP"] },
  diner: { cat: "Food & Drink", kind: "shop", hMin: 1, hMax: 2, sign: "amber", signFreq: 0.9,
    names: ["NITE DINER", "CHROME DINER", "EATS", "THE COUNTER"] },
  coffee: { cat: "Food & Drink", kind: "shop", hMin: 1, hMax: 2, sign: "amber", signFreq: 0.85,
    names: ["COFFEE", "ESPRESSO BAR", "BREW", "CAFFEINE"] },
  pizza: { cat: "Food & Drink", kind: "shop", hMin: 1, hMax: 2, sign: "crimson", signFreq: 0.9,
    names: ["PIZZA", "SLICE", "CRUST", "NEON PIZZA"] },
  corner: { cat: "Food & Drink", kind: "shop", hMin: 1, hMax: 3, sign: "blue", signFreq: 0.8,
    names: ["CORNER STORE", "BODEGA", "24HR MART", "KWIK STOP"] },
  takeaway: { cat: "Food & Drink", kind: "shop", hMin: 1, hMax: 2, sign: "amber", signFreq: 0.9,
    names: ["LATE NIGHT", "TAKEAWAY", "FRIED", "NIGHT BITE"] },
  // Business
  office: { cat: "Business", kind: "tower", hMin: 6, hMax: 11, sign: "blue", signFreq: 0.45,
    names: ["VANTA CORP", "MERIDIAN LTD", "DATA WORKS", "HOLDINGS", "BLACK LEDGER", "OFFICE TOWER"] },
  warehouse: { cat: "Business", kind: "warehouse", hMin: 2, hMax: 3, sign: "blue", signFreq: 0.4,
    names: ["WAREHOUSE 12", "DEPOT", "STORAGE", "FREIGHT", "DRY DOCK", "UNIT 9"] },
  studio: { cat: "Business", kind: "lowrise", hMin: 3, hMax: 4, sign: "magenta", signFreq: 0.8,
    names: ["RECORDING STUDIO", "STUDIO B", "WAX ROOM", "CUTROOM"] },
  pawn: { cat: "Business", kind: "shop", hMin: 2, hMax: 3, sign: "amber", signFreq: 0.9,
    names: ["PAWN", "CASH 4 GOLD", "HOCK SHOP", "LOANS"] },
  clothing: { cat: "Business", kind: "shop", hMin: 2, hMax: 3, sign: "magenta", signFreq: 0.85,
    names: ["VANTA WEAR", "STREETWEAR", "THREADS", "FIT CHECK", "DRIP"] },
  netcafe: { cat: "Business", kind: "shop", hMin: 2, hMax: 3, sign: "cyan", signFreq: 0.85,
    names: ["INTERNET CAFE", "NET CAFE", "CYBER LOUNGE", "LAN HOUSE"] },
  tattoo: { cat: "Business", kind: "shop", hMin: 2, hMax: 3, sign: "crimson", signFreq: 0.9,
    names: ["TATTOO", "INK", "NEEDLE & SIN", "BLACKWORK"] },
  barber: { cat: "Business", kind: "shop", hMin: 1, hMax: 2, sign: "blue", signFreq: 0.85,
    names: ["BARBER", "FADE CO", "CUTS", "THE CHAIR"] },
  // Infrastructure / entertainment fillers
  garage: { cat: "Infrastructure", kind: "garage", hMin: 3, hMax: 5, sign: "blue", signFreq: 0.4,
    names: ["PARKING", "GARAGE P3", "STACK PARK"] },
  club: { cat: "Entertainment", kind: "club", hMin: 3, hMax: 5, sign: "magenta", signFreq: 0.95,
    names: ["PULSE", "AFTERLIFE", "BASEMENT", "VOID CLUB", "RED ROOM", "NOCTURNE"] },
  arcade: { cat: "Entertainment", kind: "shop", hMin: 2, hMax: 3, sign: "cyan", signFreq: 0.95,
    names: ["ARCADE", "PLAY", "TOKENS", "8-BIT"] },
};

// ─── Neighborhoods (explicit bounds + weighted type tables) ────────────────────
interface Hood {
  name: string; kind: string; c0: number; c1: number; r0: number; r1: number;
  pals: PaletteKey[]; weights: [string, number][]; hBias: number;
}
const HOODS: Hood[] = [
  { name: "SIGNAL HEIGHTS", kind: "rich", c0: 0, c1: 15, r0: 0, r1: 9,
    pals: ["violet", "slate", "blue", "dark"], hBias: 0.6,
    weights: [["office", 5], ["apt_tower", 4], ["penthouse", 2], ["studio", 2], ["hotel", 2], ["lounge", 1], ["coffee", 1], ["clothing", 1]] },
  { name: "INDEX QUARTER", kind: "civic", c0: 16, c1: 31, r0: 0, r1: 9,
    pals: ["slate", "violet", "blue", "dark"], hBias: 0.35,
    weights: [["office", 4], ["netcafe", 2], ["clothing", 2], ["coffee", 2], ["corner", 2], ["lowrise", 2], ["pizza", 1], ["barber", 1]] },
  { name: "ARCHIVE WARD", kind: "commercial", c0: 32, c1: 47, r0: 0, r1: 9,
    pals: ["blue", "slate", "violet", "noir"], hBias: 0.3,
    weights: [["clothing", 3], ["coffee", 2], ["corner", 2], ["office", 2], ["netcafe", 2], ["pizza", 2], ["lowrise", 2], ["arcade", 1]] },
  { name: "VAULT PRECINCT", kind: "industrial", c0: 0, c1: 15, r0: 10, r1: 20,
    pals: ["red", "crimson", "noir", "dark"], hBias: 0.1,
    weights: [["warehouse", 5], ["garage", 2], ["pawn", 2], ["corner", 1], ["lowrise", 2], ["office", 1]] },
  { name: "THE CORE", kind: "civic", c0: 16, c1: 31, r0: 10, r1: 20,
    pals: ["core", "violet", "dark", "slate"], hBias: 0.45,
    weights: [["office", 4], ["lowrise", 2], ["coffee", 2], ["clothing", 1], ["corner", 1], ["netcafe", 1]] },
  { name: "WIRELINE YARDS", kind: "industrial", c0: 32, c1: 47, r0: 10, r1: 20,
    pals: ["noir", "dark", "blue", "slate"], hBias: 0.1,
    weights: [["warehouse", 5], ["garage", 2], ["office", 1], ["corner", 1], ["pawn", 1], ["lowrise", 1]] },
  { name: "FRACT EXCHANGE", kind: "streetwear", c0: 0, c1: 15, r0: 21, r1: 31,
    pals: ["violet", "crimson", "noir", "dark"], hBias: 0.15,
    weights: [["pawn", 3], ["tattoo", 2], ["clothing", 3], ["barber", 2], ["diner", 2], ["corner", 2], ["netcafe", 1], ["lowrise", 2], ["noodle", 1]] },
  { name: "NEON MILE", kind: "nightlife", c0: 16, c1: 31, r0: 21, r1: 31,
    pals: ["core", "crimson", "violet", "dark"], hBias: 0.2,
    weights: [["club", 5], ["takeaway", 2], ["noodle", 2], ["pizza", 2], ["hotel", 1], ["lounge", 2], ["arcade", 2], ["diner", 1], ["clothing", 1], ["corner", 1]] },
  { name: "GODHEAD SLUMS", kind: "residential", c0: 32, c1: 47, r0: 21, r1: 31,
    pals: ["noir", "dark", "crimson", "violet"], hBias: 0.05,
    weights: [["rowhouse", 4], ["lowrise", 4], ["motel", 2], ["diner", 2], ["corner", 2], ["noodle", 1], ["pawn", 1]] },
];
const DEFAULT_HOOD = HOODS[4];
function hoodAt(c: number, r: number): Hood {
  for (const h of HOODS) if (c >= h.c0 && c <= h.c1 && r >= h.r0 && r <= h.r1) return h;
  return DEFAULT_HOOD;
}

// ─── Curated special structures (override generation) ──────────────────────────
interface Special {
  col: number; row: number; kind: DrawKind; height: number;
  label?: string; sign: SignKey; palette: PaletteKey; category: string;
}
const SPECIALS: Special[] = [
  { col: 10, row: 2, kind: "hotel", height: 12, label: "VANTA GRAND HOTEL", sign: "amber", palette: "violet", category: "Hospitality" },
  { col: 13, row: 2, kind: "compound", height: 4, label: "THE ESTATE", sign: "crimson", palette: "violet", category: "Residential" },
  { col: 19, row: 24, kind: "hotel", height: 10, label: "NEON LOTUS HOTEL", sign: "pink", palette: "core", category: "Hospitality" },
  { col: 17, row: 4, kind: "civic", height: 3, label: "VANTA CENTRAL", sign: "blue", palette: "slate", category: "Transit" },
  { col: 40, row: 4, kind: "civic", height: 3, label: "BUS TERMINAL", sign: "amber", palette: "noir", category: "Transit" },
  { col: 2, row: 14, kind: "gas", height: 1, label: "FUEL", sign: "blue", palette: "dark", category: "Infrastructure" },
  { col: 44, row: 22, kind: "gas", height: 1, label: "CHARGE", sign: "crimson", palette: "dark", category: "Infrastructure" },
  { col: 14, row: 9, kind: "billboard", height: 0, label: "BABYBOI LOCO", sign: "magenta", palette: "dark", category: "Billboard" },
  { col: 31, row: 21, kind: "billboard", height: 0, label: "COLD WORLD", sign: "crimson", palette: "dark", category: "Billboard" },
  { col: 35, row: 11, kind: "billboard", height: 0, label: "NEW DROP", sign: "blue", palette: "dark", category: "Billboard" },
  { col: 1, row: 7, kind: "radiotower", height: 0, sign: "red", palette: "dark", category: "Infrastructure" },
  { col: 46, row: 9, kind: "radiotower", height: 0, sign: "red", palette: "dark", category: "Infrastructure" },
  { col: 8, row: 16, kind: "garage", height: 4, label: "PARKING P3", sign: "blue", palette: "noir", category: "Infrastructure" },
  { col: 34, row: 17, kind: "garage", height: 4, label: "STACK PARK", sign: "blue", palette: "noir", category: "Infrastructure" },
  { col: 16, row: 12, kind: "civic", height: 3, label: "PRECINCT 9", sign: "crimson", palette: "crimson", category: "Security" },
  { col: 34, row: 19, kind: "civic", height: 3, label: "SECURITY OUTPOST", sign: "crimson", palette: "crimson", category: "Security" },
  { col: 26, row: 22, kind: "club", height: 4, label: "PULSE", sign: "magenta", palette: "core", category: "Entertainment" },
  { col: 28, row: 24, kind: "civic", height: 4, label: "THE ODEON", sign: "amber", palette: "crimson", category: "Cinema" },
  { col: 23, row: 29, kind: "club", height: 6, label: "LIVE MUSIC", sign: "magenta", palette: "violet", category: "Live Venue" },
  { col: 43, row: 29, kind: "openlot", height: 0, label: "COURT", sign: "blue", palette: "noir", category: "Recreation" },
  { col: 37, row: 29, kind: "openlot", height: 0, label: "SKATE PARK", sign: "cyan", palette: "noir", category: "Recreation" },
  { col: 44, row: 19, kind: "tunnel", height: 2, label: "UNDERPASS", sign: "crimson", palette: "dark", category: "Infrastructure" },
  { col: 44, row: 26, kind: "compound", height: 4, label: "WARD GATE", sign: "crimson", palette: "noir", category: "Residential" },
];

const NODE_TILES = new Set(NODES.map((n) => `${n.col},${n.row}`));
const SPECIAL_TILES = new Set(SPECIALS.map((s) => `${s.col},${s.row}`));

function pickWeighted(rng: () => number, weights: [string, number][]) {
  let tot = 0; for (const [, w] of weights) tot += w;
  let x = rng() * tot;
  for (const [id, w] of weights) { if ((x -= w) <= 0) return id; }
  return weights[0][0];
}

const BUILDINGS: Building[] = (() => {
  const out: Building[] = [];
  // Nodes
  for (const n of NODES) {
    out.push({ col: n.col, row: n.row, height: n.height, palette: n.palette, kind: "tower",
      label: n.name, category: "Vanta Landmark", interactive: true, hoverable: true, node: n, seed: n.col * 31 + n.row });
  }
  // Specials
  for (const s of SPECIALS) {
    out.push({ col: s.col, row: s.row, height: s.height, palette: s.palette, kind: s.kind,
      label: s.label, sign: s.sign, category: s.category, interactive: false, hoverable: !!s.label,
      seed: s.col * 17 + s.row * 7 });
  }
  // Procedural fill
  const rng = mulberry32(20260621);
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (isWalkable(c, r) || NODE_TILES.has(`${c},${r}`) || SPECIAL_TILES.has(`${c},${r}`)) continue;
      const hood = hoodAt(c, r);
      const typeId = pickWeighted(rng, hood.weights);
      const t = TYPES[typeId];
      const pal = hood.pals[Math.floor(rng() * hood.pals.length)];
      let h = t.hMin + Math.floor(rng() * (t.hMax - t.hMin + 1));
      if (h > 0 && rng() < hood.hBias) h += 1 + Math.floor(rng() * 2);
      if (h > 0 && rng() < 0.05) h += 2 + Math.floor(rng() * 4); // occasional spire
      const label = t.names.length && rng() < t.signFreq ? t.names[Math.floor(rng() * t.names.length)] : undefined;
      out.push({ col: c, row: r, height: h, palette: pal, kind: t.kind, label,
        sign: t.sign, category: t.cat, interactive: false, hoverable: !!label, seed: c * 73856 + r * 19349 });
    }
  }
  return out;
})();

const FEATURES: Feature[] = [
  { col: 21, row: 23, kind: "truck", label: "NOODLES", sign: "amber" },
  { col: 22, row: 24, kind: "truck", label: "TACOS", sign: "crimson" },
  { col: 16, row: 5, kind: "stall", label: "MARKET", sign: "cyan" },
  { col: 18, row: 6, kind: "stall", sign: "purple" },
  { col: 5, row: 25, kind: "truck", label: "FRIED", sign: "amber" },
  { col: 33, row: 23, kind: "truck", label: "BBQ", sign: "crimson" },
  { col: 45, row: 11, kind: "bridge", label: "BRIDGE", sign: "blue" },
  { col: 45, row: 12, kind: "bridge", sign: "blue" },
];

const LAMPS: { col: number; row: number }[] = (() => {
  const out: { col: number; row: number }[] = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++)
      if (c % 6 === 3 && r % 5 === 3) out.push({ col: c, row: r });
  return out;
})();

const CHECKPOINTS = [
  { col: 21, row: 13 }, { col: 33, row: 13 }, { col: 21, row: 18 },
  { col: 27, row: 18 }, { col: 15, row: 18 }, { col: 39, row: 18 },
];

const RENDER_LIST: RenderItem[] = [
  ...BUILDINGS.map<RenderItem>((b) => ({ kind: "building", col: b.col, row: b.row, sort: b.col + b.row, building: b })),
  ...LAMPS.map<RenderItem>((l) => ({ kind: "lamp", col: l.col, row: l.row, sort: l.col + l.row - 0.05 })),
  ...FEATURES.map<RenderItem>((f) => ({ kind: "feature", col: f.col, row: f.row, sort: f.col + f.row + 0.02, feature: f })),
].sort((a, b) => a.sort - b.sort || a.row - b.row);

const FAST_TRAVEL = [
  "transmissions", "black-index", "music-hub", "vault-gate",
  "vanta-os-core", "wireline-terminal", "fract-terminal", "fractured-godhead", "hidden-himalayas",
].map((id) => NODES.find((n) => n.id === id)!);

const NODES_ONLINE = NODES.filter((n) => !n.comingSoon).length;
const regionAt = (col: number, row: number) => hoodAt(col, row).name;

// ─── Reachability validator (dev sanity check) ────────────────────────────────
(() => {
  const start: [number, number] = [24, 14];
  const seen = new Set<string>();
  const q: [number, number][] = [start];
  seen.add(start.join(","));
  while (q.length) {
    const [c, r] = q.shift()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc, nr = r + dr, k = `${nc},${nr}`;
      if (!seen.has(k) && isWalkable(nc, nr)) { seen.add(k); q.push([nc, nr]); }
    }
  }
  const blocked = NODES.filter((n) => !seen.has(`${n.entranceCol},${n.entranceRow}`)).map((n) => n.id);
  if (blocked.length) console.warn("[world] unreachable node entrances:", blocked);
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isoXY(col: number, row: number, ox: number, oy: number) {
  return { x: (col - row) * HW + ox, y: (col + row) * HH + oy };
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function drawGround(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const street = isStreet(col, row);
  const alley = isAlley(col, row);
  const plaza = isPlaza(col, row);
  const lot = isLot(col, row);
  const intersection = col % 6 === 3 && row % 5 === 3;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + HW, y + HH);
  ctx.lineTo(x, y + TH); ctx.lineTo(x - HW, y + HH);
  ctx.closePath();
  ctx.fillStyle = plaza ? "#100d1e"
    : intersection ? "#0e0e1e"
    : street ? "#0a0a16"
    : lot ? "#0c0a12"
    : alley ? "#08080f"
    : (col + row) % 2 === 0 ? "#07070f" : "#060609";
  ctx.fill();
  ctx.strokeStyle = plaza ? "#1c1838" : street ? "#13132a" : "#0c0c16";
  ctx.lineWidth = 0.5; ctx.stroke();
  // road center dashes
  if (row % 5 === 3 && col % 6 !== 3) {
    ctx.beginPath();
    ctx.moveTo(x - HW * 0.35, y + HH); ctx.lineTo(x + HW * 0.35, y + HH);
    ctx.strokeStyle = "#26264a40"; ctx.lineWidth = 1; ctx.stroke();
  }
  if (col % 6 === 3 && row % 5 !== 3) {
    ctx.beginPath();
    ctx.moveTo(x, y + HH - HH * 0.5); ctx.lineTo(x, y + HH + HH * 0.5);
    ctx.strokeStyle = "#26264a40"; ctx.lineWidth = 1; ctx.stroke();
  }
  if (plaza) {
    ctx.strokeStyle = "#2a2450"; ctx.globalAlpha = 0.25; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 3); ctx.lineTo(x + HW - 3, y + HH);
    ctx.lineTo(x, y + TH - 3); ctx.lineTo(x - HW + 3, y + HH);
    ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
    if (plazaCenter(col, row)) {
      ctx.strokeStyle = "#a855f7"; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(x, y + HH, 13, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  if (lot) {
    ctx.fillStyle = "#1a1622";
    ctx.fillRect(x - 6, y + HH - 1, 3, 2);
    ctx.fillRect(x + 3, y + HH + 3, 4, 2);
  }
}

// ─── Box body (used by most building kinds) ───────────────────────────────────
function drawBox(
  ctx: CanvasRenderingContext2D, x: number, y: number, wh: number, p: typeof PALETTES[PaletteKey],
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  // left
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.lineTo(x - HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = p.left; ctx.fill();
  // right
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x + HW, y + HH); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fillStyle = p.right; ctx.fill();
  // roof
  ctx.beginPath();
  ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh);
  ctx.lineTo(x, y + TH - wh); ctx.lineTo(x - HW, y + HH - wh);
  ctx.closePath(); ctx.fillStyle = p.top; ctx.fill();
}

function drawWindows(
  ctx: CanvasRenderingContext2D, b: Building, x: number, y: number, wh: number,
  p: typeof PALETTES[PaletteKey], tick: number, dim: number,
) {
  const winRows = Math.max(1, b.height - 1);
  for (let wr = 0; wr < winRows; wr++) {
    for (let wc = 0; wc < 2; wc++) {
      if (Math.sin(tick * 0.018 + b.col * 1.5 + b.row * 0.9 + wr * 2.3 + wc * 1.8) < 0.25) continue;
      const wx = x - HW * (0.25 + wc * 0.35), wy = y - wh + wr * WU + WU * 0.4;
      ctx.globalAlpha = (b.interactive ? 0.7 : 0.4) * dim;
      ctx.fillStyle = p.neon;
      ctx.beginPath();
      ctx.moveTo(wx, wy - 2.2); ctx.lineTo(wx - 3, wy);
      ctx.lineTo(wx, wy + 2.2); ctx.lineTo(wx + 3, wy);
      ctx.closePath(); ctx.fill();
    }
  }
}

// ─── Minor neon sign (1-2 glow pass, proximity-gated) ─────────────────────────
function drawMinorSign(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 6px monospace";
  const w = ctx.measureText(text).width + 6;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#05050c"; ctx.fillRect(x - w / 2, y - 5, w, 9);
  ctx.globalAlpha = 1;
  ctx.shadowColor = color; ctx.shadowBlur = 6; ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ─── Building dispatcher ──────────────────────────────────────────────────────
function drawBuilding(
  ctx: CanvasRenderingContext2D, b: Building, ox: number, oy: number,
  hovered: boolean, near: boolean, tick: number,
) {
  const { x, y } = isoXY(b.col, b.row, ox, oy);
  const p = PALETTES[b.palette];
  const sign = b.sign ? SIGNS[b.sign] : p.neon;

  // Flat / special silhouettes
  if (b.kind === "billboard") return drawBillboard(ctx, b, x, y, sign, tick, hovered);
  if (b.kind === "radiotower") return drawRadioTower(ctx, b, x, y, tick, hovered);
  if (b.kind === "gas") return drawGas(ctx, b, x, y, p, sign, near, hovered);
  if (b.kind === "openlot") return drawOpenLot(ctx, b, x, y, sign, near, hovered);
  if (b.kind === "tunnel") return drawTunnel(ctx, b, x, y, p, sign, hovered);

  const wh = b.height * WU;
  const node = b.node;
  const comingSoon = node?.comingSoon;
  const pulse = Math.sin(tick * 0.05 + b.col * 0.7 + b.row * 0.4) * 0.15 + 0.85;

  if (hovered) { ctx.save(); ctx.shadowColor = sign; ctx.shadowBlur = 24; }
  ctx.save();

  drawBox(ctx, x, y, wh, p, comingSoon ? 0.7 : 1);

  // Roof treatments by kind
  if ((b.kind === "tower" || b.kind === "hotel" || b.kind === "civic") && b.height >= 8) {
    ctx.beginPath();
    ctx.moveTo(x - HW, y + HH - wh); ctx.lineTo(x, y - wh - b.height * 1.4);
    ctx.lineTo(x + HW, y + HH - wh);
    ctx.fillStyle = p.top + "90"; ctx.fill();
    ctx.strokeStyle = sign + "26"; ctx.lineWidth = 0.5; ctx.stroke();
  }
  if (b.kind === "warehouse") {
    // roller door on the right face + sawtooth roof hint
    ctx.fillStyle = "#00000055";
    ctx.beginPath();
    ctx.moveTo(x + HW * 0.2, y); ctx.lineTo(x + HW * 0.85, y + HH * 0.65);
    ctx.lineTo(x + HW * 0.85, y + HH * 0.65 - wh * 0.55); ctx.lineTo(x + HW * 0.2, y - wh * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = sign + "30"; ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      ctx.beginPath(); ctx.moveTo(x + HW * 0.2, y - wh * 0.55 * t); ctx.lineTo(x + HW * 0.85, y + HH * 0.65 - wh * 0.55 * t); ctx.stroke();
    }
  }
  if (b.kind === "garage") {
    // open parking decks: dark horizontal slots across both faces
    ctx.fillStyle = "#00000050";
    for (let lvl = 0; lvl < b.height; lvl++) {
      const ly = y - lvl * WU - WU * 0.45;
      ctx.beginPath();
      ctx.moveTo(x - HW, ly + HH - 2); ctx.lineTo(x, ly - 2);
      ctx.lineTo(x, ly + 1); ctx.lineTo(x - HW, ly + HH + 1);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, ly - 2); ctx.lineTo(x + HW, ly + HH - 2);
      ctx.lineTo(x + HW, ly + HH + 1); ctx.lineTo(x, ly + 1);
      ctx.closePath(); ctx.fill();
    }
  }
  if (b.kind === "compound") {
    // perimeter wall suggestion + crenellation
    ctx.strokeStyle = sign + "44"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - HW, y + HH); ctx.lineTo(x, y + TH); ctx.lineTo(x + HW, y + HH); ctx.stroke();
  }

  // Windows (proximity-gated) — skip kinds with their own facade detail
  if ((near || b.interactive) && b.kind !== "warehouse" && b.kind !== "garage") {
    drawWindows(ctx, b, x, y, wh, p, tick, comingSoon ? 0.4 : 1);
    ctx.globalAlpha = 1;
  }

  // Club / venue marquee glow band + ground light pool
  if (b.kind === "club") {
    ctx.save();
    ctx.shadowColor = sign; ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = sign + "cc"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - HW, y + HH - WU * 0.6); ctx.lineTo(x, y - WU * 0.6); ctx.lineTo(x + HW, y + HH - WU * 0.6); ctx.stroke();
    ctx.globalAlpha = 0.08; ctx.fillStyle = sign;
    ctx.beginPath(); ctx.ellipse(x, y + HH + 2, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Node neon roof edges + 4-pass sign + antenna (interactive only)
  if (b.interactive && node) {
    ctx.save();
    ctx.shadowColor = p.neon; ctx.shadowBlur = 13 * pulse * (comingSoon ? 0.35 : 1);
    ctx.globalAlpha = comingSoon ? 0.4 : 1;
    ctx.strokeStyle = p.neon + (comingSoon ? "44" : "cc"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x - HW, y + HH - wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh); ctx.stroke();
    ctx.restore();

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

    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = '8px "Space Grotesk", monospace';
    ctx.fillStyle = hovered ? p.neon : "#3a3a52";
    if (hovered) { ctx.shadowColor = p.neon; ctx.shadowBlur = 8; }
    ctx.fillText(node.name, x, y + HH + 14);
    ctx.restore();
  } else if (b.label && near) {
    // Minor neon sign for normal city buildings
    const sy = y - wh - (b.height >= 6 ? 16 : b.height >= 3 ? 11 : 7);
    drawMinorSign(ctx, b.label, x, sy, sign);
  }

  if (hovered) ctx.restore();
}

// ─── Specialised structures ───────────────────────────────────────────────────
function drawBillboard(ctx: CanvasRenderingContext2D, b: Building, x: number, y: number, color: string, tick: number, hovered: boolean) {
  const ph = 6 * WU, pw = 30;
  ctx.save();
  ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 6, y + HH); ctx.lineTo(x - 6, y + HH - ph); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 6, y + HH); ctx.lineTo(x + 6, y + HH - ph); ctx.stroke();
  const panelY = y + HH - ph - 18;
  const flick = Math.sin(tick * 0.06 + b.col) * 0.12 + 0.88;
  ctx.fillStyle = "#0a0a14"; ctx.fillRect(x - pw / 2, panelY, pw, 22);
  ctx.strokeStyle = color + "aa"; ctx.lineWidth = hovered ? 1.5 : 1;
  ctx.shadowColor = color; ctx.shadowBlur = (hovered ? 16 : 9) * flick;
  ctx.strokeRect(x - pw / 2, panelY, pw, 22);
  if (b.label) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 5px monospace";
    ctx.fillStyle = color; ctx.fillText(b.label, x, panelY + 11);
  }
  ctx.restore();
}

function drawRadioTower(ctx: CanvasRenderingContext2D, b: Building, x: number, y: number, tick: number, hovered: boolean) {
  const th = 11 * WU;
  ctx.save();
  ctx.strokeStyle = hovered ? "#9aa0b5" : "#2a2a3c"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 7, y + HH); ctx.lineTo(x, y + HH - th); ctx.lineTo(x + 7, y + HH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 7, y + HH); ctx.lineTo(x + 7, y + HH); ctx.stroke();
  for (let i = 1; i < 8; i++) {
    const t1 = (i - 1) / 8, t2 = i / 8;
    const lx1 = x - 7 * (1 - t1), lx2 = x + 7 * (1 - t2);
    ctx.beginPath(); ctx.moveTo(lx1, y + HH - th * t1); ctx.lineTo(lx2, y + HH - th * t2); ctx.stroke();
  }
  if (Math.floor(tick / 22) % 2 === 0) {
    ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, y + HH - th, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawGas(ctx: CanvasRenderingContext2D, b: Building, x: number, y: number, p: typeof PALETTES[PaletteKey], color: string, near: boolean, hovered: boolean) {
  ctx.save();
  // forecourt slab
  ctx.fillStyle = "#0c0c16";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + HW, y + HH); ctx.lineTo(x, y + TH); ctx.lineTo(x - HW, y + HH); ctx.closePath(); ctx.fill();
  // canopy posts
  const ch = 3 * WU;
  ctx.strokeStyle = "#23233a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - HW * 0.5, y + HH * 0.5); ctx.lineTo(x - HW * 0.5, y + HH * 0.5 - ch); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + HW * 0.5, y + HH * 0.5); ctx.lineTo(x + HW * 0.5, y + HH * 0.5 - ch); ctx.stroke();
  // canopy roof
  ctx.fillStyle = p.top;
  ctx.beginPath();
  ctx.moveTo(x, y - ch); ctx.lineTo(x + HW, y + HH - ch); ctx.lineTo(x, y + TH - ch); ctx.lineTo(x - HW, y + HH - ch); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color + (hovered ? "cc" : "88"); ctx.lineWidth = 1.5;
  ctx.shadowColor = color; ctx.shadowBlur = hovered ? 14 : 7;
  ctx.beginPath(); ctx.moveTo(x - HW, y + HH - ch); ctx.lineTo(x, y + TH - ch); ctx.lineTo(x + HW, y + HH - ch); ctx.stroke();
  // pump
  ctx.shadowBlur = 0; ctx.fillStyle = "#15151f"; ctx.fillRect(x - 3, y + HH - 9, 6, 9);
  if (b.label && near) drawMinorSign(ctx, b.label, x, y + HH * 0.5 - ch - 6, color);
  ctx.restore();
}

function drawOpenLot(ctx: CanvasRenderingContext2D, b: Building, x: number, y: number, color: string, near: boolean, hovered: boolean) {
  ctx.save();
  // slab
  ctx.fillStyle = "#0b0b15";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + HW, y + HH); ctx.lineTo(x, y + TH); ctx.lineTo(x - HW, y + HH); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color + (hovered ? "88" : "44"); ctx.lineWidth = 1;
  if (b.label === "COURT") {
    // center line + circle
    ctx.beginPath(); ctx.moveTo(x - HW * 0.6, y + HH * 0.4); ctx.lineTo(x + HW * 0.6, y + HH * 1.6 - HH); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y + HH, 8, 4, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    // skate ramps — a couple of angled quads
    ctx.fillStyle = "#15131f";
    ctx.beginPath(); ctx.moveTo(x - HW * 0.5, y + HH * 0.7); ctx.lineTo(x - HW * 0.1, y + HH * 0.4); ctx.lineTo(x - HW * 0.1, y + HH * 0.4 - 8); ctx.lineTo(x - HW * 0.5, y + HH * 0.7 - 8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + HW * 0.5, y + HH * 0.9); ctx.lineTo(x + HW * 0.1, y + HH * 0.6); ctx.lineTo(x + HW * 0.1, y + HH * 0.6 - 7); ctx.lineTo(x + HW * 0.5, y + HH * 0.9 - 7); ctx.closePath(); ctx.fill();
  }
  // corner fence posts
  ctx.fillStyle = color + "66";
  for (const [dx, dy] of [[-HW, HH], [HW, HH], [0, 0], [0, TH]] as const) {
    ctx.fillRect(x + dx - 0.5, y + dy - 5, 1, 5);
  }
  if (b.label && near) drawMinorSign(ctx, b.label, x, y - 6, color);
  ctx.restore();
}

function drawTunnel(ctx: CanvasRenderingContext2D, b: Building, x: number, y: number, p: typeof PALETTES[PaletteKey], color: string, hovered: boolean) {
  const wh = b.height * WU;
  ctx.save();
  drawBox(ctx, x, y, wh, p, 1);
  // arch mouth (dark) on the right face
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(x, y - wh * 0.2); ctx.lineTo(x + HW * 0.8, y + HH * 0.6 - wh * 0.2);
  ctx.lineTo(x + HW * 0.8, y + HH * 0.6); ctx.lineTo(x, y);
  ctx.closePath(); ctx.fill();
  // warning stripes
  ctx.strokeStyle = color + (hovered ? "cc" : "77"); ctx.lineWidth = 1.5;
  ctx.shadowColor = color; ctx.shadowBlur = hovered ? 12 : 5;
  ctx.beginPath(); ctx.moveTo(x, y - wh); ctx.lineTo(x + HW, y + HH - wh); ctx.stroke();
  if (b.label) { ctx.shadowBlur = 0; drawMinorSign(ctx, b.label, x, y - wh - 8, color); }
  ctx.restore();
}

function drawFeature(ctx: CanvasRenderingContext2D, f: Feature, ox: number, oy: number, tick: number, near: boolean) {
  const { x, y } = isoXY(f.col, f.row, ox, oy);
  const color = f.sign ? SIGNS[f.sign] : "#c084fc";
  ctx.save();
  if (f.kind === "bridge") {
    // railing posts + rail along the tile to suggest an overpass
    ctx.strokeStyle = color + "55"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - HW * 0.7, y + HH * 0.2); ctx.lineTo(x + HW * 0.7, y + HH * 1.2); ctx.stroke();
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const px = x - HW * 0.7 + (HW * 1.4) * t, py = y + HH * 0.2 + HH * t;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 5); ctx.stroke();
    }
    if (f.label && near) drawMinorSign(ctx, f.label, x, y - 4, color);
    ctx.restore(); return;
  }
  // food truck / stall: small box + glow + tiny sign
  const bw = f.kind === "truck" ? 11 : 9, bh = 9;
  ctx.fillStyle = "#13111c";
  ctx.fillRect(x - bw / 2, y + HH * 0.2 - bh, bw, bh);
  ctx.fillStyle = color; ctx.globalAlpha = 0.85; ctx.shadowColor = color; ctx.shadowBlur = 6;
  ctx.fillRect(x - bw / 2 + 1, y + HH * 0.2 - bh + 2, bw - 2, 2.4); // serving glow
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  if (f.kind === "stall") { // awning
    ctx.strokeStyle = color + "88"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - bw / 2 - 2, y + HH * 0.2 - bh); ctx.lineTo(x, y + HH * 0.2 - bh - 5); ctx.lineTo(x + bw / 2 + 2, y + HH * 0.2 - bh); ctx.stroke();
  } else { // wheels
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(x - bw / 2 + 2, y + HH * 0.2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + bw / 2 - 2, y + HH * 0.2, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  if (f.label && near) drawMinorSign(ctx, f.label, x, y + HH * 0.2 - bh - 7, color);
  ctx.restore();
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
  ctx.globalAlpha = 0.06 * flick; ctx.fillStyle = "#a855f7";
  ctx.beginPath(); ctx.ellipse(x + 4, y + HH * 0.4, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, col: number, row: number, ox: number, oy: number, tick: number, facing: number) {
  const { x, y } = isoXY(col, row, ox, oy);
  const bob = Math.sin(tick * 0.18) * 1.2;
  ctx.save();
  ctx.globalAlpha = 0.55; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(x, y + HH * 0.25, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  const baseY = y + HH * 0.25 + bob;
  const bh = 22;
  ctx.save();
  ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 16;
  ctx.fillStyle = "#0b0712";
  ctx.beginPath();
  ctx.moveTo(x, baseY - bh); ctx.lineTo(x - 7, baseY); ctx.lineTo(x + 7, baseY);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#15101f";
  ctx.beginPath(); ctx.arc(x, baseY - bh + 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1; ctx.stroke();
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

interface HitEntry { id: string; label: string; sub: string; color: string; interactive: boolean; cx: number; cy: number; r2: number; }

// ─── Component ────────────────────────────────────────────────────────────────
export default function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const playerRef = useRef({ col: 24, row: 14, facing: 1 });
  const moveRef = useRef({ up: false, down: false, left: false, right: false });
  const hoveredRef = useRef<string | null>(null);
  const nearRef = useRef<string | null>(null);
  const hitRef = useRef<HitEntry[]>([]);
  const teleportRef = useRef<{ col: number; row: number } | null>(null);

  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<HitEntry | null>(null);
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

      ctx.save();
      ctx.fillStyle = "#ffffff05"; ctx.fillRect(20, 78, 252, 92);
      ctx.strokeStyle = "#ffffff0c"; ctx.lineWidth = 0.5; ctx.strokeRect(20, 78, 252, 92);
      const lines = [
        { t: `VANTA CITY  ·  ${region}`, f: "bold 9px monospace", c: "#c084fc", g: "#c084fc" },
        { t: `${NODES_ONLINE} NODES  ·  ${BUILDINGS.length} STRUCTURES`, f: "8px monospace", c: "#2a2a42", g: "" },
        { t: nearNode ? `> ${nearNode.name}` : "EXPLORE THE STREETS  ·  E TO ENTER", f: "8px monospace", c: nearNode ? PALETTES[nearNode.palette].neon : "#2a2a42", g: nearNode ? PALETTES[nearNode.palette].neon : "" },
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

      if (teleportRef.current) {
        p.col = teleportRef.current.col;
        p.row = teleportRef.current.row;
        teleportRef.current = null;
      }

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

      const ox = w / 2 - (p.col - p.row) * HW;
      const oy = h * CAM_ANCHOR_Y - (p.col + p.row) * HH;

      let bestId: string | null = null, bestD = ENTER_DIST;
      for (const n of NODES) {
        const d = Math.hypot(n.entranceCol - p.col, n.entranceRow - p.row);
        if (d < bestD) { bestD = d; bestId = n.id; }
      }
      if (nearRef.current !== bestId) { nearRef.current = bestId; setNear(bestId); }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#04040b"; ctx.fillRect(0, 0, w, h);

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

      hitRef.current = [];
      const pSort = p.col + p.row;
      let playerDrawn = false;
      for (const item of RENDER_LIST) {
        if (!playerDrawn && item.sort > pSort) {
          drawPlayer(ctx, p.col, p.row, ox, oy, tick, p.facing);
          playerDrawn = true;
        }
        const sx = (item.col - item.row) * HW + ox, sy = (item.col + item.row) * HH + oy;
        if (sx < -HW - 60 || sx > w + HW + 60 || sy < -300 || sy > h + 320) continue;
        if (item.kind === "lamp") {
          drawLamp(ctx, item.col, item.row, ox, oy, tick);
        } else if (item.kind === "feature" && item.feature) {
          const isNear = Math.abs(item.col - p.col) + Math.abs(item.row - p.row) < SIGN_NEAR;
          drawFeature(ctx, item.feature, ox, oy, tick, isNear);
        } else if (item.building) {
          const b = item.building;
          const isHov = b.hoverable && hoveredRef.current === (b.node ? b.node.id : `b${b.col},${b.row}`);
          const isNearWin = Math.abs(b.col - p.col) + Math.abs(b.row - p.row) < WIN_NEAR;
          const isNearSign = Math.abs(b.col - p.col) + Math.abs(b.row - p.row) < SIGN_NEAR;
          drawBuilding(ctx, b, ox, oy, isHov, b.interactive ? isNearWin : isNearSign, tick);
          // register hover/click targets — only visible labeled buildings
          if (b.hoverable) {
            const scol = b.sign ? SIGNS[b.sign] : PALETTES[b.palette].neon;
            const r = b.interactive ? 34 : 20;
            hitRef.current.push({
              id: b.node ? b.node.id : `b${b.col},${b.row}`,
              label: b.label || "",
              sub: b.interactive ? (b.node?.subtitle || "") : (b.category || ""),
              color: b.interactive ? PALETTES[b.palette].neon : scol,
              interactive: b.interactive,
              cx: sx, cy: sy - b.height * WU * 0.55 - 6, r2: r * r,
            });
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
    let found: HitEntry | null = null;
    for (const hh of hitRef.current) {
      const dx = mx - hh.cx, dy = my - hh.cy;
      if (dx * dx + dy * dy < hh.r2) { found = hh; break; }
    }
    hoveredRef.current = found ? found.id : null;
    if ((found?.id ?? null) !== (hovered?.id ?? null)) setHovered(found);
    canvasRef.current!.style.cursor = found?.interactive ? "pointer" : "default";
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    for (const hh of hitRef.current) {
      const dx = mx - hh.cx, dy = my - hh.cy;
      if (dx * dx + dy * dy < hh.r2 && hh.interactive) {
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
          <div className="absolute top-full right-0 mt-1 bg-black/92 border border-white/10 rounded-sm backdrop-blur-sm min-w-[180px] overflow-hidden max-h-[70vh] overflow-y-auto">
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

      {/* Hover tooltip — works for landmarks and normal city buildings */}
      {hovered && !nearNode && !selected && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none" data-testid="tooltip-building">
          <div className="bg-black/80 border border-white/10 backdrop-blur-sm px-6 py-3 rounded-sm text-center">
            <p className="text-xs uppercase tracking-widest font-mono mb-0.5" style={{ color: hovered.color }}>{hovered.label}</p>
            {hovered.sub && <p className="text-xs text-muted-foreground font-mono">{hovered.sub}</p>}
          </div>
        </div>
      )}

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
