import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Lock,
  Move3d,
  MousePointer2,
} from "lucide-react";

// ─── World constants ──────────────────────────────────────────────────────────
const BOUND = 185;          // player movement clamp (city half-extent)
const PLAYER_SPEED = 30;    // units / second
const CAM_DIST = 9;         // camera distance behind player
const CAM_HEIGHT = 4.5;     // camera height above ground
const ENTER_PAD = 14;       // proximity radius to trigger "Press E"
const PLAYER_RADIUS = 1.4;

// City road / block grid — 9 major roads each axis
const LINES = [-176, -132, -88, -44, 0, 44, 88, 132, 176];
const MIDS  = [-154, -110, -66, -22, 22, 66, 110, 154];
const ROADW = 10;           // road surface width
const SW    = 3.0;          // sidewalk strip width
const BLOCK = 33;           // block size

// Dark building base colors (purple / deep-blue / crimson family)
const DARK = [
  "#160a2b",
  "#0b1330",
  "#240a0a",
  "#10101e",
  "#1a0a2e",
  "#06182e",
  "#1e0a24",
  "#0d0618",
];
// Neon sign colors
const NEON = [
  "#c084fc",
  "#e879f9",
  "#f87171",
  "#60a5fa",
  "#22d3ee",
  "#fbbf24",
  "#fb7185",
  "#a3e635",
];

type Landmark = {
  id: string;
  name: string;
  sub: string;
  desc: string;
  href?: string;
  comingSoon?: boolean;
  pos: [number, number];
  color: string;
  neon: string;
  w: number;
  d: number;
  h: number;
  kind?: "portal";
};

const LANDMARKS: Landmark[] = [
  // Central tower — spawn area
  { id: "vanta-os-core",       name: "VANTA OS CORE",        sub: "SYSTEM HEART",    desc: "The pulsing core of the Vanta network. Jack in to boot the operating system.", href: "/enter",     pos: [0, 0],       color: "#1a0a2e", neon: "#e879f9", w: 18, d: 18, h: 55 },
  // North / South outer ring
  { id: "transmissions-tower", name: "TRANSMISSIONS TOWER",  sub: "BROADCAST SPIRE", desc: "Where every signal is written and sent — the editorial heart of Vanta Cold.",  href: "/",          pos: [0, -154],    color: "#0b1330", neon: "#38bdf8", w: 14, d: 14, h: 66 },
  { id: "vault-gate",          name: "VAULT GATE",           sub: "RESTRICTED",      desc: "A sealed vault. Only those with the code pass through.",                       href: "/vault",      pos: [0, 154],     color: "#260808", neon: "#ef4444", w: 22, d: 18, h: 34 },
  // East outer ring
  { id: "black-index",         name: "BLACK INDEX",          sub: "ARCHIVE SEARCH",  desc: "Query the index. Surface every transmission ever logged.",                     href: "/search",     pos: [154, 44],    color: "#160a2b", neon: "#a855f7", w: 16, d: 16, h: 48 },
  { id: "music-hub",           name: "MUSIC HUB",            sub: "THE LABEL",       desc: "Releases, drops and the full discography of the Vanta sound.",                 href: "/releases",   pos: [132, -88],   color: "#2a0a1e", neon: "#fb7185", w: 17, d: 15, h: 42 },
  { id: "worlds-archive",      name: "WORLDS ARCHIVE",       sub: "THE UNIVERSE",    desc: "The projects and worlds that make up the Vanta universe.",                     href: "/worlds",     pos: [110, 132],   color: "#06202a", neon: "#22d3ee", w: 20, d: 16, h: 38 },
  // West outer ring
  { id: "mission-handler",     name: "MISSION HANDLER",      sub: "OPS COMMAND",     desc: "Assignments dispatched from the militant ops floor.",                          href: "/enter",      pos: [-154, 0],    color: "#231603", neon: "#fbbf24", w: 17, d: 14, h: 36 },
  { id: "wireline-terminal",   name: "WIRELINE TERMINAL",    sub: "DATA UPLINK",     desc: "Hard-line access to the wire. Raw data in, raw data out.",                    href: "/wireline",   pos: [-132, -88],  color: "#0a1330", neon: "#60a5fa", w: 14, d: 14, h: 46 },
  { id: "fractured-godhead",   name: "FRACTURED GODHEAD",    sub: "THE DISTRICT",    desc: "The cult quarter — broken idols and neon scripture.",                          href: "/fgh",        pos: [-132, 110],  color: "#0a1c08", neon: "#a3e635", w: 17, d: 17, h: 50 },
  // South diagonal pair
  { id: "fract-terminal",      name: "FRACT TERMINAL",       sub: "THE EXCHANGE",    desc: "The fractured exchange. Trade in signal and noise.",                           href: "/fract",      pos: [-66, -154],  color: "#1a0a2e", neon: "#e879f9", w: 16, d: 16, h: 42 },
  { id: "hidden-himalayas",    name: "HIDDEN HIMALAYAS",     sub: "THE PORTAL",      desc: "A gateway that should not exist. Step through.",                              href: "/himalayas",  pos: [66, -154],   color: "#06202a", neon: "#a5f3fc", w: 17, d: 17, h: 32, kind: "portal" },
  // Far corner
  { id: "vanta-box",           name: "VANTA BOX",            sub: "SEALED",          desc: "Something is being built here. Not yet.",   comingSoon: true,                 pos: [154, -132],   color: "#10101e", neon: "#64748b", w: 15, d: 15, h: 28 },
];

const LM_BY_ID: Record<string, Landmark> = Object.fromEntries(
  LANDMARKS.map((l) => [l.id, l]),
);

const PLAYER_START: [number, number] = [0, 40];

// ─── Deterministic city generation ─────────────────────────────────────────────
type AABB = { x: number; z: number; hw: number; hd: number };
type InstItem = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rot?: number;
  color?: string;
};
type CityData = {
  buildings: InstItem[];
  smallBuildings: InstItem[];
  signs: InstItem[];
  lights: { x: number; z: number }[];
  aabb: AABB[];
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCity(): CityData {
  const r = mulberry32(7);
  const buildings: InstItem[] = [];
  const smallBuildings: InstItem[] = [];
  const signs: InstItem[] = [];
  const lights: { x: number; z: number }[] = [];
  const aabb: AABB[] = [];

  const zones = LANDMARKS.map((l) => ({
    x: l.pos[0], z: l.pos[1],
    rad: Math.max(l.w, l.d) * 0.5 + 14,
  }));
  const isClear = (cx: number, cz: number) => {
    for (const z of zones)
      if (Math.hypot(cx - z.x, cz - z.z) < z.rad) return false;
    if (Math.hypot(cx - PLAYER_START[0], cz - PLAYER_START[1]) < 14) return false;
    return true;
  };

  const sideOff = (side: number, fw: number, fd: number) =>
    side === 0 ? { x: 0,        z: fd/2+0.1  }
    : side === 1 ? { x: fw/2+0.1, z: 0         }
    : side === 2 ? { x: 0,        z: -fd/2-0.1 }
    :              { x: -fw/2-0.1, z: 0         };

  for (const mx of MIDS)
    for (const mz of MIDS) {
      const dist = Math.hypot(mx, mz);
      // Outer zones subdivide more → smaller lots (residential scale)
      const g = dist > 120 ? (r() < 0.4 ? 3 : 4) : r() < 0.5 ? 2 : 3;
      const lot = BLOCK / g;

      for (let i = 0; i < g; i++)
        for (let j = 0; j < g; j++) {
          const isEdgeLot = i === 0 || i === g-1 || j === 0 || j === g-1;
          // Fewer empty lots on edges → continuous storefronts facing roads
          if (r() < (isEdgeLot ? 0.1 : 0.22)) continue;

          const cx = mx - BLOCK/2 + lot * (i + 0.5);
          const cz = mz - BLOCK/2 + lot * (j + 0.5);
          if (!isClear(cx, cz)) continue;

          if (isEdgeLot) {
            // ── Storefront / corner store / restaurant (low-rise) ──
            const fw = lot * (0.62 + r() * 0.28);
            const fd = lot * (0.42 + r() * 0.25);
            const h  = 3.0 + r() * 6.5; // 3–9.5 units
            const color = DARK[Math.floor(r() * DARK.length)];
            smallBuildings.push({ x: cx, y: h/2, z: cz, sx: fw, sy: h, sz: fd, color });
            aabb.push({ x: cx, z: cz, hw: fw/2+0.1, hd: fd/2+0.1 });
            // Storefronts always have a sign
            const side = Math.floor(r() * 4);
            const off  = sideOff(side, fw, fd);
            const sw   = 1.1 + r() * 2.0;
            signs.push({ x: cx+off.x, y: h*0.72 + r()*1.2, z: cz+off.z,
              sx: sw, sy: sw*0.55, sz: 1, rot: side*(Math.PI/2),
              color: NEON[Math.floor(r() * NEON.length)] });
          } else {
            // ── Tower / apartment / hotel (mid-to-tall) ──
            const fw = lot * (0.52 + r() * 0.32);
            const fd = lot * (0.52 + r() * 0.32);
            let h: number;
            if (dist < 45)       h = 24 + r() * 36; // downtown skyscrapers
            else if (dist < 80)  h = 15 + r() * 24; // mixed-use towers
            else if (dist < 130) h = 8  + r() * 18; // apartment blocks
            else                 h = 4  + r() * 10; // outer residential
            const color = DARK[Math.floor(r() * DARK.length)];
            buildings.push({ x: cx, y: h/2, z: cz, sx: fw, sy: h, sz: fd, color });
            aabb.push({ x: cx, z: cz, hw: fw/2+0.1, hd: fd/2+0.1 });
            // 70 % of towers get 1–2 neon signs
            if (r() < 0.70) {
              const numSigns = r() < 0.28 ? 2 : 1;
              for (let k = 0; k < numSigns; k++) {
                const side = Math.floor(r() * 4);
                const off  = sideOff(side, fw, fd);
                const sw   = 1.5 + r() * 3.4;
                signs.push({ x: cx+off.x, y: 3+r()*Math.min(h-5,18), z: cz+off.z,
                  sx: sw, sy: sw*0.65, sz: 1, rot: side*(Math.PI/2),
                  color: NEON[Math.floor(r() * NEON.length)] });
              }
            }
          }
        }
    }

  for (const l of LANDMARKS)
    aabb.push({ x: l.pos[0], z: l.pos[1], hw: l.w/2, hd: l.d/2 });

  // Street lights — every road/road intersection + mid-block pole each segment
  for (let ii = 0; ii < LINES.length; ii++)
    for (let jj = 0; jj < LINES.length; jj++)
      lights.push({ x: LINES[ii], z: LINES[jj] });
  // Additional mid-block lights alongside roads
  for (const lx of LINES)
    for (const mz of MIDS)
      if ((LINES.indexOf(lx) + MIDS.indexOf(mz)) % 2 === 0)
        lights.push({ x: lx, z: mz });
  for (const mx of MIDS)
    for (const lz of LINES)
      if ((MIDS.indexOf(mx) + LINES.indexOf(lz)) % 2 === 0)
        lights.push({ x: mx, z: lz });

  return { buildings, smallBuildings, signs, lights, aabb };
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function collides(x: number, z: number, aabb: AABB[]) {
  for (let i = 0; i < aabb.length; i++) {
    const a = aabb[i];
    if (
      Math.abs(x - a.x) < a.hw + PLAYER_RADIUS &&
      Math.abs(z - a.z) < a.hd + PLAYER_RADIUS
    )
      return true;
  }
  return false;
}

function applyInstances(
  mesh: THREE.InstancedMesh | null,
  items: InstItem[],
  withColor: boolean,
) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3();
  items.forEach((it, i) => {
    e.set(0, it.rot || 0, 0);
    q.setFromEuler(e);
    v.set(it.x, it.y, it.z);
    s.set(it.sx, it.sy, it.sz);
    m.compose(v, q, s);
    mesh.setMatrixAt(i, m);
    if (withColor && it.color) mesh.setColorAt(i, c.set(it.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (withColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// ─── Scene pieces ───────────────────────────────────────────────────────────────
function Buildings({ items }: { items: InstItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => applyInstances(ref.current, items, true), [items]);
  return (
    <instancedMesh
      ref={ref as any}
      args={[undefined as any, undefined as any, items.length]}
      frustumCulled={false}
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#160830"
        emissiveIntensity={0.35}
        roughness={0.85}
        metalness={0.15}
      />
    </instancedMesh>
  );
}

function Signs({ items }: { items: InstItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => applyInstances(ref.current, items, true), [items]);
  return (
    <instancedMesh
      ref={ref as any}
      args={[undefined as any, undefined as any, Math.max(1, items.length)]}
      frustumCulled={false}
    >
      <planeGeometry />
      <meshBasicMaterial
        color="#ffffff"
        toneMapped={false}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function SmallBuildings({ items }: { items: InstItem[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => applyInstances(ref.current, items, true), [items]);
  return (
    <instancedMesh
      ref={ref as any}
      args={[undefined as any, undefined as any, Math.max(1, items.length)]}
      frustumCulled={false}
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#0c0618"
        emissiveIntensity={0.25}
        roughness={0.92}
        metalness={0.06}
      />
    </instancedMesh>
  );
}

function StreetLights({ items }: { items: { x: number; z: number }[] }) {
  const poles = useRef<THREE.InstancedMesh>(null);
  const lamps = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    applyInstances(
      poles.current,
      items.map((p) => ({ x: p.x, y: 4.5, z: p.z, sx: 1, sy: 1, sz: 1 })),
      false,
    );
    applyInstances(
      lamps.current,
      items.map((p) => ({ x: p.x, y: 9, z: p.z, sx: 1, sy: 1, sz: 1 })),
      false,
    );
  }, [items]);
  return (
    <>
      <instancedMesh
        ref={poles as any}
        args={[undefined as any, undefined as any, items.length]}
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.22, 0.22, 9, 6]} />
        <meshStandardMaterial color="#0c0c16" roughness={0.6} metalness={0.5} />
      </instancedMesh>
      <instancedMesh
        ref={lamps as any}
        args={[undefined as any, undefined as any, items.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.6, 10, 10]} />
        <meshBasicMaterial color="#ffcf8f" toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function Roads() {
  const span = BOUND * 2.8;
  const swOff = ROADW / 2 + SW / 2;   // sidewalk centre offset from road centre
  const curbOff = ROADW / 2 + SW + 0.15;
  return (
    <group>
      {/* ── Horizontal roads ── */}
      {LINES.map((v, i) => (
        <group key={`hr${i}`}>
          {/* road tarmac */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.03, v]}>
            <planeGeometry args={[span, ROADW]} />
            <meshStandardMaterial color="#090610" roughness={0.96} metalness={0.04} />
          </mesh>
          {/* centre glow stripe */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.058, v]}>
            <planeGeometry args={[span, 0.28]} />
            <meshBasicMaterial color="#7c3aed" toneMapped={false} transparent opacity={0.38} />
          </mesh>
          {/* sidewalks — raised concrete strips */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.13, v - swOff]}>
            <planeGeometry args={[span, SW]} />
            <meshStandardMaterial color="#0e0c1b" roughness={1} metalness={0} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.13, v + swOff]}>
            <planeGeometry args={[span, SW]} />
            <meshStandardMaterial color="#0e0c1b" roughness={1} metalness={0} />
          </mesh>
          {/* curb lips */}
          <mesh position={[0, 0.095, v - curbOff]}>
            <boxGeometry args={[span, 0.19, 0.3]} />
            <meshStandardMaterial color="#1a1530" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.095, v + curbOff]}>
            <boxGeometry args={[span, 0.19, 0.3]} />
            <meshStandardMaterial color="#1a1530" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* ── Vertical roads ── */}
      {LINES.map((v, i) => (
        <group key={`vr${i}`}>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[v, 0.03, 0]}>
            <planeGeometry args={[ROADW, span]} />
            <meshStandardMaterial color="#090610" roughness={0.96} metalness={0.04} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[v, 0.058, 0]}>
            <planeGeometry args={[0.28, span]} />
            <meshBasicMaterial color="#7c3aed" toneMapped={false} transparent opacity={0.38} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[v - swOff, 0.13, 0]}>
            <planeGeometry args={[SW, span]} />
            <meshStandardMaterial color="#0e0c1b" roughness={1} metalness={0} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[v + swOff, 0.13, 0]}>
            <planeGeometry args={[SW, span]} />
            <meshStandardMaterial color="#0e0c1b" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[v - curbOff, 0.095, 0]}>
            <boxGeometry args={[0.3, 0.19, span]} />
            <meshStandardMaterial color="#1a1530" roughness={0.9} />
          </mesh>
          <mesh position={[v + curbOff, 0.095, 0]}>
            <boxGeometry args={[0.3, 0.19, span]} />
            <meshStandardMaterial color="#1a1530" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#050309" roughness={1} metalness={0} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[10, 10]}
        cellSize={4}
        cellThickness={0.5}
        cellColor="#1b0b30"
        sectionSize={44}
        sectionThickness={1.1}
        sectionColor="#6d28d9"
        fadeDistance={180}
        fadeStrength={2}
        infiniteGrid
      />
    </group>
  );
}

const BILLBOARDS: { x: number; z: number; rot: number; c: string }[] = [
  // Downtown core
  { x: 20,   z: 20,   rot: Math.PI * 0.75, c: "#e879f9" },
  { x: -30,  z: -12,  rot: 0.4,            c: "#f87171" },
  { x: 58,   z: 12,   rot: -0.6,           c: "#22d3ee" },
  { x: -18,  z: 56,   rot: Math.PI,        c: "#fbbf24" },
  { x: 32,   z: -42,  rot: 2.2,            c: "#c084fc" },
  // Mid-city
  { x: 95,   z: -30,  rot: 1.1,            c: "#fb7185" },
  { x: -95,  z: 30,   rot: -0.8,           c: "#fbbf24" },
  { x: 30,   z: 95,   rot: 0.3,            c: "#a5f3fc" },
  { x: -55,  z: -90,  rot: Math.PI * 0.5,  c: "#a3e635" },
  { x: 80,   z: 80,   rot: -1.4,           c: "#38bdf8" },
  { x: -80,  z: -50,  rot: 2.8,            c: "#e879f9" },
  // Outer ring
  { x: 130,  z: 0,    rot: Math.PI * 0.5,  c: "#a855f7" },
  { x: -130, z: -20,  rot: 0.9,            c: "#60a5fa" },
  { x: 0,    z: -130, rot: 0,              c: "#38bdf8" },
  { x: -110, z: 110,  rot: 1.7,            c: "#a3e635" },
  { x: 110,  z: -110, rot: -0.5,           c: "#fb7185" },
];

function Billboards() {
  return (
    <>
      {BILLBOARDS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
          <mesh position={[0, 8, 0]}>
            <boxGeometry args={[0.6, 16, 0.6]} />
            <meshStandardMaterial color="#0c0c16" roughness={0.7} metalness={0.4} />
          </mesh>
          <mesh position={[0, 13, 0.3]}>
            <boxGeometry args={[12.6, 6.6, 0.3]} />
            <meshStandardMaterial color="#0a0610" roughness={0.9} />
          </mesh>
          <mesh position={[0, 13, 0.5]}>
            <planeGeometry args={[12, 6]} />
            <meshBasicMaterial
              color={b.c}
              toneMapped={false}
              transparent
              opacity={0.85}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

const CHECKPOINTS: { x: number; z: number; rot: number }[] = [
  { x: 0, z: 22, rot: 0 },
  { x: 22, z: 0, rot: Math.PI / 2 },
  { x: -44, z: 0, rot: Math.PI / 2 },
];

function Checkpoints() {
  return (
    <>
      {CHECKPOINTS.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[0, c.rot, 0]}>
          {[-5, 5].map((sx) => (
            <mesh key={sx} position={[sx, 3, 0]}>
              <boxGeometry args={[1.2, 6, 1.2]} />
              <meshStandardMaterial color="#16071f" emissive="#dc2626" emissiveIntensity={0.3} roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 6.2, 0]}>
            <boxGeometry args={[11.5, 0.7, 0.7]} />
            <meshBasicMaterial color="#f87171" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function LandmarkMesh({ lm }: { lm: Landmark }) {
  const beacon = useRef<THREE.Mesh>(null);
  const phase = lm.pos[0] * 0.13 + lm.pos[1] * 0.07;
  useFrame(({ clock }) => {
    if (beacon.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2 + phase) * 0.18;
      beacon.current.scale.setScalar(s);
    }
  });
  const [x, z] = lm.pos;
  const ringR = Math.max(lm.w, lm.d) * 0.5;

  if (lm.kind === "portal") {
    return (
      <group position={[x, 0, z]}>
        <mesh position={[0, 9, 0]}>
          <torusGeometry args={[7, 0.7, 14, 40]} />
          <meshBasicMaterial color={lm.neon} toneMapped={false} />
        </mesh>
        <mesh position={[0, 9, 0]}>
          <circleGeometry args={[6.4, 40]} />
          <meshBasicMaterial
            color={lm.neon}
            toneMapped={false}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
          <ringGeometry args={[ringR + 1.5, ringR + 2.6, 48]} />
          <meshBasicMaterial color={lm.neon} toneMapped={false} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, lm.h / 2, 0]}>
        <boxGeometry args={[lm.w, lm.h, lm.d]} />
        <meshStandardMaterial
          color={lm.color}
          emissive={lm.neon}
          emissiveIntensity={lm.comingSoon ? 0.08 : 0.28}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>
      {/* vertical neon edge strips */}
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([ex, ez], i) => (
        <mesh key={i} position={[ex * lm.w * 0.5, lm.h / 2, ez * lm.d * 0.5]}>
          <boxGeometry args={[0.4, lm.h, 0.4]} />
          <meshBasicMaterial color={lm.neon} toneMapped={false} transparent opacity={lm.comingSoon ? 0.35 : 1} />
        </mesh>
      ))}
      {/* glowing crown */}
      <mesh position={[0, lm.h + 1.5, 0]}>
        <boxGeometry args={[lm.w * 0.5, 3, lm.d * 0.5]} />
        <meshBasicMaterial color={lm.neon} toneMapped={false} transparent opacity={lm.comingSoon ? 0.3 : 0.9} />
      </mesh>
      {/* ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[ringR + 1.5, ringR + 2.6, 48]} />
        <meshBasicMaterial color={lm.neon} toneMapped={false} transparent opacity={lm.comingSoon ? 0.25 : 0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* beacon */}
      {!lm.comingSoon && (
        <mesh ref={beacon as any} position={[0, lm.h + 4.5, 0]}>
          <sphereGeometry args={[1.1, 14, 14]} />
          <meshBasicMaterial color={lm.neon} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── Player + camera rig ────────────────────────────────────────────────────────
function PlayerRig({
  aabb,
  paused,
  onNear,
  onEnter,
}: {
  aabb: AABB[];
  paused: boolean;
  onNear: (id: string | null) => void;
  onEnter: (id: string) => void;
}) {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(PLAYER_START[0], 0, PLAYER_START[1]));
  const yaw = useRef(0); // camera azimuth
  const faceYaw = useRef(Math.PI);
  const keysRef = useRef<Set<string>>(new Set());
  const nearId = useRef<string | null>(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const tmp = useRef({
    f: new THREE.Vector3(),
    r: new THREE.Vector3(),
    move: new THREE.Vector3(),
    cam: new THREE.Vector3(),
  });

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.getAttribute("contenteditable") === "true"
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping()) return;
      keysRef.current.add(event.key.toLowerCase());
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(
          event.key.toLowerCase()
        )
      ) {
        event.preventDefault();
      }
      if (event.key.toLowerCase() === "e" && nearId.current && !pausedRef.current)
        onEnter(nearId.current);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onEnter]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      yaw.current -= dx * 0.005;
    };
    const up = () => {
      dragging.current = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const keys = keysRef.current;
    const p = pos.current;
    const th = yaw.current;
    const t = tmp.current;

    t.f.set(-Math.sin(th), 0, -Math.cos(th)); // forward (away from camera)
    t.r.set(Math.cos(th), 0, -Math.sin(th)); // right

    let iz = 0;
    let ix = 0;
    if (!pausedRef.current) {
      if (keys.has("w") || keys.has("arrowup"))    iz += 1;
      if (keys.has("s") || keys.has("arrowdown"))  iz -= 1;
      if (keys.has("d") || keys.has("arrowright")) ix += 1;
      if (keys.has("a") || keys.has("arrowleft"))  ix -= 1;
    }

    const move = t.move.set(0, 0, 0);
    move.addScaledVector(t.f, iz).addScaledVector(t.r, ix);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(PLAYER_SPEED * dt);
      const nx = p.x + move.x;
      if (!collides(nx, p.z, aabb)) p.x = nx;
      const nz = p.z + move.z;
      if (!collides(p.x, nz, aabb)) p.z = nz;
      p.x = clamp(p.x, -BOUND, BOUND);
      p.z = clamp(p.z, -BOUND, BOUND);
      faceYaw.current = Math.atan2(move.x, move.z);
    }

    if (group.current) {
      group.current.position.set(p.x, 0, p.z);
      group.current.rotation.y = faceYaw.current;
    }

    const cam = t.cam.set(
      p.x + Math.sin(th) * CAM_DIST,
      CAM_HEIGHT,
      p.z + Math.cos(th) * CAM_DIST,
    );
    const lerp = 1 - Math.pow(0.001, dt);
    camera.position.lerp(cam, lerp);
    camera.lookAt(p.x, 1.8, p.z);

    let best: string | null = null;
    let bestD = Infinity;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(p.x - lm.pos[0], p.z - lm.pos[1]);
      const rad = Math.max(lm.w, lm.d) * 0.5 + ENTER_PAD;
      if (d < rad && d < bestD) {
        bestD = d;
        best = lm.id;
      }
    }
    if (best !== nearId.current) {
      nearId.current = best;
      onNear(best);
    }
  });

  return (
    <group ref={group as any}>
      {/* base glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[0.9, 1.5, 28]} />
        <meshBasicMaterial color="#c084fc" toneMapped={false} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* body */}
      <mesh position={[0, 1.6, 0]}>
        <capsuleGeometry args={[0.6, 1.6, 6, 12]} />
        <meshStandardMaterial color="#1a0d2e" emissive="#7c3aed" emissiveIntensity={0.55} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* head */}
      <mesh position={[0, 3.0, 0]}>
        <sphereGeometry args={[0.45, 14, 14]} />
        <meshStandardMaterial color="#0d0618" emissive="#a855f7" emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
      {/* visor / facing indicator */}
      <mesh position={[0, 3.0, 0.42]}>
        <boxGeometry args={[0.5, 0.14, 0.12]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
      <pointLight color="#c084fc" intensity={26} distance={32} decay={1.7} position={[0, 5, 0]} />
    </group>
  );
}

function Scene({
  city,
  paused,
  onNear,
  onEnter,
}: {
  city: CityData;
  paused: boolean;
  onNear: (id: string | null) => void;
  onEnter: (id: string) => void;
}) {
  return (
    <>
      <color attach="background" args={["#05030c"]} />
      <fog attach="fog" args={["#05030c", 18, 240]} />
      <ambientLight intensity={0.55} color="#b7a6e6" />
      <hemisphereLight args={["#3a1d6e", "#05030a", 0.45]} />
      <directionalLight position={[40, 80, 20]} intensity={1.2} color="#9d7bff" />
      <Suspense fallback={null}>
        <Ground />
        <Roads />
        <Buildings items={city.buildings} />
        <SmallBuildings items={city.smallBuildings} />
        <Signs items={city.signs} />
        <StreetLights items={city.lights} />
        <Billboards />
        <Checkpoints />
        {LANDMARKS.map((lm) => (
          <LandmarkMesh key={lm.id} lm={lm} />
        ))}
        <PlayerRig aabb={city.aabb} paused={paused} onNear={onNear} onEnter={onEnter} />
      </Suspense>
    </>
  );
}

// ─── Mobile movement pad ────────────────────────────────────────────────────────
function pressKey(key: string, down: boolean) {
  window.dispatchEvent(
    new KeyboardEvent(down ? "keydown" : "keyup", { key }),
  );
}

function DPadButton({
  k,
  label,
  testid,
  children,
}: {
  k: string;
  label: string;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <button
      data-testid={testid}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        pressKey(k, true);
      }}
      onPointerUp={() => pressKey(k, false)}
      onPointerLeave={() => pressKey(k, false)}
      onPointerCancel={() => pressKey(k, false)}
      className="flex h-12 w-12 items-center justify-center rounded-md border border-purple-500/40 bg-black/60 text-purple-200 backdrop-blur-sm active:bg-purple-500/30"
    >
      {children}
    </button>
  );
}

function MobileControls() {
  return (
    <div className="absolute bottom-6 left-4 z-40 md:hidden" style={{ touchAction: "none" }}>
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
        <div />
        <DPadButton k="w" label="Move forward" testid="button-move-up">
          <ChevronUp className="h-6 w-6" />
        </DPadButton>
        <div />
        <DPadButton k="a" label="Move left" testid="button-move-left">
          <ChevronLeft className="h-6 w-6" />
        </DPadButton>
        <div />
        <DPadButton k="d" label="Move right" testid="button-move-right">
          <ChevronRight className="h-6 w-6" />
        </DPadButton>
        <div />
        <DPadButton k="s" label="Move back" testid="button-move-down">
          <ChevronDown className="h-6 w-6" />
        </DPadButton>
        <div />
      </div>
    </div>
  );
}

// ─── Error boundary + fallback ────────────────────────────────────────────────────
class GLBoundary extends Component<
  { fallback: (error: string) => ReactNode; children: ReactNode; onError: (msg: string) => void },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message ?? String(e) };
  }
  componentDidCatch(error: Error) {
    console.error("[Vanta City] R3F render error:", error.message);
    console.error(error.stack);
    this.props.onError(error.message ?? String(error));
  }
  render() {
    return this.state.error
      ? this.props.fallback(this.state.error)
      : this.props.children;
  }
}

function WebGLFallback({ error }: { error?: string | null }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05030c] gap-4 p-8">
      <div className="text-xs uppercase tracking-[0.3em] text-purple-500/60">
        Vanta City
      </div>
      {error && (
        <div className="rounded border border-red-800/50 bg-red-950/40 px-4 py-2 font-mono text-[11px] text-red-400 max-w-md text-center break-all">
          {error}
        </div>
      )}
      <div className="text-sm text-zinc-500 max-w-xs text-center">
        {error
          ? "The 3D renderer failed. Check the browser console for details."
          : "WebGL is unavailable in this environment."}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function World() {
  const [, navigate] = useLocation();
  const [glLost, setGlLost] = useState(false);
  const [glError, setGlError] = useState<string | null>(null);
  const city = useMemo(() => buildCity(), []);
  const [nearId, setNearId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Landmark | null>(null);

  // Canvas is always attempted — no pre-flight probe. The error boundary and
  // onCreated context-loss handler catch failures and surface the real error.
  const showCanvas = !glLost && !glError;

  const onNear = useCallback((id: string | null) => setNearId(id), []);
  const onEnter = useCallback((id: string) => {
    const lm = LM_BY_ID[id];
    if (lm) setSelected(lm);
  }, []);

  const near = nearId ? LM_BY_ID[nearId] : null;

  return (
    <div data-testid="page-world" className="fixed inset-0 overflow-hidden bg-[#05030c]">
      <div
        data-testid="canvas-world"
        className="absolute inset-0"
        style={{ touchAction: "none", cursor: showCanvas ? "grab" : "default" }}
      >
        {showCanvas ? (
          <GLBoundary
            onError={setGlError}
            fallback={(err) => <WebGLFallback error={err} />}
          >
            <Canvas
              dpr={[1, 1.6]}
              camera={{ fov: 72, near: 0.1, far: 600, position: [0, 6, 32] }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                console.log("[Vanta City] WebGL renderer created:", gl.getContext().constructor.name);
                gl.domElement.addEventListener(
                  "webglcontextlost",
                  (e) => {
                    e.preventDefault();
                    console.error("[Vanta City] WebGL context lost");
                    setGlLost(true);
                  },
                  { once: true },
                );
              }}
            >
              <Scene city={city} paused={!!selected} onNear={onNear} onEnter={onEnter} />
            </Canvas>
          </GLBoundary>
        ) : (
          <WebGLFallback error={glError} />
        )}
      </div>

      <Header />

      {/* HUD */}
      {showCanvas && (
      <div className="pointer-events-none absolute left-4 top-20 z-10 max-w-xs">
        <div className="rounded-md border border-purple-500/30 bg-black/50 px-3 py-2 backdrop-blur-sm">
          <div className="text-sm font-bold uppercase tracking-[0.25em] text-purple-300" data-testid="text-city-title">
            VANTA CITY
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-widest text-purple-400/70">
            {near ? `Approaching · ${near.name}` : "Street-level explorer"}
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Move3d className="h-3 w-3 text-purple-400" />
              <span>WASD / arrows to move</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MousePointer2 className="h-3 w-3 text-purple-400" />
              <span>Drag to look around</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-purple-500/40 px-1 text-[10px] font-bold text-purple-300">E</span>
              <span>Enter a landmark</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Proximity prompt */}
      {near && !selected && (
        <div
          data-testid="prompt-enter"
          className="pointer-events-none absolute bottom-28 left-1/2 z-40 -translate-x-1/2 md:bottom-16"
        >
          <button
            data-testid="button-enter-prompt"
            onClick={() => setSelected(near)}
            className="pointer-events-auto flex items-center gap-3 rounded-md border bg-black/70 px-5 py-3 backdrop-blur-md transition-transform active:scale-[0.98]"
            style={{ borderColor: `${near.neon}66`, boxShadow: `0 0 24px ${near.neon}33` }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded border text-sm font-bold"
              style={{ color: near.neon, borderColor: `${near.neon}88` }}
            >
              E
            </span>
            <span className="text-sm font-semibold uppercase tracking-widest text-zinc-100">
              Enter {near.name}
            </span>
          </button>
        </div>
      )}

      {showCanvas && <MobileControls />}

      {/* Modal */}
      {selected && (
        <div
          data-testid="modal-building"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-md rounded-md border bg-[#0a0612] p-6"
            style={{ borderColor: `${selected.neon}55`, boxShadow: `0 0 40px ${selected.neon}33` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              data-testid="button-close-modal"
              onClick={() => setSelected(null)}
              className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <Badge
              variant="outline"
              className="mb-3 uppercase tracking-widest"
              style={{ color: selected.neon, borderColor: `${selected.neon}66` }}
            >
              {selected.sub}
            </Badge>
            <h2
              className="text-2xl font-bold uppercase tracking-wide"
              style={{ color: selected.neon, textShadow: `0 0 16px ${selected.neon}66` }}
              data-testid="text-modal-name"
            >
              {selected.name}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{selected.desc}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {selected.comingSoon ? (
                <Button disabled className="gap-2" data-testid="button-coming-soon">
                  <Lock className="h-4 w-4" /> Coming Soon
                </Button>
              ) : (
                <Button
                  data-testid="button-enter-node"
                  className="gap-2"
                  onClick={() => {
                    const href = selected.href;
                    setSelected(null);
                    if (href) navigate(href);
                  }}
                >
                  Enter Node <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                data-testid="button-dismiss-modal"
                onClick={() => setSelected(null)}
              >
                Back to city
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
