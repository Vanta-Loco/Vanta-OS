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
import { Html, Grid } from "@react-three/drei";
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
const BOUND = 128; // player movement clamp (city half-extent)
const PLAYER_SPEED = 22; // units / second
const CAM_DIST = 15;
const CAM_HEIGHT = 8.5;
const ENTER_PAD = 7; // extra radius around a landmark footprint to allow entry
const PLAYER_RADIUS = 1.4;

// City road / block grid
const LINES = [-132, -88, -44, 0, 44, 88, 132];
const MIDS = [-110, -66, -22, 22, 66, 110];
const ROADW = 11;
const BLOCK = 33;

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
  { id: "vanta-os-core", name: "VANTA OS CORE", sub: "SYSTEM HEART", desc: "The pulsing core of the Vanta network. Jack in to boot the operating system.", href: "/enter", pos: [0, 0], color: "#1a0a2e", neon: "#e879f9", w: 16, d: 16, h: 50 },
  { id: "transmissions-tower", name: "TRANSMISSIONS TOWER", sub: "BROADCAST SPIRE", desc: "Where every signal is written and sent — the editorial heart of Vanta Cold.", href: "/", pos: [0, -110], color: "#0b1330", neon: "#38bdf8", w: 12, d: 12, h: 62 },
  { id: "music-hub", name: "MUSIC HUB", sub: "THE LABEL", desc: "Releases, drops and the full discography of the Vanta sound.", href: "/releases", pos: [88, -66], color: "#2a0a1e", neon: "#fb7185", w: 16, d: 14, h: 40 },
  { id: "black-index", name: "BLACK INDEX", sub: "ARCHIVE SEARCH", desc: "Query the index. Surface every transmission ever logged.", href: "/search", pos: [110, 22], color: "#160a2b", neon: "#a855f7", w: 15, d: 15, h: 44 },
  { id: "worlds-archive", name: "WORLDS ARCHIVE", sub: "THE UNIVERSE", desc: "The projects and worlds that make up the Vanta universe.", href: "/worlds", pos: [66, 88], color: "#06202a", neon: "#22d3ee", w: 18, d: 14, h: 36 },
  { id: "vault-gate", name: "VAULT GATE", sub: "RESTRICTED", desc: "A sealed vault. Only those with the code pass through.", href: "/vault", pos: [0, 110], color: "#260808", neon: "#ef4444", w: 20, d: 16, h: 30 },
  { id: "fractured-godhead", name: "FRACTURED GODHEAD", sub: "THE DISTRICT", desc: "The cult quarter — broken idols and neon scripture.", href: "/fgh", pos: [-88, 88], color: "#0a1c08", neon: "#a3e635", w: 16, d: 16, h: 46 },
  { id: "mission-handler", name: "MISSION HANDLER", sub: "OPS COMMAND", desc: "Assignments dispatched from the militant ops floor.", href: "/enter", pos: [-110, 0], color: "#231603", neon: "#fbbf24", w: 16, d: 12, h: 34 },
  { id: "wireline-terminal", name: "WIRELINE TERMINAL", sub: "DATA UPLINK", desc: "Hard-line access to the wire. Raw data in, raw data out.", href: "/wireline", pos: [-88, -66], color: "#0a1330", neon: "#60a5fa", w: 13, d: 13, h: 44 },
  { id: "fract-terminal", name: "FRACT TERMINAL", sub: "THE EXCHANGE", desc: "The fractured exchange. Trade in signal and noise.", href: "/fract", pos: [-44, -110], color: "#1a0a2e", neon: "#e879f9", w: 15, d: 15, h: 40 },
  { id: "hidden-himalayas", name: "HIDDEN HIMALAYAS", sub: "THE PORTAL", desc: "A gateway that should not exist. Step through.", href: "/himalayas", pos: [44, -110], color: "#06202a", neon: "#a5f3fc", w: 16, d: 16, h: 30, kind: "portal" },
  { id: "vanta-box", name: "VANTA BOX", sub: "SEALED", desc: "Something is being built here. Not yet.", comingSoon: true, pos: [110, -110], color: "#10101e", neon: "#64748b", w: 14, d: 14, h: 26 },
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
  const signs: InstItem[] = [];
  const lights: { x: number; z: number }[] = [];
  const aabb: AABB[] = [];

  const zones = LANDMARKS.map((l) => ({
    x: l.pos[0],
    z: l.pos[1],
    rad: Math.max(l.w, l.d) * 0.5 + 12,
  }));

  for (const mx of MIDS)
    for (const mz of MIDS) {
      const g = r() < 0.5 ? 2 : 3;
      const lot = BLOCK / g;
      for (let i = 0; i < g; i++)
        for (let j = 0; j < g; j++) {
          if (r() < 0.18) continue; // empty lot / micro-park
          const cx = mx - BLOCK / 2 + lot * (i + 0.5);
          const cz = mz - BLOCK / 2 + lot * (j + 0.5);

          let skip = false;
          for (const z of zones)
            if (Math.hypot(cx - z.x, cz - z.z) < z.rad + 6) {
              skip = true;
              break;
            }
          if (skip) continue;
          if (Math.hypot(cx - PLAYER_START[0], cz - PLAYER_START[1]) < 11)
            continue;

          const fw = lot * (0.55 + r() * 0.3);
          const fd = lot * (0.55 + r() * 0.3);
          const rad = Math.hypot(cx, cz);
          let h: number;
          if (rad < 55) h = 18 + r() * 26;
          else if (rad < 100) h = 10 + r() * 18;
          else h = 6 + r() * 12;

          const color = DARK[Math.floor(r() * DARK.length)];
          buildings.push({ x: cx, y: h / 2, z: cz, sx: fw, sy: h, sz: fd, color });
          aabb.push({ x: cx, z: cz, hw: fw / 2, hd: fd / 2 });

          if (r() < 0.55) {
            const side = Math.floor(r() * 4);
            const ang = side * (Math.PI / 2);
            const off =
              side === 0
                ? { x: 0, z: fd / 2 + 0.1 }
                : side === 1
                  ? { x: fw / 2 + 0.1, z: 0 }
                  : side === 2
                    ? { x: 0, z: -fd / 2 - 0.1 }
                    : { x: -fw / 2 - 0.1, z: 0 };
            const sw = 1.6 + r() * 3;
            signs.push({
              x: cx + off.x,
              y: 3 + r() * Math.min(Math.max(h - 4, 2), 13),
              z: cz + off.z,
              sx: sw,
              sy: sw * 0.7,
              sz: 1,
              rot: ang,
              color: NEON[Math.floor(r() * NEON.length)],
            });
          }
        }
    }

  for (const l of LANDMARKS)
    aabb.push({ x: l.pos[0], z: l.pos[1], hw: l.w / 2, hd: l.d / 2 });

  for (let ii = 0; ii < LINES.length; ii++)
    for (let jj = 0; jj < LINES.length; jj++) {
      if ((ii + jj) % 2 !== 0) continue;
      lights.push({ x: LINES[ii], z: LINES[jj] });
    }

  return { buildings, signs, lights, aabb };
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
      args={[undefined as any, undefined as any, items.length]}
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
  const span = BOUND * 2.5;
  return (
    <group>
      {LINES.map((v, i) => (
        <group key={`h${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, v]}>
            <planeGeometry args={[span, ROADW]} />
            <meshStandardMaterial color="#0a0612" roughness={0.9} metalness={0.1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, v]}>
            <planeGeometry args={[span, 0.4]} />
            <meshBasicMaterial color="#7c3aed" toneMapped={false} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
      {LINES.map((v, i) => (
        <group key={`v${i}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[v, 0.03, 0]}>
            <planeGeometry args={[ROADW, span]} />
            <meshStandardMaterial color="#0a0612" roughness={0.9} metalness={0.1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[v, 0.05, 0]}>
            <planeGeometry args={[0.4, span]} />
            <meshBasicMaterial color="#7c3aed" toneMapped={false} transparent opacity={0.5} />
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
  { x: 20, z: 20, rot: Math.PI * 0.75, c: "#e879f9" },
  { x: -30, z: -12, rot: 0.4, c: "#f87171" },
  { x: 58, z: 12, rot: -0.6, c: "#22d3ee" },
  { x: -18, z: 56, rot: Math.PI, c: "#fbbf24" },
  { x: 32, z: -42, rot: 2.2, c: "#c084fc" },
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
        <Html position={[0, 19, 0]} center pointerEvents="none">
          <LandmarkLabel name={lm.name} neon={lm.neon} />
        </Html>
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
      <Html position={[0, lm.h + 8.5, 0]} center pointerEvents="none">
        <LandmarkLabel name={lm.name} neon={lm.neon} sealed={lm.comingSoon} />
      </Html>
    </group>
  );
}

function LandmarkLabel({
  name,
  neon,
  sealed,
}: {
  name: string;
  neon: string;
  sealed?: boolean;
}) {
  return (
    <div
      className="select-none whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm"
      style={{
        color: neon,
        borderColor: `${neon}66`,
        background: "rgba(5,3,12,0.6)",
        textShadow: `0 0 8px ${neon}`,
        opacity: sealed ? 0.7 : 1,
      }}
    >
      {name}
    </div>
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
  const keys = useRef<Record<string, boolean>>({});
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
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
        e.preventDefault();
      keys.current[k] = true;
      if (k === "e" && nearId.current && !pausedRef.current)
        onEnter(nearId.current);
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
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
    const k = keys.current;
    const p = pos.current;
    const th = yaw.current;
    const t = tmp.current;

    t.f.set(-Math.sin(th), 0, -Math.cos(th)); // forward (away from camera)
    t.r.set(Math.cos(th), 0, -Math.sin(th)); // right

    let iz = 0;
    let ix = 0;
    if (!pausedRef.current) {
      if (k["w"] || k["arrowup"]) iz += 1;
      if (k["s"] || k["arrowdown"]) iz -= 1;
      if (k["d"] || k["arrowright"]) ix += 1;
      if (k["a"] || k["arrowleft"]) ix -= 1;
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
    const lerp = 1 - Math.pow(0.0015, dt);
    camera.position.lerp(cam, lerp);
    camera.lookAt(p.x, 2.4, p.z);

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
      <fog attach="fog" args={["#05030c", 38, 178]} />
      <ambientLight intensity={0.6} color="#b7a6e6" />
      <hemisphereLight args={["#3a1d6e", "#05030a", 0.5]} />
      <directionalLight position={[40, 80, 20]} intensity={1.3} color="#9d7bff" />
      <Suspense fallback={null}>
        <Ground />
        <Roads />
        <Buildings items={city.buildings} />
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

// ─── WebGL guard + graceful fallback ──────────────────────────────────────────────
// A plain getContext() check is NOT enough: some environments (Replit's headless
// preview/screenshot browser, certain remote/software GL stacks) hand back a context
// that is immediately LOST the moment three actually renders to it. That throws
// asynchronously deep inside R3F, which React 18 dev re-dispatches to window.onerror,
// tripping the runtime-error overlay. So we do a real warmup: build an actual
// THREE.WebGLRenderer, render one frame with an instanced mesh (like the real scene),
// then wait a beat to see whether the context survives. Only mount the <Canvas> if it does.
async function probeWebGL(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let renderer: THREE.WebGLRenderer | undefined;
  let canvas: HTMLCanvasElement | undefined;
  try {
    canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    let lost = false;
    canvas.addEventListener("webglcontextlost", () => (lost = true), { once: true });

    const ctx =
      (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!ctx) return false;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(32, 32, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    cam.position.z = 3;
    const inst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
      8,
    );
    const m = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) {
      m.setPosition((i % 4) - 1.5, 0, 0);
      inst.setMatrixAt(i, m);
    }
    scene.add(inst);
    // Render several frames spread over 300 ms — a single-frame probe on a software GL
    // stack can pass even though the context dies under load (which is what triggers the
    // acc[key2] crash in R3F). Multiple ticks give the driver time to report the loss.
    for (let f = 0; f < 4; f++) {
      renderer.render(scene, cam);
      await new Promise((r) => setTimeout(r, 75));
      if (lost || renderer.getContext().isContextLost()) break;
    }

    const glLost = lost || renderer.getContext().isContextLost();
    inst.geometry.dispose();
    (inst.material as THREE.Material).dispose();
    return !glLost;
  } catch {
    return false;
  } finally {
    try {
      renderer?.dispose();
      const lose = renderer
        ?.getContext()
        ?.getExtension("WEBGL_lose_context") as { loseContext?: () => void } | null;
      lose?.loseContext?.();
    } catch {
      /* ignore */
    }
  }
}

class GLBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function CityDirectory({ navigate }: { navigate: (to: string) => void }) {
  return (
    <div className="absolute inset-0 overflow-auto bg-[#05030c]">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-24">
        <div className="text-xs uppercase tracking-[0.3em] text-purple-400/70">
          Vanta City · District Index
        </div>
        <h1 className="mt-1 text-3xl font-bold uppercase tracking-wide text-purple-200">
          Enter a Landmark
        </h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500">
          The live 3D street view requires WebGL. Choose a destination below to jump
          straight into any district.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LANDMARKS.map((lm) => (
            <button
              key={lm.id}
              data-testid={`button-district-${lm.id}`}
              disabled={lm.comingSoon}
              onClick={() => lm.href && navigate(lm.href)}
              className="group flex flex-col items-start gap-1 rounded-md border bg-black/40 p-4 text-left backdrop-blur-sm transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: `${lm.neon}44` }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: lm.neon }}
              >
                {lm.sub}
              </span>
              <span className="text-base font-semibold uppercase tracking-wide text-zinc-100">
                {lm.name}
              </span>
              <span className="text-xs leading-relaxed text-zinc-500">{lm.desc}</span>
              <span className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: lm.neon }}>
                {lm.comingSoon ? (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Coming Soon
                  </>
                ) : (
                  <>
                    Enter <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function World() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<"checking" | "3d" | "fallback">("checking");
  const [glLost, setGlLost] = useState(false);
  const city = useMemo(() => buildCity(), []);
  const [nearId, setNearId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Landmark | null>(null);

  useEffect(() => {
    let alive = true;
    probeWebGL().then((ok) => {
      if (alive) setPhase(ok ? "3d" : "fallback");
    });
    return () => {
      alive = false;
    };
  }, []);

  const showCanvas = phase === "3d" && !glLost;

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
          <GLBoundary fallback={<CityDirectory navigate={navigate} />}>
            <Canvas
              dpr={[1, 1.6]}
              camera={{ fov: 62, near: 0.1, far: 460, position: [0, 9, 56] }}
              gl={{ antialias: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                // If the GPU drops the context (driver reset, headless GL, etc.),
                // fall back to the navigable directory instead of a blank/crashed canvas.
                gl.domElement.addEventListener(
                  "webglcontextlost",
                  (e) => {
                    e.preventDefault();
                    setGlLost(true);
                  },
                  { once: true },
                );
              }}
            >
              <Scene city={city} paused={!!selected} onNear={onNear} onEnter={onEnter} />
            </Canvas>
          </GLBoundary>
        ) : phase === "checking" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#05030c]">
            <div className="text-xs uppercase tracking-[0.3em] text-purple-400/60 animate-pulse">
              Booting Vanta City…
            </div>
          </div>
        ) : (
          <CityDirectory navigate={navigate} />
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
