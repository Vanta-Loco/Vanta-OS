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
import { DistrictChat, type DistrictChatHandle } from "@/components/district-chat/DistrictChat";
import { DistrictJoystick, type DistrictJoystickInput } from "@/components/district-chat/DistrictJoystick";
import { DistrictMinimap } from "@/components/vanta-district-map/DistrictMinimap";
import { DistrictMapView } from "@/components/vanta-district-map/DistrictMapView";
import { VantaBedroomScene } from "@/components/vanta-bedroom";
import { DISTRICT_LANDMARKS } from "@/data/district-landmarks";
import {
  saveWorldState, loadWorldState, DEFAULT_WORLD_SAVE,
  type WorldSave,
} from "@/lib/world-state";
import { clearDistrictPlayerLocation, loadDistrictPlayerLocation, saveDistrictPlayerLocation } from "@/lib/district-player-location";
import { drainDistrictChatSystemMessages, queueDistrictChatSystemMessage } from "@/lib/district-chat-events";
import {
  buildDistrictRoute,
  DEFAULT_DISTRICT_NAVIGATION,
  getDistrictFastTravelSpawn,
  isFastTravelEligible,
  isSafeDistrictPosition,
  loadDistrictNavigationSave,
  resetDistrictNavigationSave,
  saveDistrictNavigationSave,
  shouldRecalculateDistrictRoute,
  trimDistrictRoute,
  unlockDistrictDestination,
  type DistrictNavigationSave,
  type DistrictRoute,
  type DistrictWorldPoint,
} from "@/lib/district-navigation";
import "./vanta-district-touch-controls.css";

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
// Phase 2: flicker window entry tracked per-chunk for useFrame animation
type FlickerEntry = { mesh: THREE.Mesh; phase: number; speed: number };
interface ChunkData    { key: string; cx: number; cz: number; objects: THREE.Object3D[]; disposables: Disposable[]; flickerMeshes: FlickerEntry[] }
interface LandmarkDef  { id: string; name: string; x: number; z: number; h: number; color: number; cap: number; route: string | null; msg: string | null }
interface BuildingType { color: number; roofColor: number; minH: number; maxH: number; minW: number; maxW: number; minD: number; maxD: number }
interface NearState    { lm: LandmarkDef | null; canEnter: boolean }
const NEUTRAL_JOYSTICK: DistrictJoystickInput = { x: 0, y: 0, magnitude: 0 };

function isSmallTouchPortrait(): boolean {
  if (typeof window === "undefined") return false;
  const touchCapable = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const smallestDimension = Math.min(window.innerWidth, window.innerHeight);
  return touchCapable && smallestDimension <= 520 && window.innerHeight > window.innerWidth;
}

// ─── Landmarks (fixed world positions) ────────────────────────────────────────
const LANDMARKS: LandmarkDef[] = [
  ...DISTRICT_LANDMARKS.map((landmark) => ({
    id: landmark.id,
    name: landmark.name,
    x: landmark.x,
    z: landmark.z,
    h: landmark.height,
    color: landmark.buildingColor,
    cap: landmark.beaconColor,
    route: landmark.action === "route" ? landmark.route : null,
    msg: landmark.action === "locked" ? "Metro access locked" : null,
  })),
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

function supportsWorldWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function initialWorldSave(navigation: DistrictNavigationSave): WorldSave {
  const stored = loadWorldState();
  const position = isSafeDistrictPosition({ x: stored?.playerX, z: stored?.playerZ })
    ? { x: stored!.playerX, z: stored!.playerZ }
    : DEFAULT_DISTRICT_NAVIGATION.position;
  const validStoredCamera = stored &&
    [stored.angle, stored.camYaw, stored.camPitch, stored.camDist].every(Number.isFinite);
  return {
    ...DEFAULT_WORLD_SAVE,
    ...(validStoredCamera ? stored : {}),
    playerX: navigation.position.x ?? position.x,
    playerZ: navigation.position.z ?? position.z,
    angle: validStoredCamera ? stored!.angle : DEFAULT_WORLD_SAVE.angle,
    camYaw: validStoredCamera ? stored!.camYaw : DEFAULT_WORLD_SAVE.camYaw,
    camPitch: validStoredCamera ? Math.max(-0.4, Math.min(1, stored!.camPitch)) : DEFAULT_WORLD_SAVE.camPitch,
    camDist: validStoredCamera ? Math.max(4, Math.min(22, stored!.camDist)) : DEFAULT_WORLD_SAVE.camDist,
    nearId: typeof stored?.nearId === "string" && DISTRICT_LANDMARKS.some((landmark) => landmark.id === stored.nearId)
      ? stored.nearId
      : null,
  };
}

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

// ─── Phase 2 helper: window grids on building faces ───────────────────────────
// Adds lit/unlit window panels to front & back faces of a building.
// Uses unique geo+mat per window so chunk disposal is clean.
function createWindowGrid(
  objs: THREE.Object3D[], disp: Disposable[],
  bx: number, bz: number, bw: number, bh: number, bd: number,
  rng: () => number, flicker: FlickerEntry[],
) {
  const rowH    = 1.75;
  const startY  = 1.4;
  const nCols   = Math.max(1, Math.floor((bw - 0.6) / 1.35));
  const nRows   = Math.max(1, Math.floor((bh - startY - 0.5) / rowH));
  if (nCols < 1 || nRows < 1 || bw < 3) return;

  const colStep = bw / nCols;
  // Front face (z=bz, face toward -Z) and back face (z=bz+bd, toward +Z)
  for (let fi = 0; fi < 2; fi++) {
    const faceZ = fi === 0 ? bz - 0.03 : bz + bd + 0.03;
    const rotY  = fi === 0 ? Math.PI : 0;
    for (let row = 0; row < nRows; row++) {
      for (let col = 0; col < nCols; col++) {
        const isLit     = rng() < 0.30;
        const doFlicker = isLit && rng() < 0.08;
        const winX      = bx + (col + 0.5) * colStep;
        const winY      = startY + row * rowH;
        const wGeo      = new THREE.PlaneGeometry(colStep * 0.55, rowH * 0.55);
        let   wMat: THREE.MeshBasicMaterial;
        if (doFlicker) {
          const c = rng() < 0.5 ? 0xffd36b : 0xb8d6ff;
          wMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 1 });
          disp.push({ geo: wGeo, mat: wMat });
          const w = new THREE.Mesh(wGeo, wMat);
          w.position.set(winX, winY, faceZ);
          w.rotation.y = rotY;
          objs.push(w);
          flicker.push({ mesh: w, phase: rng() * Math.PI * 2, speed: 1.5 + rng() * 5 });
        } else {
          const litC = rng() < 0.55 ? 0xffe880 : 0xc8deff;
          wMat = new THREE.MeshBasicMaterial({ color: isLit ? litC : 0x10140f });
          disp.push({ geo: wGeo, mat: wMat });
          const w = new THREE.Mesh(wGeo, wMat);
          w.position.set(winX, winY, faceZ);
          w.rotation.y = rotY;
          objs.push(w);
        }
      }
    }
  }
}

// ─── Phase 2 helper: road markings ────────────────────────────────────────────
// Dashed center lines, crosswalk stripes near the chunk intersection corner.
function createRoadMarkings(
  objs: THREE.Object3D[], disp: Disposable[],
  wx: number, wz: number, rng: () => number,
) {
  function mkFlat(geo: THREE.BufferGeometry, color: number): THREE.Mesh {
    const mat = new THREE.MeshBasicMaterial({ color });
    disp.push({ geo, mat });
    const m = new THREE.Mesh(geo, mat);
    objs.push(m);
    return m;
  }
  const MY = RY + 0.014; // just above road surface

  // Dashed center line — north road (runs east-west at z = wz+CS)
  const dashW = 2.8, dashGap = 3.0;
  for (let lx = wx + 8; lx < wx + CS - 8; lx += dashW + dashGap) {
    const m = mkFlat(new THREE.BoxGeometry(dashW, 0.01, 0.20), 0xd7c77a);
    m.position.set(lx + dashW / 2, MY, wz + CS);
  }
  // Dashed center line — east road (runs north-south at x = wx+CS)
  for (let lz = wz + 8; lz < wz + CS - 8; lz += dashW + dashGap) {
    const m = mkFlat(new THREE.BoxGeometry(0.20, 0.01, dashW), 0xd7c77a);
    m.position.set(wx + CS, MY, lz + dashW / 2);
  }

  // Crosswalk at intersection corner (probabilistic)
  if (rng() > 0.40) {
    const sw = 0.55, ns = 5;
    for (let s = 0; s < ns; s++) {
      const m1 = mkFlat(new THREE.BoxGeometry(sw, 0.01, RW * 0.65), 0xd8d8c8);
      m1.position.set(wx + CS - RW / 2 - SW - 1.2 - s * (sw + 0.35), MY, wz + CS);
      const m2 = mkFlat(new THREE.BoxGeometry(RW * 0.65, 0.01, sw), 0xd8d8c8);
      m2.position.set(wx + CS, MY, wz + CS - RW / 2 - SW - 1.2 - s * (sw + 0.35));
    }
  }
}

// ─── Phase 2 helper: street props ─────────────────────────────────────────────
// Low-poly dumpsters, benches, traffic lights, and electrical boxes.
function createStreetProps(
  objs: THREE.Object3D[], disp: Disposable[],
  wx: number, wz: number, rng: () => number, distIdx: number,
) {
  function mkP(geo: THREE.BufferGeometry, color: number): THREE.Mesh {
    const mat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color });
    disp.push({ geo, mat });
    const m = new THREE.Mesh(geo, mat);
    objs.push(m);
    return m;
  }
  const sideZ = wz + CS - RW / 2 - SW - 0.6; // north sidewalk inner edge
  const count = 1 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i++) {
    const px  = wx + 10 + rng() * (CS - 20);
    const roll = rng();

    if (roll < 0.22) {
      // Dumpster
      const b = mkP(new THREE.BoxGeometry(1.4, 0.9, 0.65), 0x25351f);
      b.position.set(px, 0.45, sideZ);
      const lid = mkP(new THREE.BoxGeometry(1.44, 0.08, 0.68), 0x1e2c18);
      lid.position.set(px, 0.94, sideZ);
    } else if (roll < 0.44) {
      // Bench — seat + two blocky legs
      const seat = mkP(new THREE.BoxGeometry(1.15, 0.08, 0.38), 0x2e241a);
      seat.position.set(px, 0.48, sideZ);
      const lL = mkP(new THREE.BoxGeometry(0.09, 0.48, 0.38), 0x241c14);
      lL.position.set(px - 0.50, 0.24, sideZ);
      const lR = mkP(new THREE.BoxGeometry(0.09, 0.48, 0.38), 0x241c14);
      lR.position.set(px + 0.50, 0.24, sideZ);
    } else if (roll < 0.62) {
      // Traffic light — pole + signal box
      const pole = mkP(new THREE.BoxGeometry(0.10, 4.2, 0.10), 0x1a1a1a);
      pole.position.set(px, 2.1, sideZ);
      const box = mkP(new THREE.BoxGeometry(0.30, 0.80, 0.30), 0x111111);
      box.position.set(px, 4.4, sideZ);
      // Red signal light (emissive dot)
      const rGeo = new THREE.BoxGeometry(0.14, 0.14, 0.05);
      const rMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
      disp.push({ geo: rGeo, mat: rMat });
      const red = new THREE.Mesh(rGeo, rMat);
      red.position.set(px, 4.62, sideZ - 0.18);
      objs.push(red);
    } else if (roll < 0.78) {
      // Electrical box
      const box = mkP(new THREE.BoxGeometry(0.55, 1.05, 0.32), 0x26302a);
      box.position.set(px, 0.52, sideZ);
    }
    // roll ≥ 0.78 → empty spot (natural variation)
  }

  // Phone booth in commercial/residential districts
  if ((distIdx === 1 || distIdx === 3) && rng() > 0.60) {
    const bx2 = wx + 18 + rng() * (CS - 36);
    const booth = mkP(new THREE.BoxGeometry(0.85, 2.3, 0.85), 0x381818);
    booth.position.set(bx2, 1.15, sideZ + 0.15);
  }
}

// ─── Phase 2 helper: canvas-texture billboard ─────────────────────────────────
// Flat plane with a canvas-drawn text label; post rises from ground.
const BILLBOARD_LABELS = ["VANTA", "WIRELINE", "VAULT", "PAIN.0", "BLACK INDEX", "FRACT"];

function createBillboard(
  objs: THREE.Object3D[], disp: Disposable[],
  x: number, y: number, z: number, rotY: number, label: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#050e08";
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = "#3a5c30"; ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, 250, 90);
  ctx.font = "bold 28px 'Courier New',monospace";
  ctx.fillStyle = "#9cff66";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, 128, 48);
  const tex  = new THREE.CanvasTexture(canvas);
  const bGeo = new THREE.PlaneGeometry(3.8, 1.4);
  const bMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
  disp.push({ geo: bGeo, mat: bMat });
  const board = new THREE.Mesh(bGeo, bMat);
  board.position.set(x, y, z); board.rotation.y = rotY;
  objs.push(board);
  // Vertical post
  const pGeo = new THREE.BoxGeometry(0.12, y, 0.12);
  const pMat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0x2a2a2a });
  disp.push({ geo: pGeo, mat: pMat });
  const post = new THREE.Mesh(pGeo, pMat);
  post.position.set(x, y / 2, z);
  objs.push(post);
}

// ─── Phase 2 helper: humanoid player from block primitives ────────────────────
// Returns a THREE.Group (pivot at feet, y=0). Movement/rotation same as cube.
function createHumanoidPlayer(disp: Disposable[]): THREE.Group {
  const g = new THREE.Group();
  function part(geo: THREE.BufferGeometry, color: number): THREE.Mesh {
    const mat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color });
    disp.push({ geo, mat });
    return new THREE.Mesh(geo, mat);
  }
  // Legs  (y 0.00 → 0.78)
  const legL = part(new THREE.BoxGeometry(0.24, 0.78, 0.24), 0x111111);
  legL.position.set(-0.17, 0.39, 0);
  const legR = part(new THREE.BoxGeometry(0.24, 0.78, 0.24), 0x111111);
  legR.position.set( 0.17, 0.39, 0);
  // Torso (y 0.78 → 1.62)
  const torso = part(new THREE.BoxGeometry(0.60, 0.84, 0.34), 0x20251b);
  torso.position.set(0, 1.20, 0);
  // Arms  (y 0.86 → 1.50)
  const armL = part(new THREE.BoxGeometry(0.20, 0.64, 0.20), 0x111111);
  armL.position.set(-0.40, 1.20, 0);
  const armR = part(new THREE.BoxGeometry(0.20, 0.64, 0.20), 0x111111);
  armR.position.set( 0.40, 1.20, 0);
  // Head  (y 1.62 → 2.10)
  const head = part(new THREE.BoxGeometry(0.44, 0.48, 0.42), 0x8a735c);
  head.position.set(0, 1.86, 0);
  // Direction indicator — purple dot on front face
  const nGeo = new THREE.BoxGeometry(0.12, 0.12, 0.10);
  const nMat = new THREE.MeshToonMaterial({ gradientMap: TOON_MAP, color: 0xa855f7 });
  disp.push({ geo: nGeo, mat: nMat });
  const nose = new THREE.Mesh(nGeo, nMat);
  nose.position.set(0, 1.80, -0.27);
  g.add(legL, legR, torso, armL, armR, head, nose);
  return g;
}

// ─── Chunk builder ─────────────────────────────────────────────────────────────
// Returns objects NOT yet added to scene — caller adds them.
function buildChunk(cx: number, cz: number): ChunkData {
  const rng           = seededRng(chunkSeed(cx, cz));
  const objs: THREE.Object3D[] = [];
  const disp: Disposable[]     = [];
  const flickerMeshes: FlickerEntry[] = []; // Phase 2: animated window flicker

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

  // ── Phase 2: road markings (lane dashes + crosswalk) ─────────────────────
  createRoadMarkings(objs, disp, wx, wz, rng);

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

        // ── Phase 2: window grid on building faces ──────────────────────────
        createWindowGrid(objs, disp, bx, bz, bw, bh, bd, rng, flickerMeshes);

        // ── Phase 2: occasional billboard on taller buildings ───────────────
        if (bh > 10 && rng() > 0.78) {
          const label  = BILLBOARD_LABELS[Math.floor(rng() * BILLBOARD_LABELS.length)];
          const bbY    = bh - 0.8;
          const bbFace = rng() < 0.5 ? bz - 0.15 : bz + bd + 0.15;
          const bbRot  = rng() < 0.5 ? 0 : Math.PI;
          createBillboard(objs, disp, bx + bw / 2, bbY, bbFace, bbRot, label);
        }
      }
    }
  }

  // ── Phase 2: street props along north sidewalk ──────────────────────────
  createStreetProps(objs, disp, wx, wz, rng, distIdx);

  return { key: `${cx},${cz}`, cx, cz, objects: objs, disposables: disp, flickerMeshes };
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

    if (lm.id === "fractured-godhead-portal") {
      const arrivalPad = mk(
        new THREE.CylinderGeometry(13, 13, 0.08, 40),
        new THREE.MeshBasicMaterial({ color: 0x6e3aa0, transparent: true, opacity: 0.24 }),
      );
      arrivalPad.position.set(lm.x, 0.06, lm.z);
      const padRing = mk(
        new THREE.TorusGeometry(12.5, 0.18, 6, 48),
        new THREE.MeshBasicMaterial({ color: 0xc09aff, transparent: true, opacity: 0.8 }),
      );
      padRing.rotation.x = Math.PI / 2;
      padRing.position.set(lm.x, 0.18, lm.z);
      const portalFace = mk(
        new THREE.CircleGeometry(4.25, 40),
        new THREE.MeshBasicMaterial({ color: 0x7e45b2, transparent: true, opacity: 0.38, side: THREE.DoubleSide }),
      );
      portalFace.position.set(lm.x, 6, lm.z + 3.9);
      const portalRim = mk(
        new THREE.TorusGeometry(4.55, 0.42, 10, 40),
        new THREE.MeshBasicMaterial({ color: 0xc19aff, transparent: true, opacity: 0.95 }),
      );
      portalRim.position.set(lm.x, 6, lm.z + 4.05);
    }
  }

  return { objects, disposables, beacons };
}

// ─── Error boundary ────────────────────────────────────────────────────────────
class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message ?? String(e) }; }
  componentDidCatch(e: Error) {
    console.warn("[Vanta City] WebGL scene unavailable; switching to the district map.", e.message);
    this.props.onError();
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

// ─── Scene component ───────────────────────────────────────────────────────────
// All THREE.js objects are created imperatively (useEffect + scene.add) to avoid
// the R3F v8 / three@0.169.0 applyProps crash.
interface CitySceneProps {
  onNear:          (s: NearState) => void;
  onEnter:         (route: string) => void;
  onOpenHubMenu:   () => void;
  playerPosRef:    React.MutableRefObject<{ x: number; z: number; angle: number }>;
  touchAxesRef:    React.MutableRefObject<DistrictJoystickInput>;
  gamePausedRef:   React.MutableRefObject<boolean>;
  chatInputFocusedRef: React.MutableRefObject<boolean>;
  worldSaveRef:    React.MutableRefObject<WorldSave>;
}

function CityScene({
  onNear,
  onEnter,
  onOpenHubMenu,
  playerPosRef,
  touchAxesRef,
  gamePausedRef,
  chatInputFocusedRef,
  worldSaveRef,
}: CitySceneProps) {
  const { scene } = useThree();

  // Player / movement
  const playerRef      = useRef<THREE.Object3D | null>(null);
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
  const onNearRef          = useRef(onNear);
  const onEnterRef         = useRef(onEnter);
  const onOpenHubMenuRef   = useRef(onOpenHubMenu);
  useEffect(() => { onNearRef.current        = onNear;         }, [onNear]);
  useEffect(() => { onEnterRef.current       = onEnter;        }, [onEnter]);
  useEffect(() => { onOpenHubMenuRef.current = onOpenHubMenu;  }, [onOpenHubMenu]);

  // ── One-time scene setup ────────────────────────────────────────────────────
  useEffect(() => {
    const allObjs: THREE.Object3D[] = [];
    const allDisp: Disposable[]     = [];

    // ── Phase 2: humanoid player (pivot at feet, y=0) ─────────────────────────
    const initSave = worldSaveRef.current;
    const player   = createHumanoidPlayer(allDisp);
    player.position.set(initSave.playerX, 0, initSave.playerZ);
    angleRef.current       = initSave.angle;
    camYawRef.current      = initSave.camYaw;
    camPitchRef.current    = initSave.camPitch;
    camDistRef.current     = initSave.camDist;
    // Force chunk reload at restored position
    playerChunkRef.current = { cx: 9999, cz: 9999 };
    allObjs.push(player);
    scene.add(player);
    playerRef.current = player;

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
      const target = e.target as HTMLElement | null;
      if (
        gamePausedRef.current ||
        chatInputFocusedRef.current ||
        target?.closest?.("input, textarea, select, [contenteditable='true'], [data-vault-radio], [data-vanta-district-chat]")
      ) return;
      keysRef.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      // E = enter landmark (never used for camera rotation)
      if (e.code === "KeyE" && enterIdRef.current) {
        const lm = LANDMARKS.find(l => l.id === enterIdRef.current);
        // Music Hub → open the destination menu (bedroom or releases)
        if (lm?.id === "music-hub") { onOpenHubMenuRef.current(); return; }
        if (lm?.route) onEnterRef.current(lm.route);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onWindowBlur = () => {
      keysRef.current.clear();
      touchAxesRef.current = NEUTRAL_JOYSTICK;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    window.addEventListener("blur",    onWindowBlur);

    // ── Mouse drag (camera yaw + pitch) ──────────────────────────────────────
    const PITCH_MIN = -Math.PI / 180 * 25;  // -25°
    const PITCH_MAX =  Math.PI / 180 * 55;  // +55°
    const DIST_MIN  = 4, DIST_MAX = 22;

    const onMouseDown  = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio], [data-district-touch-controls], [data-vanta-district-chat], [data-vanta-city-controls]")) return;
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
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio], [data-district-touch-controls], [data-vanta-district-chat], [data-vanta-city-controls]")) return;
      camDistRef.current = Math.max(DIST_MIN, Math.min(DIST_MAX,
        camDistRef.current + e.deltaY * 0.02,
      ));
    };

    // ── Touch drag (camera yaw + pitch) ──────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio], [data-district-touch-controls], [data-vanta-district-chat], [data-vanta-city-controls]")) return;
      isDraggingRef.current = true;
      lastPtrXRef.current = e.touches[0].clientX;
      lastPtrYRef.current = e.touches[0].clientY;
    };
    const onTouchMove  = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio], [data-district-touch-controls], [data-vanta-district-chat], [data-vanta-city-controls]")) return;
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
    window.addEventListener("touchcancel", onTouchEnd);

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
      window.removeEventListener("blur",       onWindowBlur);
      window.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mousemove",  onMouseMove);
      window.removeEventListener("mouseup",    onMouseUp);
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);

      playerRef.current  = null;
      beaconsRef.current = [];
      keysRef.current.clear();
      touchAxesRef.current = NEUTRAL_JOYSTICK;
    };
  }, [scene]);

  // ── Per-frame: movement + camera + chunks + proximity + beacons ─────────────
  useFrame((state, dt) => {
    const player = playerRef.current;
    if (!player) return;

    const safeDt = Math.min(dt, 0.05);
    if (gamePausedRef.current) {
      keysRef.current.clear();
      touchAxesRef.current = NEUTRAL_JOYSTICK;
      return;
    }
    const chatFocused = chatInputFocusedRef.current;
    const isDown = (code: string) => !chatFocused && keysRef.current.has(code);
    const axes = chatFocused ? NEUTRAL_JOYSTICK : touchAxesRef.current;
    const drive = Math.max(-1, Math.min(1,
      (isDown("KeyW") || isDown("ArrowUp") ? 1 : 0) -
      (isDown("KeyS") || isDown("ArrowDown") ? 1 : 0) -
      axes.y * axes.magnitude,
    ));
    const steering = Math.max(-1, Math.min(1,
      (isDown("KeyD") || isDown("ArrowRight") ? 1 : 0) -
      (isDown("KeyA") || isDown("ArrowLeft") ? 1 : 0) +
      axes.x * axes.magnitude,
    ));

    // Player rotation (WASD/arrows)
    angleRef.current -= steering * 2.2 * safeDt;

    // Camera orbit via keyboard: comma = orbit left, period = orbit right
    if (isDown("Comma"))  camYawRef.current -= CAM_ROT_SPD * safeDt;
    if (isDown("Period")) camYawRef.current += CAM_ROT_SPD * safeDt;

    const angle = angleRef.current;
    const fwdX  = -Math.sin(angle);
    const fwdZ  = -Math.cos(angle);

    // Player translate
    player.position.x += fwdX * 10 * safeDt * drive;
    player.position.z += fwdZ * 10 * safeDt * drive;
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

    // ── Phase 2: flickering window animation ─────────────────────────────────
    chunksRef.current.forEach(chunk => {
      for (const { mesh, phase, speed } of chunk.flickerMeshes) {
        (mesh.material as THREE.MeshBasicMaterial).opacity =
          0.15 + 0.85 * Math.abs(Math.sin(t * speed + phase));
      }
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
  const [mapOpen, setMapOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [rotateDevice, setRotateDevice] = useState(isSmallTouchPortrait);
  const [webglAvailable] = useState(() => supportsWorldWebGL());
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState("black-index");

  // Scene mode: city world or bedroom interior
  const [activeScene,   setActiveScene]   = useState<"city" | "bedroom">("city");
  const [bedroomPrompt, setBedroomPrompt] = useState<string | null>(null);

  const sessionWorldSave = loadWorldState();
  const legacyDestinationId = loadDistrictPlayerLocation()?.landmarkId ?? null;
  const storedNavigationSave = loadDistrictNavigationSave();
  const initialNavigationSave = storedNavigationSave ?? {
    ...DEFAULT_DISTRICT_NAVIGATION,
    position: isSafeDistrictPosition({ x: sessionWorldSave?.playerX, z: sessionWorldSave?.playerZ })
      ? { x: sessionWorldSave!.playerX, z: sessionWorldSave!.playerZ }
      : DEFAULT_DISTRICT_NAVIGATION.position,
    selectedDestinationId: legacyDestinationId,
  };
  const worldSaveRef = useRef<WorldSave>(initialWorldSave(initialNavigationSave));
  const navigationSaveRef = useRef<DistrictNavigationSave>(initialNavigationSave);
  const [navigationSave, setNavigationSave] = useState(initialNavigationSave);
  const playerPosRef = useRef<{ x: number; z: number; angle: number }>({
    x: worldSaveRef.current.playerX,
    z: worldSaveRef.current.playerZ,
    angle: worldSaveRef.current.angle,
  });
  const touchAxesRef = useRef<DistrictJoystickInput>({ ...NEUTRAL_JOYSTICK });
  const gamePausedRef = useRef(false);
  const chatInputFocusedRef = useRef(false);
  const chatRef = useRef<DistrictChatHandle | null>(null);
  const [liveRoute, setLiveRoute] = useState<DistrictRoute | null>(() =>
    initialNavigationSave.selectedDestinationId
      ? buildDistrictRoute(initialNavigationSave.position, initialNavigationSave.selectedDestinationId)
      : null,
  );
  const baseRouteRef = useRef<DistrictWorldPoint[] | null>(liveRoute?.points ?? null);

  useEffect(() => {
    const refreshOrientation = () => setRotateDevice(isSmallTouchPortrait());
    window.addEventListener("resize", refreshOrientation);
    window.addEventListener("orientationchange", refreshOrientation);
    window.visualViewport?.addEventListener("resize", refreshOrientation);
    refreshOrientation();
    return () => {
      window.removeEventListener("resize", refreshOrientation);
      window.removeEventListener("orientationchange", refreshOrientation);
      window.visualViewport?.removeEventListener("resize", refreshOrientation);
    };
  }, []);

  const persistNavigation = useCallback((next: DistrictNavigationSave) => {
    navigationSaveRef.current = next;
    setNavigationSave(next);
    saveDistrictNavigationSave(next);
  }, []);

  const rememberDestination = useCallback((landmarkId: string) => {
    saveDistrictPlayerLocation(landmarkId);
  }, []);

  const handleNear = useCallback((s: NearState) => {
    setNear(s);
    worldSaveRef.current.nearId = s.lm?.id ?? null;
    if (s.canEnter && s.lm) {
      const unlocked = unlockDistrictDestination(navigationSaveRef.current, s.lm.id);
      if (unlocked !== navigationSaveRef.current &&
        unlocked.unlockedDestinationIds.length !== navigationSaveRef.current.unlockedDestinationIds.length) {
        persistNavigation(unlocked);
        chatRef.current?.system(`${s.lm.name} discovered. Fast travel is now available from the District map.`);
      }
      chatRef.current?.system(`Arrived at ${s.lm.name}.`);
    }
  }, [persistNavigation]);

  const handleEnter = useCallback((route: string) => {
    const nearby = DISTRICT_LANDMARKS.find((landmark) =>
      landmark.id === worldSaveRef.current.nearId && landmark.route === route && landmark.action !== "locked"
    );
    const routeMatch = DISTRICT_LANDMARKS.find((landmark) =>
      landmark.route === route && landmark.action !== "locked"
    );
    if (nearby ?? routeMatch) {
      const destination = nearby ?? routeMatch!;
      rememberDestination(destination.id);
      queueDistrictChatSystemMessage(`Leaving Vanta District for ${destination.name}.`);
    }
    const position = { x: playerPosRef.current.x, z: playerPosRef.current.z };
    if (isSafeDistrictPosition(position)) {
      const next = { ...navigationSaveRef.current, position };
      navigationSaveRef.current = next;
      saveDistrictNavigationSave(next);
    }
    saveWorldState({ ...worldSaveRef.current });
    navigate(route);
  }, [navigate, rememberDestination]);

  // Hub menu — shown when player presses E at MUSIC HUB
  const [hubMenuOpen,    setHubMenuOpen]    = useState(false);
  const [hubSelected,    setHubSelected]    = useState(0);    // 0=releases, 1=bedroom

  useEffect(() => {
    const paused = rotateDevice || hubMenuOpen;
    gamePausedRef.current = paused;
    if (paused || mapOpen) {
      touchAxesRef.current = { ...NEUTRAL_JOYSTICK };
      chatInputFocusedRef.current = false;
    }
  }, [rotateDevice, hubMenuOpen, mapOpen]);

  const handleOpenHubMenu = useCallback(() => {
    setHubMenuOpen(true);
    setHubSelected(0);
  }, []);

  const openDistrictMap = useCallback(() => {
    setChatOpen(false);
    chatInputFocusedRef.current = false;
    touchAxesRef.current = { ...NEUTRAL_JOYSTICK };
    saveWorldState({ ...worldSaveRef.current });
    const position = { x: playerPosRef.current.x, z: playerPosRef.current.z };
    if (isSafeDistrictPosition(position)) {
      const next = { ...navigationSaveRef.current, position };
      navigationSaveRef.current = next;
      saveDistrictNavigationSave(next);
    }
    setSelectedMapId(
      navigationSaveRef.current.selectedDestinationId ??
      worldSaveRef.current.nearId ??
      "black-index",
    );
    setMapOpen(true);
  }, []);

  const handleSetDestination = useCallback((id: string) => {
    const destination = DISTRICT_LANDMARKS.find((landmark) => landmark.id === id);
    if (!destination || destination.action === "locked") return;
    const next = { ...navigationSaveRef.current, selectedDestinationId: destination.id };
    persistNavigation(next);
    setSelectedMapId(destination.id);
    const route = buildDistrictRoute(playerPosRef.current, destination.id);
    baseRouteRef.current = route?.points ?? null;
    setLiveRoute(route);
    queueDistrictChatSystemMessage(`Objective set: ${destination.name}. Follow the route on your District map.`);
  }, [persistNavigation]);

  const handleFastTravel = useCallback((id: string) => {
    if (!isFastTravelEligible(id, navigationSaveRef.current.unlockedDestinationIds)) return;
    const spawn = getDistrictFastTravelSpawn(id);
    if (!spawn) return;
    worldSaveRef.current = {
      ...worldSaveRef.current,
      playerX: spawn.position.x,
      playerZ: spawn.position.z,
      angle: spawn.angle,
      nearId: id,
    };
    playerPosRef.current = { ...spawn.position, angle: spawn.angle };
    const next = {
      ...navigationSaveRef.current,
      position: spawn.position,
      selectedDestinationId: id,
    };
    persistNavigation(next);
    const route = buildDistrictRoute(spawn.position, id);
    baseRouteRef.current = route?.points ?? null;
    setLiveRoute(route);
    setSelectedMapId(id);
    saveWorldState({ ...worldSaveRef.current });
    const destination = DISTRICT_LANDMARKS.find((landmark) => landmark.id === id);
    queueDistrictChatSystemMessage(`Fast traveled to ${destination?.name ?? "District destination"}.`);
  }, [persistNavigation]);

  const handleResetNavigation = useCallback(() => {
    resetDistrictNavigationSave();
    clearDistrictPlayerLocation();
    baseRouteRef.current = null;
    setLiveRoute(null);
    persistNavigation({ ...DEFAULT_DISTRICT_NAVIGATION });
    playerPosRef.current = { x: 0, z: 0, angle: 0 };
    worldSaveRef.current = { ...DEFAULT_WORLD_SAVE };
    saveWorldState({ ...DEFAULT_WORLD_SAVE });
    setSelectedMapId("black-index");
    queueDistrictChatSystemMessage("District navigation was reset to its default spawn.");
  }, [persistNavigation]);

  const handleHubSelect = useCallback((choice: number) => {
    setHubMenuOpen(false);
    rememberDestination("music-hub");
    if (choice === 0) {
      saveWorldState({ ...worldSaveRef.current });
      navigate("/releases");
    } else {
      saveWorldState({ ...worldSaveRef.current });
      setActiveScene("bedroom");
      setBedroomPrompt(null);
    }
  }, [navigate, rememberDestination]);

  // Keyboard nav inside hub menu
  useEffect(() => {
    if (!hubMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        setHubSelected(s => s === 0 ? 1 : 0);
      } else if (e.code === "Enter") {
        e.preventDefault();
        handleHubSelect(hubSelected);
      } else if (e.code === "Escape") {
        setHubMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hubMenuOpen, hubSelected, handleHubSelect]);

  // Called by VantaBedroomScene when E is pressed near the door
  const handleExitBedroom = useCallback(() => {
    setActiveScene("city");
    setBedroomPrompt(null);
  }, []);

  useEffect(() => {
    if (mapOpen || activeScene !== "city") return;
    let lastStoredAt = Date.now();
    const syncNavigation = () => {
      const position = { x: playerPosRef.current.x, z: playerPosRef.current.z };
      const destinationId = navigationSaveRef.current.selectedDestinationId;
      if (destinationId) {
        let baseRoute = baseRouteRef.current;
        if (!baseRoute || shouldRecalculateDistrictRoute(position, baseRoute)) {
          const recalculated = buildDistrictRoute(position, destinationId);
          baseRoute = recalculated?.points ?? null;
          baseRouteRef.current = baseRoute;
        }
        setLiveRoute(baseRoute ? trimDistrictRoute(baseRoute, position, destinationId) : null);
      }
      const now = Date.now();
      if (now - lastStoredAt >= 1000 && isSafeDistrictPosition(position)) {
        const next = { ...navigationSaveRef.current, position };
        navigationSaveRef.current = next;
        saveDistrictNavigationSave(next);
        lastStoredAt = now;
      }
    };
    const timer = window.setInterval(syncNavigation, 350);
    syncNavigation();
    return () => window.clearInterval(timer);
  }, [activeScene, mapOpen]);

  useEffect(() => {
    const onMapShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], button")) return;
      if (event.code === "KeyM" && !mapOpen) {
        event.preventDefault();
        openDistrictMap();
      } else if ((event.code === "Escape" || event.code === "KeyM") && mapOpen) {
        event.preventDefault();
        setMapOpen(false);
      }
    };
    window.addEventListener("keydown", onMapShortcut);
    return () => window.removeEventListener("keydown", onMapShortcut);
  }, [mapOpen, openDistrictMap]);

  const { lm, canEnter } = near;
  const inBedroom = activeScene === "bedroom";
  const contextLandmark = lm ? DISTRICT_LANDMARKS.find((landmark) => landmark.id === lm.id) ?? null : null;
  const contextActionLabel = inBedroom && bedroomPrompt
    ? bedroomPrompt.toLowerCase().includes("return")
      ? "RETURN TO VANTA CITY"
      : "TOGGLE RADIO"
    : !inBedroom && lm && canEnter
      ? contextLandmark?.action === "locked"
        ? `LOCKED · ${lm.name}`
        : contextLandmark?.actionLabel ?? `ENTER ${lm.name}`
      : null;
  const contextActionDisabled = !inBedroom && contextLandmark?.action === "locked";
  const handlePrimaryAction = () => {
    if (inBedroom && bedroomPrompt) {
      if (bedroomPrompt.toLowerCase().includes("return")) {
        handleExitBedroom();
      } else {
        window.dispatchEvent(new CustomEvent("vanta:toggleradio"));
      }
      return;
    }
    if (!lm || !canEnter || !contextLandmark) return;
    if (contextLandmark.action === "locked") {
      chatRef.current?.system(`${contextLandmark.name} remains locked.`);
      return;
    }
    if (contextLandmark.action === "music-hub") {
      handleOpenHubMenu();
      return;
    }
    if (contextLandmark.route) handleEnter(contextLandmark.route);
  };
  const handleJoystickChange = useCallback((input: DistrictJoystickInput) => {
    touchAxesRef.current = input;
  }, []);
  const handleChatFocus = useCallback((focused: boolean) => {
    chatInputFocusedRef.current = focused;
    if (focused) touchAxesRef.current = { ...NEUTRAL_JOYSTICK };
  }, []);

  const mapLocations = DISTRICT_LANDMARKS.map((landmark) => ({
    id: landmark.id,
    name: landmark.name,
    shortName: landmark.shortName,
    category: landmark.category,
    district: landmark.district,
    x: landmark.x,
    z: landmark.z,
    color: landmark.mapColor,
    description: landmark.description,
    status: landmark.status,
    actionLabel: landmark.actionLabel,
    locked: landmark.action === "locked",
  }));

  const mapFallbackActive = !webglAvailable || canvasFailed;
  if (mapOpen || mapFallbackActive) {
    return (
      <>
        <DistrictMapView
          locations={mapLocations}
          playerPosition={playerPosRef.current}
          playerDestinationId={navigationSave.selectedDestinationId}
          route={liveRoute}
          unlockedDestinationIds={navigationSave.unlockedDestinationIds}
          gameplayPaused={mapOpen || mapFallbackActive}
          selectedId={selectedMapId}
          onSelect={setSelectedMapId}
          onSetDestination={handleSetDestination}
          onFastTravel={handleFastTravel}
          onResetNavigation={handleResetNavigation}
          onClose={() => mapFallbackActive ? navigate("/worlds") : setMapOpen(false)}
        />
        <div hidden aria-hidden="true">
          <DistrictChat
            ref={chatRef}
            open={false}
            onToggle={() => undefined}
            onInputFocus={() => undefined}
            keyboardShortcutEnabled={false}
          />
        </div>
      </>
    );
  }

  return (
    <>
    <div className="vanta-world-surface">

      {/* ── HUD — top-left badge + controls ────────────────────────────────── */}
      <div className="vanta-city-hud" style={{
        position: "absolute", top: 16, left: 16, zIndex: 999,
        fontFamily: "monospace", fontSize: 11, pointerEvents: "none", letterSpacing: "0.08em",
      }}>
        {inBedroom ? (
          <>
            <div style={{ color: "#9cff66", background: "rgba(0,0,0,0.85)", border: "1px solid #9cff66", padding: "6px 14px", borderRadius: 4 }}>
              VANTA BEDROOM
            </div>
            <div className="vanta-city-hud__hints" style={{ color: "#4b5563", background: "rgba(0,0,0,0.6)", padding: "6px 14px", borderRadius: 4, marginTop: 6, fontSize: 9, lineHeight: "1.9" }}>
              WASD / ARROWS — move<br />
              DRAG — orbit camera<br />
              E — interact
            </div>
          </>
        ) : (
          <>
            <div style={{ color: "#a855f7", background: "rgba(0,0,0,0.8)", border: "1px solid #a855f7", padding: "6px 14px", borderRadius: 4 }}>
              VANTA CITY
            </div>
            <div className="vanta-city-hud__hints" style={{ color: "#4b5563", background: "rgba(0,0,0,0.6)", padding: "6px 14px", borderRadius: 4, marginTop: 6, fontSize: 9, lineHeight: "1.9" }}>
              WASD / ARROWS — move<br />
              DRAG — orbit + pitch camera<br />
              SCROLL — zoom in / out<br />
              , . — orbit left / right<br />
              E — enter landmark
            </div>
          </>
        )}
      </div>

      <div className="vanta-city-top-controls" data-vanta-city-controls="">
        <button
          type="button"
          data-testid="button-open-district-map"
          onClick={openDistrictMap}
          aria-label="Open the Vanta District map. Keyboard shortcut M."
        >MAP · M</button>
        <button
          type="button"
          data-testid="button-toggle-district-chat"
          onClick={() => setChatOpen((value) => !value)}
          aria-label={chatOpen ? "Close District chat" : `Open District chat${chatUnreadCount ? `, ${chatUnreadCount} unread` : ""}`}
          aria-expanded={chatOpen}
        >
          CHAT{chatUnreadCount > 0 ? ` · ${chatUnreadCount > 99 ? "99+" : chatUnreadCount}` : ""}
        </button>
      </div>

      {!inBedroom && !(canEnter && lm?.id === "fractured-godhead-portal") && (
        <button
          type="button"
          className="vanta-city-objective"
          onClick={() => {
            setSelectedMapId(navigationSave.selectedDestinationId ?? "black-index");
            openDistrictMap();
          }}
          aria-label={navigationSave.selectedDestinationId
            ? `Change current objective ${DISTRICT_LANDMARKS.find((landmark) => landmark.id === navigationSave.selectedDestinationId)?.name ?? ""}. ${liveRoute ? `${Math.round(liveRoute.distance)} meters remaining, ${liveRoute.direction}.` : ""}`
            : "Choose a District destination and set an objective"}
        >
          <span>CURRENT OBJECTIVE</span>
          <strong>
            {navigationSave.selectedDestinationId
              ? DISTRICT_LANDMARKS.find((landmark) => landmark.id === navigationSave.selectedDestinationId)?.shortName
              : "SELECT DESTINATION"}
          </strong>
          {liveRoute && <small>{Math.round(liveRoute.distance)} m · {liveRoute.direction}</small>}
        </button>
      )}

      <DistrictJoystick
        disabled={rotateDevice || hubMenuOpen}
        onChange={handleJoystickChange}
      />

      {contextActionLabel && (
        <button
          type="button"
          className={`vanta-city-context-action${chatOpen ? " is-chat-open" : ""}`}
          data-vanta-city-controls=""
          data-testid="button-context-action"
          disabled={contextActionDisabled}
          onClick={handlePrimaryAction}
          aria-label={contextActionDisabled ? `${contextActionLabel}. This location is locked.` : contextActionLabel}
        >{contextActionLabel}</button>
      )}

      {/* ── City: landmark name label (broad range) ────────────────────────── */}
      {!inBedroom && lm && !canEnter && (
        <div style={{
          position: "absolute", top: "18%", left: "50%", transform: "translateX(-50%)",
          color: "#94a3b8", fontFamily: "monospace", fontSize: 10,
          letterSpacing: "0.18em", zIndex: 999, pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {lm.name}
        </div>
      )}

      {/* ── City: proximity prompt (enter range) ────────────────────────────── */}
      {!inBedroom && lm && canEnter && (
        <div
          className={`vanta-city-arrival${lm.id === "fractured-godhead-portal" ? " is-portal" : ""}${chatOpen ? " is-chat-open" : ""}`}
          style={{ borderColor: `#${lm.cap.toString(16).padStart(6, "0")}` }}
        >
          {lm.id === "fractured-godhead-portal" ? (
            <>
              <strong>PORTAL ARRIVAL · E ENTER FRACTURED GODHEAD</strong>
              <button type="button" onClick={() => handleEnter("/godforsaken-paradise")}>
                CONTINUE TO GODFORSAKEN PARADISE
              </button>
            </>
          ) : lm.msg ? `! ${lm.msg}` : `[E]  Enter ${lm.name}`}
        </div>
      )}

      {/* ── Bedroom: interaction prompt (door / iPod) ─────────────────────── */}
      {inBedroom && bedroomPrompt && (
        <div className="vanta-bedroom-prompt" style={{
          position: "absolute", bottom: "28%", left: "50%", transform: "translateX(-50%)",
          background: "rgba(5,3,12,0.93)", border: "1px solid #9cff66",
          color: "#c4b5fd", fontFamily: "monospace", fontSize: 13,
          padding: "10px 26px", borderRadius: 4,
          letterSpacing: "0.1em", zIndex: 999, pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          {bedroomPrompt}
        </div>
      )}

      {/* ── Music Hub choice menu ────────────────────────────────────────────── */}
      {hubMenuOpen && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.72)",
          }}
          onClick={() => setHubMenuOpen(false)}
        >
          <div
            style={{
              background: "rgba(6,10,6,0.97)",
              border: "1px solid #9cff66",
              borderRadius: 6,
              padding: "32px 48px",
              fontFamily: "monospace",
              minWidth: 340,
              boxShadow: "0 0 50px rgba(156,255,102,0.07), 0 0 0 1px rgba(156,255,102,0.05)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ color: "#9cff66", fontSize: 14, letterSpacing: "0.24em", marginBottom: 4 }}>
              MUSIC HUB
            </div>
            <div style={{ color: "#4b5563", fontSize: 10, letterSpacing: "0.14em", marginBottom: 28 }}>
              Choose destination
            </div>

            {/* Choice 0 — Music Page */}
            <button
              data-testid="hub-choice-music-page"
              onClick={() => handleHubSelect(0)}
              onMouseEnter={() => setHubSelected(0)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: hubSelected === 0 ? "rgba(168,85,247,0.14)" : "transparent",
                border: hubSelected === 0 ? "1px solid #a855f7" : "1px solid rgba(255,255,255,0.06)",
                color: hubSelected === 0 ? "#c4b5fd" : "#6b7280",
                fontFamily: "monospace", fontSize: 12, letterSpacing: "0.14em",
                padding: "13px 18px", borderRadius: 4, marginBottom: 10,
                cursor: "pointer",
              }}
            >
              <span style={{ color: hubSelected === 0 ? "#a855f7" : "#374151", marginRight: 12, fontSize: 10 }}>01.</span>
              MUSIC PAGE
              <span style={{ color: "#4b5563", fontSize: 9, marginLeft: 10 }}>→ /releases</span>
            </button>

            {/* Choice 1 — Vanta Bedroom */}
            <button
              data-testid="hub-choice-vanta-bedroom"
              onClick={() => handleHubSelect(1)}
              onMouseEnter={() => setHubSelected(1)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: hubSelected === 1 ? "rgba(156,255,102,0.10)" : "transparent",
                border: hubSelected === 1 ? "1px solid #9cff66" : "1px solid rgba(255,255,255,0.06)",
                color: hubSelected === 1 ? "#d1fae5" : "#6b7280",
                fontFamily: "monospace", fontSize: 12, letterSpacing: "0.14em",
                padding: "13px 18px", borderRadius: 4, marginBottom: 26,
                cursor: "pointer",
              }}
            >
              <span style={{ color: hubSelected === 1 ? "#9cff66" : "#374151", marginRight: 12, fontSize: 10 }}>02.</span>
              VANTA BEDROOM
              <span style={{ color: "#4b5563", fontSize: 9, marginLeft: 10 }}>interior scene</span>
            </button>

            <div style={{ color: "#374151", fontSize: 9, letterSpacing: "0.1em" }}>
              ↑↓ NAVIGATE · ENTER CONFIRM · ESC CLOSE
            </div>
          </div>
        </div>
      )}

      {/* ── Mini-map HUD (city only) ────────────────────────────────────────── */}
      {!inBedroom && (
        <DistrictMinimap
          locations={mapLocations}
          playerPosRef={playerPosRef}
          playerDestinationId={navigationSave.selectedDestinationId}
          route={liveRoute}
          onOpenMap={openDistrictMap}
        />
      )}

      {/* ── Vault Radio HUD (always visible) ───────────────────────────────── */}
      <VaultRadio />

      <CanvasBoundary onError={() => setCanvasFailed(true)}>
        <Canvas
          style={{ width: "100%", height: "100%" }}
          camera={{ position: [0, 6, 10], fov: 60, near: 0.1, far: 2000 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) =>
            console.log("[Vanta City] Canvas ✓", gl.domElement.width, "×", gl.domElement.height)
          }
        >
          {activeScene === "city" ? (
            <CityScene
              onNear={handleNear}
              onEnter={handleEnter}
              onOpenHubMenu={handleOpenHubMenu}
              playerPosRef={playerPosRef}
              touchKeysRef={touchKeysRef}
              worldSaveRef={worldSaveRef}
            />
          ) : (
            <VantaBedroomScene
              onExitBedroom={handleExitBedroom}
              onPromptChange={setBedroomPrompt}
            />
          )}
          <PostFX />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
