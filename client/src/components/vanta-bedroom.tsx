// ─── Vanta Bedroom — interior scene for the World canvas ──────────────────────
// Early-2000s emo/shoegaze bedroom built from Three.js primitives.
// Mounted inside the same R3F Canvas as CityScene; scene swap approach.
//
// Room layout (origin = room center, floor at y=0):
//   10 wide (x: −5…+5) × 8 deep (z: −4…+4) × 3 tall
//   Door  → south wall  (z = +4), x = 0   → [E] return to city
//   Bed   → NE corner   (x ≈ +3, z ≈ −2.5)
//   CRT   → west wall   (x = −5, z ≈ −0.5)
//   Couch → SW area     (x ≈ −2.5, z ≈ +1)
//   Desk  → NW corner   (x ≈ −4, z ≈ −3.2)
//   iPod  → on desk     → [E] toggle radio

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Toon gradient (3-step, same steps as the city) ──────────────────────────
function mkToon(): THREE.DataTexture {
  const d = new Uint8Array([80, 160, 240]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.needsUpdate = true;
  return t;
}
const BTOON = mkToon();

// ─── Room constants ───────────────────────────────────────────────────────────
const RW = 10, RD = 8, RH = 3.0;
const HW = RW / 2, HD = RD / 2;

const DOOR_X = 0,   DOOR_Z = HD - 0.4;        // interaction near south wall
const IPOD_X = -3.8, IPOD_Z = -HD + 0.7;      // desk in NW
const INTERACT_R = 1.9;

const BOUND_X = 4.2, BOUND_Z = 3.7;           // movement clamp

const CAM_ROT_SPD = 1.4;
const PITCH_MIN = -0.25, PITCH_MAX = 0.9;
const DIST_MIN = 2.5,    DIST_MAX = 6.0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
type Disp = { geo: THREE.BufferGeometry; mat: THREE.Material };

function toon(
  objs: THREE.Object3D[], disp: Disp[],
  geo: THREE.BufferGeometry, color: number,
): THREE.Mesh {
  const mat = new THREE.MeshToonMaterial({ gradientMap: BTOON, color });
  disp.push({ geo, mat });
  const m = new THREE.Mesh(geo, mat);
  objs.push(m);
  return m;
}

function lam(
  objs: THREE.Object3D[], disp: Disp[],
  geo: THREE.BufferGeometry, color: number,
): THREE.Mesh {
  const mat = new THREE.MeshLambertMaterial({ color });
  disp.push({ geo, mat });
  const m = new THREE.Mesh(geo, mat);
  objs.push(m);
  return m;
}

// ─── Room geometry ────────────────────────────────────────────────────────────
function createBedroomRoom(objs: THREE.Object3D[], disp: Disp[]) {
  const wallC  = 0x1c2919;
  const floorC = 0x181014;
  const ceilC  = 0x161b14;

  // Floor
  const fl = lam(objs, disp, new THREE.PlaneGeometry(RW, RD), floorC);
  fl.rotation.x = -Math.PI / 2;

  // Ceiling
  const ce = lam(objs, disp, new THREE.PlaneGeometry(RW, RD), ceilC);
  ce.rotation.x = Math.PI / 2; ce.position.y = RH;

  // North wall (z = −HD, faces +Z toward player)
  const wN = lam(objs, disp, new THREE.PlaneGeometry(RW, RH), wallC);
  wN.position.set(0, RH / 2, -HD);

  // East wall (x = +HW, faces −X)
  const wE = lam(objs, disp, new THREE.PlaneGeometry(RD, RH), wallC);
  wE.position.set(HW, RH / 2, 0); wE.rotation.y = -Math.PI / 2;

  // West wall (x = −HW, faces +X)
  const wW = lam(objs, disp, new THREE.PlaneGeometry(RD, RH), wallC);
  wW.position.set(-HW, RH / 2, 0); wW.rotation.y = Math.PI / 2;

  // South wall — two panels flanking door + lintel above
  const doorW = 1.4, doorH = RH * 0.72;
  const panelW = (RW - doorW) / 2;
  const wSL = lam(objs, disp, new THREE.PlaneGeometry(panelW, RH), wallC);
  wSL.position.set(-panelW / 2 - doorW / 2, RH / 2, HD); wSL.rotation.y = Math.PI;
  const wSR = lam(objs, disp, new THREE.PlaneGeometry(panelW, RH), wallC);
  wSR.position.set(panelW / 2 + doorW / 2, RH / 2, HD);  wSR.rotation.y = Math.PI;
  const wST = lam(objs, disp, new THREE.PlaneGeometry(doorW, RH - doorH), wallC);
  wST.position.set(0, (doorH + RH) / 2, HD);              wST.rotation.y = Math.PI;

  // Door frame trim
  const dfC = 0x0d1210;
  const dfL = toon(objs, disp, new THREE.BoxGeometry(0.07, doorH, 0.06), dfC);
  dfL.position.set(-doorW / 2, doorH / 2, HD + 0.01);
  const dfR = toon(objs, disp, new THREE.BoxGeometry(0.07, doorH, 0.06), dfC);
  dfR.position.set( doorW / 2, doorH / 2, HD + 0.01);
  const dfTop = toon(objs, disp, new THREE.BoxGeometry(doorW + 0.07, 0.07, 0.06), dfC);
  dfTop.position.set(0, doorH, HD + 0.01);

  // Baseboard along walls
  const bbC = 0x202a1c;
  const bN = toon(objs, disp, new THREE.BoxGeometry(RW, 0.07, 0.05), bbC);
  bN.position.set(0, 0.035, -HD + 0.025);
  const bE = toon(objs, disp, new THREE.BoxGeometry(0.05, 0.07, RD), bbC);
  bE.position.set(HW - 0.025, 0.035, 0);
  const bW = toon(objs, disp, new THREE.BoxGeometry(0.05, 0.07, RD), bbC);
  bW.position.set(-HW + 0.025, 0.035, 0);

  // Floor rug (slightly lighter patch, center of room)
  const rug = lam(objs, disp, new THREE.PlaneGeometry(4.5, 3.0), 0x1e1520);
  rug.rotation.x = -Math.PI / 2; rug.position.set(-0.5, 0.005, 0.5);
}

// ─── Bedroom props ────────────────────────────────────────────────────────────
function createBedroomProps(objs: THREE.Object3D[], disp: Disp[]) {
  function t(geo: THREE.BufferGeometry, color: number) { return toon(objs, disp, geo, color); }

  // ── Bed (NE area) ──────────────────────────────────────────────────────────
  const bx = 3.2, bz = -2.5, bw = 3.4, bd = 2.2;
  t(new THREE.BoxGeometry(bw, 0.17, bd), 0x1a1208).position.set(bx, 0.085, bz);
  t(new THREE.BoxGeometry(bw - 0.2, 0.22, bd - 0.2), 0x282038).position.set(bx, 0.30, bz);
  // Plaid blanket (warm dark pattern — two overlapping boxes)
  t(new THREE.BoxGeometry(bw - 0.2, 0.11, bd * 0.6), 0x3a2040).position.set(bx, 0.435, bz + 0.35);
  t(new THREE.BoxGeometry(bw - 0.2, 0.04, bd * 0.6), 0x2a1a30).position.set(bx, 0.505, bz + 0.35);
  t(new THREE.BoxGeometry(bw * 0.55, 0.09, 0.42), 0x201c2a).position.set(bx, 0.435, bz - 0.75); // pillow
  t(new THREE.BoxGeometry(bw, 0.68, 0.09), 0x18100a).position.set(bx, 0.54, bz - bd / 2 - 0.045); // headboard

  // ── Couch (west-center, faces CRT) ───────────────────────────────────────
  const cx = -2.5, cz = 1.1;
  t(new THREE.BoxGeometry(1.9, 0.21, 0.88), 0x1a1028).position.set(cx, 0.285, cz);
  t(new THREE.BoxGeometry(1.9, 0.70, 0.13), 0x16082a).position.set(cx, 0.655, cz + 0.375);
  t(new THREE.BoxGeometry(0.13, 0.38, 0.88), 0x16082a).position.set(cx - 1.015, 0.415, cz);
  t(new THREE.BoxGeometry(0.13, 0.38, 0.88), 0x16082a).position.set(cx + 1.015, 0.415, cz);

  // ── Desk (NW corner) ──────────────────────────────────────────────────────
  const dx = -4.0, dz = -3.2;
  t(new THREE.BoxGeometry(1.9, 0.07, 0.80), 0x201808).position.set(dx, 0.825, dz);
  t(new THREE.BoxGeometry(0.07, 0.82, 0.07), 0x181208).position.set(dx - 0.90, 0.41, dz - 0.35);
  t(new THREE.BoxGeometry(0.07, 0.82, 0.07), 0x181208).position.set(dx + 0.90, 0.41, dz - 0.35);
  t(new THREE.BoxGeometry(0.07, 0.82, 0.07), 0x181208).position.set(dx - 0.90, 0.41, dz + 0.35);
  t(new THREE.BoxGeometry(0.07, 0.82, 0.07), 0x181208).position.set(dx + 0.90, 0.41, dz + 0.35);

  // iPod / music player on desk
  t(new THREE.BoxGeometry(0.22, 0.38, 0.06), 0xc8c8c8).position.set(dx - 0.3, 1.00, dz - 0.1);
  t(new THREE.BoxGeometry(0.14, 0.14, 0.03), 0x101820).position.set(dx - 0.3, 1.06, dz - 0.145);
  // Click wheel
  const wGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16);
  const wMat = new THREE.MeshToonMaterial({ gradientMap: BTOON, color: 0x888888 });
  disp.push({ geo: wGeo, mat: wMat });
  const wheel = new THREE.Mesh(wGeo, wMat);
  wheel.rotation.x = Math.PI / 2; wheel.position.set(dx - 0.3, 0.95, dz - 0.145);
  objs.push(wheel);

  // Small book stack on desk corner
  const bookColors = [0x3a1414, 0x14203a, 0x1a3014];
  for (let i = 0; i < 3; i++) {
    t(new THREE.BoxGeometry(0.22, 0.05, 0.30), bookColors[i]).position.set(dx + 0.55, 0.87 + i * 0.05, dz - 0.05);
  }

  // ── CRT TV on west wall ────────────────────────────────────────────────────
  const tvZ = -0.5;
  t(new THREE.BoxGeometry(0.42, 0.85, 0.42), 0x181818).position.set(-HW + 0.55, 0.425, tvZ);  // stand
  t(new THREE.BoxGeometry(0.25, 1.05, 1.35), 0x141414).position.set(-HW + 0.54, 1.375, tvZ);  // body
  t(new THREE.BoxGeometry(0.04, 0.82, 1.06), 0x0a1a0f).position.set(-HW + 0.41, 1.375, tvZ);  // screen
  // Control knobs
  t(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), 0x222222).position.set(-HW + 0.41, 1.72, tvZ + 0.56);

  // ── Dresser (east wall) ────────────────────────────────────────────────────
  t(new THREE.BoxGeometry(0.58, 1.18, 1.05), 0x1c1208).position.set(HW - 0.54, 0.59, -2.8);
  for (let i = 0; i < 3; i++) {
    t(new THREE.BoxGeometry(0.04, 0.04, 0.04), 0x443830).position.set(HW - 0.27, 0.38 + i * 0.35, -2.8 - 0.525);
  }

  // ── Lamp (SW corner) ─────────────────────────────────────────────────────
  const lx = -4.0, lz = 2.6;
  t(new THREE.CylinderGeometry(0.04, 0.06, 1.55, 8), 0x2a2010).position.set(lx, 0.775, lz);
  t(new THREE.CylinderGeometry(0.27, 0.40, 0.28, 16, 1, true), 0xc89850).position.set(lx, 1.65, lz);
  t(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 12), 0x201808).position.set(lx, 0.03, lz);

  // ── Ceiling fan (room center) ────────────────────────────────────────────
  t(new THREE.CylinderGeometry(0.12, 0.10, 0.18, 12), 0x1a1a1a).position.set(0, RH - 0.09, 0);
  t(new THREE.BoxGeometry(0.06, 0.40, 0.06), 0x1a1a1a).position.set(0, RH - 0.39, 0);
  for (let b = 0; b < 4; b++) {
    const a = (b / 4) * Math.PI * 2;
    const blade = t(new THREE.BoxGeometry(1.1, 0.04, 0.28), 0x1c1208);
    blade.position.set(Math.cos(a) * 0.65, RH - 0.55, Math.sin(a) * 0.65);
    blade.rotation.y = a;
  }

  // ── Trash can (near desk) ────────────────────────────────────────────────
  t(new THREE.CylinderGeometry(0.16, 0.12, 0.40, 10), 0x202820).position.set(dx + 0.80, 0.20, dz + 0.55);
}

// ─── Bedroom posters ──────────────────────────────────────────────────────────
const POSTER_SPECS = [
  { x:  1.8, y: 1.85, z: -HD + 0.01, rotY: 0,           label: "PAIN.0",      fg: "#9cff66" },
  { x: -1.2, y: 1.85, z: -HD + 0.01, rotY: 0,           label: "WIRELINE",    fg: "#3b82f6" },
  { x:  HW - 0.01, y: 1.80, z: -1.2, rotY: -Math.PI/2,  label: "VANTA\nCOLD", fg: "#a855f7" },
  { x:  HW - 0.01, y: 1.80, z:  1.6, rotY: -Math.PI/2,  label: "FRACT",       fg: "#f59e0b" },
  { x: -0.6, y: 2.10, z: -HD + 0.01, rotY: 0,           label: "BLACK\nINDEX", fg: "#ec4899" },
];

function createBedroomPosters(objs: THREE.Object3D[], disp: Disp[]) {
  for (const s of POSTER_SPECS) {
    const cv = document.createElement("canvas");
    cv.width = 128; cv.height = 192;
    const ctx = cv.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, 128, 192);
    // Desaturated grainy look — diagonal noise lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = -128; i < 192; i += 5) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 192, 192); ctx.stroke(); }
    ctx.font = "bold 22px 'Courier New',monospace";
    ctx.fillStyle = s.fg;
    ctx.globalAlpha = 0.82;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = s.label.split("\n");
    lines.forEach((ln, i) => ctx.fillText(ln, 64, 96 + (i - (lines.length - 1) / 2) * 28));
    ctx.globalAlpha = 1;
    const tex  = new THREE.CanvasTexture(cv);
    const pGeo = new THREE.PlaneGeometry(0.62, 0.94);
    const pMat = new THREE.MeshBasicMaterial({ map: tex });
    disp.push({ geo: pGeo, mat: pMat });
    const m = new THREE.Mesh(pGeo, pMat);
    m.position.set(s.x, s.y, s.z); m.rotation.y = s.rotY;
    objs.push(m);
  }
}

// ─── Bedroom lighting ─────────────────────────────────────────────────────────
interface BedroomLights { lamp: THREE.PointLight; crt: THREE.PointLight }

function createBedroomLighting(objs: THREE.Object3D[]): BedroomLights {
  // Dark warm ambient
  const amb = new THREE.AmbientLight(0x1a1610, 0.9);
  objs.push(amb);
  // Warm lamp glow (SW corner)
  const lamp = new THREE.PointLight(0xffb84a, 2.4, 8, 2);
  lamp.position.set(-4.0, 1.65, 2.6);
  objs.push(lamp);
  // CRT greenish glow
  const crt = new THREE.PointLight(0x30ff80, 0.9, 4.0, 2);
  crt.position.set(-HW + 0.6, 1.4, -0.5);
  objs.push(crt);
  // Very dim fill from door
  const fill = new THREE.DirectionalLight(0x1a2a18, 0.4);
  fill.position.set(0, 3, 5);
  objs.push(fill);
  return { lamp, crt };
}

// ─── Player (same block humanoid as city, local copy) ────────────────────────
function mkPlayer(disp: Disp[]): THREE.Group {
  const g = new THREE.Group();
  function p(geo: THREE.BufferGeometry, color: number): THREE.Mesh {
    const mat = new THREE.MeshToonMaterial({ gradientMap: BTOON, color });
    disp.push({ geo, mat });
    return new THREE.Mesh(geo, mat);
  }
  const lL = p(new THREE.BoxGeometry(0.24, 0.78, 0.24), 0x111111); lL.position.set(-0.17, 0.39, 0);
  const lR = p(new THREE.BoxGeometry(0.24, 0.78, 0.24), 0x111111); lR.position.set( 0.17, 0.39, 0);
  const to = p(new THREE.BoxGeometry(0.60, 0.84, 0.34), 0x20251b); to.position.set(0, 1.20, 0);
  const aL = p(new THREE.BoxGeometry(0.20, 0.64, 0.20), 0x111111); aL.position.set(-0.40, 1.20, 0);
  const aR = p(new THREE.BoxGeometry(0.20, 0.64, 0.20), 0x111111); aR.position.set( 0.40, 1.20, 0);
  const hd = p(new THREE.BoxGeometry(0.44, 0.48, 0.42), 0x8a735c); hd.position.set(0, 1.86, 0);
  const nG = new THREE.BoxGeometry(0.12, 0.12, 0.10);
  const nM = new THREE.MeshToonMaterial({ gradientMap: BTOON, color: 0xa855f7 });
  disp.push({ geo: nG, mat: nM });
  const ns = new THREE.Mesh(nG, nM); ns.position.set(0, 1.80, -0.27);
  g.add(lL, lR, to, aL, aR, hd, ns);
  return g;
}

// ─── VantaBedroomScene component ─────────────────────────────────────────────
export interface BedroomProps {
  onExitBedroom: () => void;
  onPromptChange: (prompt: string | null) => void;
}

export function VantaBedroomScene({ onExitBedroom, onPromptChange }: BedroomProps) {
  const { scene } = useThree();

  const playerRef     = useRef<THREE.Group | null>(null);
  const keysRef       = useRef<Set<string>>(new Set());
  const angleRef      = useRef(Math.PI);      // facing into room (north)
  const camYawRef     = useRef(0);
  const camPitchRef   = useRef(0.28);
  const camDistRef    = useRef(4.5);
  const camTargetRef  = useRef(new THREE.Vector3());
  const lampRef       = useRef<THREE.PointLight | null>(null);
  const crtRef        = useRef<THREE.PointLight | null>(null);
  const promptIdRef   = useRef<string | null>(null); // "door" | "ipod" | null
  const isDragging    = useRef(false);
  const lastPtrX      = useRef(0);
  const lastPtrY      = useRef(0);

  // Stable callback refs
  const onExitRef     = useRef(onExitBedroom);
  const onPromptRef   = useRef(onPromptChange);
  useEffect(() => { onExitRef.current   = onExitBedroom;  }, [onExitBedroom]);
  useEffect(() => { onPromptRef.current = onPromptChange; }, [onPromptChange]);

  useEffect(() => {
    const disp: Disp[]              = [];
    const allObjs: THREE.Object3D[] = [];

    // Atmosphere
    scene.background = new THREE.Color(0x100e0c);
    scene.fog = new THREE.Fog(0x100e0c, 5, 15);

    // Build room
    createBedroomRoom(allObjs, disp);
    createBedroomProps(allObjs, disp);
    createBedroomPosters(allObjs, disp);
    const lights = createBedroomLighting(allObjs);
    lampRef.current = lights.lamp;
    crtRef.current  = lights.crt;

    // Player — start near the door, facing north
    const player = mkPlayer(disp);
    player.position.set(0, 0, 3.0);
    allObjs.push(player);
    playerRef.current = player;

    for (const o of allObjs) scene.add(o);

    // ── Keyboard ───────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio]")) return;
      keysRef.current.add(e.code);
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyE") {
        const pid = promptIdRef.current;
        if (pid === "door") { onExitRef.current(); return; }
        if (pid === "ipod") {
          // Dispatch custom event — VaultRadio can listen or user can use HUD
          window.dispatchEvent(new CustomEvent("vanta:toggleradio"));
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const onBlur  = () => keysRef.current.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup",   onKeyUp);
    window.addEventListener("blur",    onBlur);

    // ── Mouse drag (camera orbit) ───────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.("[data-vault-radio]")) return;
      isDragging.current = true;
      lastPtrX.current = e.clientX; lastPtrY.current = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      camYawRef.current   -= (e.clientX - lastPtrX.current) * 0.004;
      camPitchRef.current += (e.clientY - lastPtrY.current) * 0.004;
      camPitchRef.current  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, camPitchRef.current));
      lastPtrX.current = e.clientX; lastPtrY.current = e.clientY;
    };
    const onMouseUp = () => { isDragging.current = false; };

    // Touch drag
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      isDragging.current = true;
      lastPtrX.current = e.touches[0].clientX; lastPtrY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || e.touches.length !== 1) return;
      camYawRef.current   -= (e.touches[0].clientX - lastPtrX.current) * 0.004;
      camPitchRef.current += (e.touches[0].clientY - lastPtrY.current) * 0.004;
      camPitchRef.current  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, camPitchRef.current));
      lastPtrX.current = e.touches[0].clientX; lastPtrY.current = e.touches[0].clientY;
    };
    const onTouchEnd = () => { isDragging.current = false; };

    const onWheel = (e: WheelEvent) => {
      camDistRef.current = Math.max(DIST_MIN, Math.min(DIST_MAX, camDistRef.current + e.deltaY * 0.012));
    };
    window.addEventListener("mousedown",  onMouseDown);
    window.addEventListener("mousemove",  onMouseMove);
    window.addEventListener("mouseup",    onMouseUp);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false });
    window.addEventListener("touchend",   onTouchEnd);
    window.addEventListener("wheel",      onWheel, { passive: true });

    return () => {
      for (const o of allObjs) scene.remove(o);
      for (const { geo, mat } of disp) { geo.dispose(); mat.dispose(); }
      playerRef.current = null;
      lampRef.current   = null;
      crtRef.current    = null;
      keysRef.current.clear();
      isDragging.current = false;
      promptIdRef.current = null;
      window.removeEventListener("keydown",    onKeyDown);
      window.removeEventListener("keyup",      onKeyUp);
      window.removeEventListener("blur",       onBlur);
      window.removeEventListener("mousedown",  onMouseDown);
      window.removeEventListener("mousemove",  onMouseMove);
      window.removeEventListener("mouseup",    onMouseUp);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      window.removeEventListener("touchend",   onTouchEnd);
      window.removeEventListener("wheel",      onWheel);
    };
  }, [scene]);

  useFrame((state, dt) => {
    const player = playerRef.current;
    if (!player) return;

    const keys   = keysRef.current;
    const safeDt = Math.min(dt, 0.05);

    // Rotation
    if (keys.has("KeyA") || keys.has("ArrowLeft"))  angleRef.current += 2.0 * safeDt;
    if (keys.has("KeyD") || keys.has("ArrowRight")) angleRef.current -= 2.0 * safeDt;

    if (keys.has("Comma"))  camYawRef.current -= CAM_ROT_SPD * safeDt;
    if (keys.has("Period")) camYawRef.current += CAM_ROT_SPD * safeDt;

    const angle = angleRef.current;
    const fwdX  = -Math.sin(angle);
    const fwdZ  = -Math.cos(angle);

    // Movement — clamped to room
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      player.position.x = Math.max(-BOUND_X, Math.min(BOUND_X, player.position.x + fwdX * 5 * safeDt));
      player.position.z = Math.max(-BOUND_Z, Math.min(BOUND_Z, player.position.z + fwdZ * 5 * safeDt));
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      player.position.x = Math.max(-BOUND_X, Math.min(BOUND_X, player.position.x - fwdX * 5 * safeDt));
      player.position.z = Math.max(-BOUND_Z, Math.min(BOUND_Z, player.position.z - fwdZ * 5 * safeDt));
    }
    player.rotation.y = angle;

    // Camera
    const totalYaw = angle + camYawRef.current;
    const pitch    = camPitchRef.current;
    const dist     = camDistRef.current;
    const hDist    = dist * Math.cos(pitch);
    const vOff     = dist * Math.sin(pitch) + 1.5;
    camTargetRef.current.set(
      player.position.x + Math.sin(totalYaw) * hDist,
      player.position.y + vOff,
      player.position.z + Math.cos(totalYaw) * hDist,
    );
    state.camera.position.lerp(camTargetRef.current, 0.1);
    state.camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

    // ── Interaction proximity ────────────────────────────────────────────
    const px = player.position.x, pz = player.position.z;
    let newId: string | null = null;
    if (Math.hypot(px - DOOR_X, pz - DOOR_Z) < INTERACT_R) newId = "door";
    else if (Math.hypot(px - IPOD_X, pz - IPOD_Z) < INTERACT_R) newId = "ipod";

    if (newId !== promptIdRef.current) {
      promptIdRef.current = newId;
      const label = newId === "door" ? "[E]  Return to Vanta City"
                  : newId === "ipod" ? "[E]  Toggle Radio"
                  : null;
      onPromptRef.current(label);
    }

    // ── Lamp flicker ──────────────────────────────────────────────────────
    const t = state.clock.elapsedTime;
    if (lampRef.current) {
      lampRef.current.intensity = 2.1 + 0.28 * Math.sin(t * 3.7) + 0.09 * Math.sin(t * 11.3);
    }

    // ── CRT glow pulse ────────────────────────────────────────────────────
    if (crtRef.current) {
      crtRef.current.intensity = 0.7 + 0.18 * Math.sin(t * 0.85) + 0.07 * Math.sin(t * 3.2);
    }
  });

  return null;
}
