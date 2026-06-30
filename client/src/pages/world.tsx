import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLocation } from "wouter";
import * as THREE from "three";
// @ts-ignore — Three.js JSM examples ship without bundled TS declarations
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
// @ts-ignore
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
// @ts-ignore
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
// @ts-ignore
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
// @ts-ignore
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
// @ts-ignore
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
// @ts-ignore
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import { VaultRadio } from "@/components/vault-radio";
import { WorldMinimap } from "@/components/world-minimap";
import {
  saveWorldState, loadWorldState, DEFAULT_WORLD_SAVE,
  type WorldSave,
} from "@/lib/world-state";

// ─── Constants ─────────────────────────────────────────────────────────────────
const CS          = 80;    // chunk size (world units)
const RD          = 2;     // render distance (chunks)
const RW          = 8;     // road width
const SW          = 3;     // sidewalk width
const RY          = 0.02;  // road plane Y
const SWY         = 0.03;  // sidewalk Y
const ENTER_R     = 18;    // enter trigger radius (units)
const LABEL_R     = 80;    // landmark name display radius (units)
const CAM_ROT_SPD = 1.6;   // keyboard cam-orbit speed (rad/s)
const CAM_DRAG_S  = 0.004; // mouse/touch drag sensitivity (rad/px)

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Disposable   { geo: THREE.BufferGeometry; mat: THREE.Material }
interface ChunkData    { key: string; cx: number; cz: number; objects: THREE.Object3D[]; disposables: Disposable[] }
interface LandmarkDef  { id: string; name: string; x: number; z: number; h: number; color: number; cap: number; route: string | null; msg: string | null }
interface BuildingType { color: number; roofColor: number; minH: number; maxH: number; minW: number; maxW: number; minD: number; maxD: number }
interface NearState    { lm: LandmarkDef | null; canEnter: boolean }

// ─── Landmarks (fixed world positions) ────────────────────────────────────────
const LANDMARKS: LandmarkDef[] = [
  { id: "black-index", name: "BLACK INDEX",      x:  40, z:  -40, h: 36, color: 0x0a0014, cap: 0x7c3aed, route: "/search",   msg: null },
  { id: "music-hub",   name: "MUSIC HUB",        x: -60, z:  -60, h: 28, color: 0x14000a, cap: 0xec4899, route: "/releases", msg: null },
  { id: "vault-gate",  name: "VAULT GATE",        x:  90, z:   20, h: 20, color: 0x001400, cap: 0x22c55e, route: "/vault",    msg: null },
  { id: "wireline",    name: "WIRELINE TERMINAL", x: -90, z:   50, h: 24, color: 0x000a14, cap: 0x3b82f6, route: "/wireline", msg: null },
  { id: "fract",       name: "FRACT EXCHANGE",    x:  10, z: -110, h: 30, color: 0x100014, cap: 0xf59e0b, route: "/fract",    msg: null },
  { id: "subway",      name: "VANTA METRO",       x: -20, z:   70, h:  5, color: 0x0a0a14, cap: 0x6b7280, route: null,        msg: "Metro access locked" },
  { id: "vanta-os",    name: "VANTA OS CORE",     x: 110, z:  -90, h: 32, color: 0x0a0010, cap: 0xa855f7, route: "/enter",   msg: null },
];

// ─── Building types by district ────────────────────────────────────────────────
// Districts: 0=tech (x≥0,z<0 NE), 1=residential (x<0,z≥0 SW), 2=industrial (x<0,z<0 NW), 3=commercial (x≥0,z≥0 SE)
const DISTRICT_TYPES: BuildingType[][] = [
  [ // tech (NE) — blue-purple towers
    { color: 0x1c2f6a, roofColor: 0x2c4490, minH: 14, maxH: 35, minW: 7,  maxW: 15, minD: 7,  maxD: 15 },
    { color: 0x111a40, roofColor: 0x1c2c68, minH: 20, maxH: 44, minW: 8,  maxW: 18, minD: 8,  maxD: 18 },
    { color: 0x18144a, roofColor: 0x241e74, minH: 8,  maxH: 18, minW: 5,  maxW: 12, minD: 5,  maxD: 12 },
  ],
  [ // residential (SW) — violet-purple
    { color: 0x2e1a48, roofColor: 0x44265e, minH: 6,  maxH: 14, minW: 8,  maxW: 14, minD: 8,  maxD: 14 },
    { color: 0x201530, roofColor: 0x302044, minH: 4,  maxH: 8,  minW: 6,  maxW: 10, minD: 6,  maxD: 10 },
    { color: 0x183020, roofColor: 0x224830, minH: 3,  maxH: 7,  minW: 5,  maxW: 9,  minD: 5,  maxD: 9  },
  ],
  [ // industrial (NW) — warm amber-brown
    { color: 0x2c1c10, roofColor: 0x442a18, minH: 4,  maxH: 8,  minW: 14, maxW: 24, minD: 10, maxD: 18 },
    { color: 0x201810, roofColor: 0x302418, minH: 5,  maxH: 10, minW: 8,  maxW: 18, minD: 8,  maxD: 14 },
    { color: 0x241e18, roofColor: 0x342c24, minH: 6,  maxH: 12, minW: 6,  maxW: 11, minD: 6,  maxD: 11 },
  ],
  [ // commercial (SE) — magenta-pink
    { color: 0x2e1430, roofColor: 0x441e48, minH: 8,  maxH: 20, minW: 7,  maxW: 14, minD: 7,  maxD: 14 },
    { color: 0x1e1028, roofColor: 0x2c183c, minH: 5,  maxH: 10, minW: 5,  maxW: 10, minD: 5,  maxD: 10 },
    { color: 0x1c1028, roofColor: 0x281838, minH: 3,  maxH: 6,  minW: 4,  maxW: 8,  minD: 4,  maxD: 8  },
  ],
];

// ─── Toon gradient map (3-step: shadow / mid / highlight) ─────────────────────
function makeToonMap(): THREE.DataTexture {
  // Steps: dark-shadow floor (#151a12 ≈ 21), mid-tone, highlight
  // Floor at 80 keeps shadows from collapsing to pure black
  const data = new Uint8Array([80, 160, 240]);
  const tex  = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  return tex;
}
const TOON_MAP = makeToonMap();

// ─── Chromatic aberration ShaderPass definition ───────────────────────────────
const ChromaShader = {
  name: "ChromaShader",
  uniforms: { tDiffuse: { value: null }, uOffset: { value: new THREE.Vector2(0.0005, 0.0003) } },
  vertexShader:   `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uOffset; varying vec2 vUv;
    void main(){
      vec4 cr=texture2D(tDiffuse,vUv+uOffset);
      vec4 cg=texture2D(tDiffuse,vUv);
      vec4 cb=texture2D(tDiffuse,vUv-uOffset);
      gl_FragColor=vec4(cr.r,cg.g,cb.b,cg.a);
    }`,
};

// ─── Seeded RNG ────────────────────────────────────────────────────────────────
function seededRng(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function chunkSeed(cx: number, cz: number): number {
  return (((cx + 10000) * 73856093) ^ ((cz + 10000) * 19349663)) >>> 0;
}

// ─── Chunk builder ─────────────────────────────────────────────────────────────
// Returns objects NOT yet added to scene — caller adds them.
function buildChunk(cx: number, cz: number): ChunkData {
  const rng  = seededRng(chunkSeed(cx, cz));
  const objs: THREE.Object3D[] = [];
  const disp: Disposable[]     = [];

  const wx = cx * CS;
  const wz = cz * CS;

  function mk(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    disp.push({ geo, mat });
    const m = new THREE.Mesh(geo, mat);
    objs.push(m);
    return m;
  }

  // Ground fill — visible dark green, lighter than before
  const grd = mk(new THREE.PlaneGeometry(CS, CS), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0x182015 }));
  grd.rotation.x = -Math.PI / 2;
  grd.position.set(wx + CS / 2, 0, wz + CS / 2);

  // Road along NORTH edge — charcoal green, clearly distinct from ground
  const nr = mk(new THREE.PlaneGeometry(CS + RW, RW), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0x2c3028 }));
  nr.rotation.x = -Math.PI / 2;
  nr.position.set(wx + CS / 2, RY, wz + CS);

  // Road along EAST edge — slightly higher Y to prevent z-fight at intersections
  const er = mk(new THREE.PlaneGeometry(RW, CS + RW), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0x2c3028 }));
  er.rotation.x = -Math.PI / 2;
  er.position.set(wx + CS, RY + 0.005, wz + CS / 2);

  // Sidewalk inside north road — lighter than road
  const nsw = mk(new THREE.PlaneGeometry(CS, SW), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0x34382f }));
  nsw.rotation.x = -Math.PI / 2;
  nsw.position.set(wx + CS / 2, SWY, wz + CS - RW / 2 - SW / 2);

  // Sidewalk inside east road
  const esw = mk(new THREE.PlaneGeometry(SW, CS), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0x34382f }));
  esw.rotation.x = -Math.PI / 2;
  esw.position.set(wx + CS - RW / 2 - SW / 2, SWY, wz + CS / 2);

  // Streetlights — dark poles, cool-white emissive heads that trigger bloom
  const pC = 0x282c20;
  const hC = 0xd8e8ff;
  const poleZ = wz + CS - RW / 2 - SW - 1.2;
  let nLampIdx = 0;
  for (let lx = wx + 14; lx < wx + CS - 6; lx += 16) {
    const p = mk(new THREE.BoxGeometry(0.22, 5.5, 0.22), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: pC }));
    p.position.set(lx, 2.75, poleZ);
    const h = mk(new THREE.BoxGeometry(0.5, 0.5, 2.2), new THREE.MeshToonMaterial({
      gradientMap: TOON_MAP, color: hC,
      emissive: new THREE.Color(hC), emissiveIntensity: 1.4,
    }));
    h.position.set(lx, 5.6, poleZ - 0.9);
    if (nLampIdx % 3 === 0) {
      const pl = new THREE.PointLight(0xb8d6ff, 1.2, 18, 2);
      pl.position.set(lx, 5.0, poleZ - 0.9);
      objs.push(pl);
    }
    nLampIdx++;
  }

  // Streetlights along east road
  const poleX = wx + CS - RW / 2 - SW - 1.2;
  let eLampIdx = 0;
  for (let lz = wz + 14; lz < wz + CS - 6; lz += 16) {
    const p = mk(new THREE.BoxGeometry(0.22, 5.5, 0.22), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: pC }));
    p.position.set(poleX, 2.75, lz);
    const h = mk(new THREE.BoxGeometry(2.2, 0.5, 0.5), new THREE.MeshToonMaterial({
      gradientMap: TOON_MAP, color: hC,
      emissive: new THREE.Color(hC), emissiveIntensity: 1.4,
    }));
    h.position.set(poleX - 0.9, 5.6, lz);
    if (eLampIdx % 3 === 0) {
      const pl = new THREE.PointLight(0xb8d6ff, 1.2, 18, 2);
      pl.position.set(poleX - 0.9, 5.0, lz);
      objs.push(pl);
    }
    eLampIdx++;
  }

  // Curb strips — warm stone green, clearly distinct from road + sidewalk
  const curbC = 0x4a4e42;
  const curbN = mk(new THREE.BoxGeometry(CS, 0.14, 0.35), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: curbC }));
  curbN.position.set(wx + CS / 2, 0.07, wz + CS - RW / 2 - SW);
  const curbE = mk(new THREE.BoxGeometry(0.35, 0.14, CS), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: curbC }));
  curbE.position.set(wx + CS - RW / 2 - SW, 0.07, wz + CS / 2);

  // District selection based on quadrant
  const distIdx = cx >= 0 ? (cz < 0 ? 0 : 3) : (cz < 0 ? 2 : 1);
  const dTypes  = DISTRICT_TYPES[distIdx];

  // Skip buildings in chunks that are close to a major landmark
  const ccx = wx + CS / 2, ccz = wz + CS / 2;
  const tooClose = LANDMARKS.some(lm => Math.hypot(lm.x - ccx, lm.z - ccz) < 55);

  if (!tooClose) {
    const margin = RW / 2 + SW + 3;
    const bMinX = wx + margin, bMaxX = wx + CS - margin;
    const bMinZ = wz + margin, bMaxZ = wz + CS - margin;
    const bAreaW = bMaxX - bMinX, bAreaD = bMaxZ - bMinZ;

    if (bAreaW > 12 && bAreaD > 12) {
      const numB = 2 + Math.floor(rng() * 4); // 2–5 buildings
      for (let i = 0; i < numB; i++) {
        const type = dTypes[Math.floor(rng() * dTypes.length)];
        const bw = type.minW + rng() * (type.maxW - type.minW);
        const bh = type.minH + rng() * (type.maxH - type.minH);
        const bd = type.minD + rng() * (type.maxD - type.minD);
        const bx = bMinX + rng() * Math.max(0, bAreaW - bw);
        const bz = bMinZ + rng() * Math.max(0, bAreaD - bd);

        const body = mk(new THREE.BoxGeometry(bw, bh, bd), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: type.color }));
        body.position.set(bx + bw / 2, bh / 2, bz + bd / 2);

        const roof = mk(new THREE.BoxGeometry(bw, 0.15, bd), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: type.roofColor }));
        roof.position.set(bx + bw / 2, bh + 0.08, bz + bd / 2);

        // Random rooftop element (antenna / mechanical box)
        if (rng() > 0.55) {
          const tw = bw * 0.25 + 0.5, td = bd * 0.25 + 0.5, th = bh * 0.1 + 1;
          const top = mk(new THREE.BoxGeometry(tw, th, td), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: type.roofColor }));
          top.position.set(bx + bw / 2, bh + th / 2, bz + bd / 2);
        }
      }
    }
  }

  return { key: `${cx},${cz}`, cx, cz, objects: objs, disposables: disp };
}

// ─── Landmark builder ──────────────────────────────────────────────────────────
function buildLandmarks(): { objects: THREE.Object3D[]; disposables: Disposable[]; beacons: THREE.Mesh[] } {
  const objects:    THREE.Object3D[] = [];
  const disposables: Disposable[]    = [];
  const beacons:    THREE.Mesh[]     = [];

  function mk(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    disposables.push({ geo, mat });
    const m = new THREE.Mesh(geo, mat);
    objects.push(m);
    return m;
  }

  for (const lm of LANDMARKS) {
    const isSubway = lm.h <= 6;

    // Main shaft
    const shaft = mk(
      new THREE.BoxGeometry(isSubway ? 10 : 6, lm.h, isSubway ? 7 : 6),
      new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: lm.color }),
    );
    shaft.position.set(lm.x, lm.h / 2, lm.z);

    // Glowing cap
    const cap = mk(
      new THREE.BoxGeometry(isSubway ? 10.6 : 5.5, isSubway ? 0.4 : 4, isSubway ? 7.6 : 5.5),
      new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: lm.cap }),
    );
    cap.position.set(lm.x, lm.h + (isSubway ? 0.2 : 2.5), lm.z);

    if (!isSubway) {
      // Spire
      const spire = mk(new THREE.BoxGeometry(0.9, 6, 0.9), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: lm.cap }));
      spire.position.set(lm.x, lm.h + 7, lm.z);

      // Second narrow shaft detail
      const detail = mk(new THREE.BoxGeometry(4, lm.h * 0.6, 4), new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: lm.color }));
      detail.position.set(lm.x + 4, lm.h * 0.3, lm.z);
    }

    // Pulsing beacon (animated in useFrame)
    const bGeo = new THREE.BoxGeometry(2, 2, 2);
    const bMat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: lm.cap, transparent: true, opacity: 0.9 });
    const beacon = new THREE.Mesh(bGeo, bMat);
    beacon.position.set(lm.x, lm.h + (isSubway ? 5 : 15), lm.z);
    disposables.push({ geo: bGeo, mat: bMat });
    objects.push(beacon);
    beacons.push(beacon);
  }

  return { objects, disposables, beacons };
}

// ─── Error boundary ────────────────────────────────────────────────────────────
class CanvasBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message ?? String(e) }; }
  componentDidCatch(e: Error) { console.error("[Vanta City] Canvas error:", e.message, e.stack); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: "#05030c", fontFamily: "monospace" }}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>VANTA CITY — RENDER ERROR</div>
          <div style={{ fontSize: 10, color: "#f87171", background: "#1f0a0a", border: "1px solid #7f1d1d", padding: "6px 14px", borderRadius: 4, maxWidth: 500, textAlign: "center", wordBreak: "break-all" }}>
            {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Scene component ───────────────────────────────────────────────────────────
// All THREE.js objects are created imperatively (useEffect + scene.add) to avoid
// the R3F v8 / three@0.169.0 applyProps crash.
interface CitySceneProps {
  onNear:       (s: NearState) => void;
  onEnter:      (route: string) => void;
  playerPosRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
  worldSaveRef: React.MutableRefObject<WorldSave>;
}

function CityScene({ onNear, onEnter, playerPosRef, worldSaveRef }: CitySceneProps) {
  const { scene } = useThree();

  // Player / movement
  const playerRef      = useRef<THREE.Mesh | null>(null);
  const keysRef        = useRef<Set<string>>(new Set());
  const angleRef       = useRef(0);          // player facing angle (Y-axis rad)

  // Camera
  const camYawRef      = useRef(0);           // extra yaw offset around player
  const camPitchRef    = useRef(0.32);        // vertical pitch (rad); 0.32 ≈ 18° above horizon
  const camDistRef     = useRef(10);          // follow distance (world units)
  const camTargetRef   = useRef(new THREE.Vector3(0, 6, 10));

  // Chunks
  const chunksRef      = useRef<Map<string, ChunkData>>(new Map());
  const playerChunkRef = useRef({ cx: 9999, cz: 9999 }); // force first-frame load

  // Landmarks
  const beaconsRef     = useRef<THREE.Mesh[]>([]);
  const enterIdRef     = useRef<string | null>(null); // for E-key handler
  const nearKeyRef     = useRef("");                  // change-detection string

  // Pointer drag
  const isDraggingRef  = useRef(false);
  const lastPtrXRef    = useRef(0);
  const lastPtrYRef    = useRef(0);

  // Stable callback refs (prevent stale closures in event handlers)
  const onNearRef  = useRef(onNear);
  const onEnterRef = useRef(onEnter);
  useEffect(() => { onNearRef.current  = onNear;  }, [onNear]);
  useEffect(() => { onEnterRef.current = onEnter; }, [onEnter]);

  // ── One-time scene setup ────────────────────────────────────────────────────
  useEffect(() => {
    const allObjs: THREE.Object3D[] = [];
    const allDisp: Disposable[]     = [];

    // Player body — restore saved position/angle on return from a building
    const pGeo = new THREE.BoxGeometry(1, 2, 1);
    const pMat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0xa855f7 });
    const player = new THREE.Mesh(pGeo, pMat);
    const initSave        = worldSaveRef.current;
    player.position.set(initSave.playerX, 1, initSave.playerZ);
    angleRef.current      = initSave.angle;
    camYawRef.current     = initSave.camYaw;
    camPitchRef.current   = initSave.camPitch;
    camDistRef.current    = initSave.camDist;
    // Force chunk reload at restored position
    playerChunkRef.current = { cx: 9999, cz: 9999 };
    allDisp.push({ geo: pGeo, mat: pMat });
    allObjs.push(player);
    scene.add(player);
    playerRef.current = player;

    // Forward-facing nose (direction indicator)
    const nGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const nMat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0xffffff });
    allDisp.push({ geo: nGeo, mat: nMat });
    const nose = new THREE.Mesh(nGeo, nMat);
    nose.position.set(0, 0.4, -0.65);
    player.add(nose);

    // Scene atmosphere — visible dark blue-green sky, light fog
    scene.background = new THREE.Color(0x101a18);
    scene.fog = new THREE.FogExp2(0x182015, 0.0012);

    // Sky dome — large inverted sphere so the horizon never bleeds to black
    const skyGeo = new THREE.SphereGeometry(900, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x101a18, side: THREE.BackSide });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    allDisp.push({ geo: skyGeo, mat: skyMat });
    allObjs.push(skyDome);
    scene.add(skyDome);

    // Strong ambient floor — ground never collapses to pure black
    const light = new THREE.AmbientLight(0x263020, 1.25);
    allObjs.push(light);
    scene.add(light);

    // Hemisphere — soft green sky fill + green ground bounce
    const hemi = new THREE.HemisphereLight(0x283828, 0x182015, 1.3);
    allObjs.push(hemi);
    scene.add(hemi);

    // Main moonlight — cooler white, drives toon steps without washing out
    const moon = new THREE.DirectionalLight(0xc8d8b0, 1.4);
    moon.position.set(-2, 5, 1);
    allObjs.push(moon);
    scene.add(moon);

    // Subtle green rim — dirty fill from opposite side
    const rim = new THREE.DirectionalLight(0x203810, 0.35);
    rim.position.set(3, 0.5, -2);
    allObjs.push(rim);
    scene.add(rim);

    // Fixed landmarks
    const lmData = buildLandmarks();
    for (const o of lmData.objects) scene.add(o);
    beaconsRef.current = lmData.beacons;

    // Initial 5×5 chunk grid around origin
    const iCx = Math.floor(0 / CS), iCz = Math.floor(0 / CS);
    for (let dcx = -RD; dcx <= RD; dcx++) {
      for (let dcz = -RD; dcz <= RD; dcz++) {
        const data = buildChunk(iCx + dcx, iCz + dcz);
        for (const o of data.objects) scene.add(o);
        chunksRef.current.set(data.key, data);
      }
    }
    playerChunkRef.current = { cx: iCx, cz: iCz };

    // ── Keyboard ─────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when the user is interacting with the Vault Radio HUD
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio]")) return;
      keysRef.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      // E = enter landmark (never used for camera rotation)
      if (e.code === "KeyE" && enterIdRef.current) {
        const lm = LANDMARKS.find(l => l.id === enterIdRef.current);
        if (lm?.route) onEnterRef.current(lm.route);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onBlur  = () => keysRef.current.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    window.addEventListener("blur",    onBlur);

    // ── Mouse drag (camera yaw + pitch) ──────────────────────────────────────
    const PITCH_MIN = -Math.PI / 180 * 25;  // -25°
    const PITCH_MAX =  Math.PI / 180 * 55;  // +55°
    const DIST_MIN  = 4, DIST_MAX = 22;

    const onMouseDown  = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio]")) return;
      isDraggingRef.current = true;
      lastPtrXRef.current = e.clientX;
      lastPtrYRef.current = e.clientY;
    };
    const onMouseMove  = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPtrXRef.current;
      const dy = e.clientY - lastPtrYRef.current;
      camYawRef.current   += dx * CAM_DRAG_S;
      camPitchRef.current -= dy * CAM_DRAG_S;
      camPitchRef.current  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, camPitchRef.current));
      lastPtrXRef.current  = e.clientX;
      lastPtrYRef.current  = e.clientY;
    };
    const onMouseUp = () => { isDraggingRef.current = false; };

    // ── Scroll wheel zoom ─────────────────────────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio]")) return;
      camDistRef.current = Math.max(DIST_MIN, Math.min(DIST_MAX,
        camDistRef.current + e.deltaY * 0.02,
      ));
    };

    // ── Touch drag (camera yaw + pitch) ──────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true;
      lastPtrXRef.current = e.touches[0].clientX;
      lastPtrYRef.current = e.touches[0].clientY;
    };
    const onTouchMove  = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.touches[0].clientX - lastPtrXRef.current;
      const dy = e.touches[0].clientY - lastPtrYRef.current;
      camYawRef.current   += dx * CAM_DRAG_S;
      camPitchRef.current -= dy * CAM_DRAG_S;
      camPitchRef.current  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, camPitchRef.current));
      lastPtrXRef.current  = e.touches[0].clientX;
      lastPtrYRef.current  = e.touches[0].clientY;
    };
    const onTouchEnd = () => { isDraggingRef.current = false; };

    window.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mousemove",  onMouseMove);
    window.addEventListener("mouseup",    onMouseUp);
    window.addEventListener("wheel",      onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: true });
    window.addEventListener("touchend",   onTouchEnd);

    console.log("[Vanta City] Scene ready ✓  districts: tech/residential/industrial/commercial");

    return () => {
      scene.fog = null;
      scene.background = null;

      for (const o of allObjs) scene.remove(o);
      for (const { geo, mat } of allDisp) { geo.dispose(); mat.dispose(); }

      for (const o of lmData.objects) scene.remove(o);
      for (const { geo, mat } of lmData.disposables) { geo.dispose(); mat.dispose(); }

      chunksRef.current.forEach(data => {
        for (const o of data.objects) scene.remove(o);
        for (const { geo, mat } of data.disposables) { geo.dispose(); mat.dispose(); }
      });
      chunksRef.current.clear();

      window.removeEventListener("keydown",    onKeyDown);
      window.removeEventListener("keyup",      onKeyUp);
      window.removeEventListener("blur",       onBlur);
      window.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mousemove",  onMouseMove);
      window.removeEventListener("mouseup",    onMouseUp);
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onTouchEnd);

      playerRef.current  = null;
      beaconsRef.current = [];
    };
  }, [scene]);

  // ── Per-frame: movement + camera + chunks + proximity + beacons ─────────────
  useFrame((state, dt) => {
    const player = playerRef.current;
    if (!player) return;

    const keys   = keysRef.current;
    const safeDt = Math.min(dt, 0.05);

    // Player rotation (WASD/arrows)
    if (keys.has("KeyA") || keys.has("ArrowLeft"))  angleRef.current += 2.2 * safeDt;
    if (keys.has("KeyD") || keys.has("ArrowRight")) angleRef.current -= 2.2 * safeDt;

    // Camera orbit via keyboard: comma = orbit left, period = orbit right
    if (keys.has("Comma"))  camYawRef.current -= CAM_ROT_SPD * safeDt;
    if (keys.has("Period")) camYawRef.current += CAM_ROT_SPD * safeDt;

    const angle = angleRef.current;
    const fwdX  = -Math.sin(angle);
    const fwdZ  = -Math.cos(angle);

    // Player translate
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      player.position.x += fwdX * 10 * safeDt;
      player.position.z += fwdZ * 10 * safeDt;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      player.position.x -= fwdX * 10 * safeDt;
      player.position.z -= fwdZ * 10 * safeDt;
    }
    player.rotation.y = angle;

    // Camera: spherical follow — yaw + pitch + variable distance
    const totalYaw = angle + camYawRef.current;
    const pitch    = camPitchRef.current;
    const dist     = camDistRef.current;
    const hDist    = dist * Math.cos(pitch);  // horizontal reach
    const vOff     = dist * Math.sin(pitch) + 1.5; // vertical offset above player
    camTargetRef.current.set(
      player.position.x + Math.sin(totalYaw) * hDist,
      player.position.y + vOff,
      player.position.z + Math.cos(totalYaw) * hDist,
    );
    state.camera.position.lerp(camTargetRef.current, 0.1);
    state.camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

    // ── Expose player position to minimap ────────────────────────────────────
    playerPosRef.current = { x: player.position.x, z: player.position.z, angle };

    // ── Keep worldSaveRef current so handleEnter can snapshot before routing ─
    worldSaveRef.current.playerX  = player.position.x;
    worldSaveRef.current.playerZ  = player.position.z;
    worldSaveRef.current.angle    = angle;
    worldSaveRef.current.camYaw   = camYawRef.current;
    worldSaveRef.current.camPitch = camPitchRef.current;
    worldSaveRef.current.camDist  = camDistRef.current;

    // ── Chunk streaming ───────────────────────────────────────────────────────
    const cx = Math.floor(player.position.x / CS);
    const cz = Math.floor(player.position.z / CS);
    if (cx !== playerChunkRef.current.cx || cz !== playerChunkRef.current.cz) {
      playerChunkRef.current = { cx, cz };

      // Collect out-of-range chunk keys first (safe: no mutation during iteration)
      const toRemove: string[] = [];
      chunksRef.current.forEach((data, key) => {
        if (Math.abs(data.cx - cx) > RD || Math.abs(data.cz - cz) > RD) toRemove.push(key);
      });
      for (const key of toRemove) {
        const data = chunksRef.current.get(key)!;
        for (const o of data.objects) scene.remove(o);
        for (const { geo, mat } of data.disposables) { geo.dispose(); mat.dispose(); }
        chunksRef.current.delete(key);
      }

      // Add newly visible chunks
      for (let dcx = -RD; dcx <= RD; dcx++) {
        for (let dcz = -RD; dcz <= RD; dcz++) {
          const ncx = cx + dcx, ncz = cz + dcz;
          const key = `${ncx},${ncz}`;
          if (!chunksRef.current.has(key)) {
            const data = buildChunk(ncx, ncz);
            for (const o of data.objects) scene.add(o);
            chunksRef.current.set(key, data);
          }
        }
      }
    }

    // ── Beacon animation ──────────────────────────────────────────────────────
    const t = state.clock.elapsedTime;
    beaconsRef.current.forEach((beacon, i) => {
      const pulse = 0.65 + 0.55 * Math.abs(Math.sin(t * 1.8 + i * 0.85));
      beacon.scale.setScalar(pulse);
      (beacon.material as THREE.Material).opacity =
        0.25 + 0.75 * Math.abs(Math.sin(t * 1.4 + i * 0.85));
    });

    // ── Proximity detection ───────────────────────────────────────────────────
    // Find closest landmark within LABEL_R; track enter-range separately
    let enterLm: LandmarkDef | null = null, eDist = ENTER_R + 1;
    let labelLm: LandmarkDef | null = null, lDist = LABEL_R + 1;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(player.position.x - lm.x, player.position.z - lm.z);
      if (d < eDist) { eDist = d; enterLm = d < ENTER_R ? lm : null; }
      if (d < lDist) { lDist = d; labelLm = lm; }
    }

    // Update enter-id ref (used by keydown handler)
    enterIdRef.current = enterLm?.id ?? null;

    // Only fire React state update when the effective UI state changes
    const effectiveLm = enterLm ?? (lDist < LABEL_R ? labelLm : null);
    const newKey = enterLm ? `enter:${enterLm.id}` : effectiveLm ? `label:${effectiveLm.id}` : "";
    if (newKey !== nearKeyRef.current) {
      nearKeyRef.current = newKey;
      onNearRef.current({ lm: effectiveLm, canEnter: enterLm !== null });
    }
  });

  return null;
}

// ─── Post-processing (Bloom → ChromaticAberration → FilmGrain → Vignette) ─────
// Priority=1 on useFrame disables R3F's auto-render; the EffectComposer owns it.
function PostFX() {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<any>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);

    composer.addPass(new RenderPass(scene, camera));

    // Subtle bloom — glow on streetlight heads and landmark beacon caps only
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.28,  // strength — subtle glow only
      0.6,   // radius
      0.25,  // threshold — catches emissive lamp heads + beacon caps
    );
    composer.addPass(bloom);

    // OutputPass handles sRGB color-space conversion for final display
    composer.addPass(new OutputPass());

    composer.setSize(size.width, size.height);
    composerRef.current = composer;

    return () => {
      composer.dispose();
      composerRef.current = null;
    };
  }, [gl, scene, camera, size.width, size.height]);

  // Priority > 0 tells R3F to skip its own gl.render() — composer handles it
  useFrame(() => { composerRef.current?.render(); }, 1);

  return null;
}

// ─── Page shell ────────────────────────────────────────────────────────────────
export default function World() {
  const [, navigate]  = useLocation();
  const [near, setNear] = useState<NearState>({ lm: null, canEnter: false });

  // Populated from sessionStorage so returning from a building restores exactly where the user left
  const worldSaveRef = useRef<WorldSave>(loadWorldState() ?? { ...DEFAULT_WORLD_SAVE });

  const handleNear = useCallback((s: NearState) => {
    setNear(s);
    // Keep nearId in sync so it's included when we save on enter
    worldSaveRef.current.nearId = s.lm?.id ?? null;
  }, []);

  const handleEnter = useCallback((route: string) => {
    // Snapshot full world state to sessionStorage before routing away
    saveWorldState({ ...worldSaveRef.current });
    navigate(route);
  }, [navigate]);

  // Shared player position for the minimap (updated every frame by CityScene)
  const playerPosRef = useRef<{ x: number; z: number; angle: number }>({ x: 0, z: 0, angle: 0 });

  const { lm, canEnter } = near;

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", background: "#060412" }}>

      {/* ── HUD ─────────────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 999,
        fontFamily: "monospace", fontSize: 11, pointerEvents: "none", letterSpacing: "0.08em",
      }}>
        <div style={{ color: "#a855f7", background: "rgba(0,0,0,0.8)", border: "1px solid #a855f7", padding: "6px 14px", borderRadius: 4 }}>
          VANTA CITY
        </div>
        <div style={{ color: "#4b5563", background: "rgba(0,0,0,0.6)", padding: "6px 14px", borderRadius: 4, marginTop: 6, fontSize: 9, lineHeight: "1.9" }}>
          WASD / ARROWS — move<br />
          DRAG — orbit + pitch camera<br />
          SCROLL — zoom in / out<br />
          , . — orbit left / right<br />
          E — enter landmark
        </div>
      </div>

      {/* ── Landmark name label (broad range) ─────────────────────────────── */}
      {lm && !canEnter && (
        <div style={{
          position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)",
          color: "#94a3b8", fontFamily: "monospace", fontSize: 10,
          letterSpacing: "0.18em", zIndex: 999, pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {lm.name}
        </div>
      )}

      {/* ── Proximity prompt (enter range) ────────────────────────────────── */}
      {lm && canEnter && (
        <div style={{
          position: "absolute", bottom: "28%", left: "50%", transform: "translateX(-50%)",
          background: "rgba(5,3,12,0.93)", border: `1px solid ${lm.cap.toString(16).padStart(6, "0").replace(/^/, "#")}`,
          color: "#c4b5fd", fontFamily: "monospace", fontSize: 13,
          padding: "10px 26px", borderRadius: 4,
          letterSpacing: "0.1em", zIndex: 999, pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          {lm.msg ? `! ${lm.msg}` : `[E]  Enter ${lm.name}`}
        </div>
      )}

      {/* ── Mini-map HUD ─────────────────────────────────────────────────── */}
      <WorldMinimap playerPosRef={playerPosRef} />

      {/* ── Vault Radio HUD ────────────────────────────────────────────── */}
      <VaultRadio />

      <CanvasBoundary>
        <Canvas
          style={{ width: "100%", height: "100%" }}
          camera={{ position: [0, 6, 10], fov: 60, near: 0.1, far: 2000 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) =>
            console.log("[Vanta City] Canvas ✓", gl.domElement.width, "×", gl.domElement.height)
          }
        >
          <CityScene
            onNear={handleNear}
            onEnter={handleEnter}
            playerPosRef={playerPosRef}
            worldSaveRef={worldSaveRef}
          />
          <PostFX />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
