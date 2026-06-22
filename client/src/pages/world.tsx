import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLocation } from "wouter";
import * as THREE from "three";

// ── Static city data (outside component — never recreated) ─────────────────────

interface BuildingDef { x: number; z: number; w: number; d: number; h: number; color: number }
const BUILDINGS: BuildingDef[] = [
  { x: -22, z: -22, w: 8,  d: 8,  h: 14, color: 0x1a1a2e },
  { x:  -5, z: -32, w: 6,  d: 10, h: 20, color: 0x16213e },
  { x:  18, z: -22, w: 7,  d: 7,  h: 11, color: 0x0f3460 },
  { x: -32, z:   5, w: 9,  d: 6,  h: 17, color: 0x1c1033 },
  { x:  32, z:   8, w: 8,  d: 6,  h:  9, color: 0x1a1a2e },
  { x: -22, z:  28, w: 8,  d: 8,  h: 22, color: 0x16213e },
  { x:  -5, z:  34, w: 6,  d: 9,  h: 13, color: 0x0f3460 },
  { x:  20, z:  28, w: 7,  d: 7,  h: 18, color: 0x1c1033 },
  { x: -48, z: -46, w: 11, d: 11, h: 26, color: 0x16213e },
  { x:  50, z: -46, w: 11, d: 11, h: 15, color: 0x1a1a2e },
  { x: -48, z:  48, w: 11, d: 11, h: 19, color: 0x0f3460 },
  { x:  52, z:  48, w: 12, d: 12, h: 24, color: 0x1c1033 },
];

// Road: w = PlaneGeometry first arg (X extent), d = second arg (Z extent)
interface RoadDef { w: number; d: number; px: number; pz: number }
const ROADS: RoadDef[] = [
  { w: 300, d: 8,   px:   0, pz:  0  }, // main E-W boulevard
  { w: 8,   d: 300, px:   0, pz:  0  }, // main N-S avenue
  { w: 300, d: 4,   px:   0, pz: 20  }, // secondary E-W
  { w: 4,   d: 300, px: -18, pz:  0  }, // secondary N-S
];

const TOWER_X      = 40;
const TOWER_Z      = -40;
const TOWER_H      = 36;
const ENTER_RADIUS = 18;   // units from tower to trigger prompt

// ── Error boundary ─────────────────────────────────────────────────────────────
class CanvasBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message ?? String(e) }; }
  componentDidCatch(e: Error) {
    console.error("[Vanta City] Canvas error:", e.message, "\n", e.stack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12, background: "#05030c", fontFamily: "monospace",
        }}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>VANTA CITY — RENDER ERROR</div>
          <div style={{
            fontSize: 10, color: "#f87171", background: "#1f0a0a",
            border: "1px solid #7f1d1d", padding: "6px 14px", borderRadius: 4,
            maxWidth: 500, textAlign: "center", wordBreak: "break-all",
          }}>
            {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Scene ──────────────────────────────────────────────────────────────────────
// Everything imperative (useEffect + scene.add) — avoids R3F applyProps crash
// with three@0.169.0 / fiber@8.18.0.
interface CitySceneProps {
  onNearTower: (near: boolean) => void;
  onEnterTower: () => void;
}

function CityScene({ onNearTower, onEnterTower }: CitySceneProps) {
  const { scene } = useThree();

  // Player movement refs
  const playerRef  = useRef<THREE.Mesh | null>(null);
  const keysRef    = useRef<Set<string>>(new Set());
  const angleRef   = useRef(0);
  const camTarget  = useRef(new THREE.Vector3(0, 6, 10));

  // Proximity state — only call onNearTower when the value changes
  const nearRef    = useRef(false);

  // Stable ref for onEnterTower so the keydown closure never goes stale
  const onEnterRef = useRef(onEnterTower);
  useEffect(() => { onEnterRef.current = onEnterTower; }, [onEnterTower]);

  // ── Build scene ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const disposables: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = [];
    const objects: THREE.Object3D[] = [];

    function add(geo: THREE.BufferGeometry, mat: THREE.Material, mesh: THREE.Mesh) {
      disposables.push({ geo, mat });
      objects.push(mesh);
      scene.add(mesh);
      return mesh;
    }

    // Ground
    const gGeo = new THREE.PlaneGeometry(400, 400);
    const gMat = new THREE.MeshBasicMaterial({ color: 0x080810 });
    const ground = new THREE.Mesh(gGeo, gMat);
    ground.rotation.x = -Math.PI / 2;
    add(gGeo, gMat, ground);

    // Grid
    const grid = new THREE.GridHelper(400, 80, 0x1c1c3a, 0x111128);
    grid.position.y = 0.01;
    objects.push(grid);
    scene.add(grid);

    // Roads (slightly above ground to avoid z-fighting)
    for (const r of ROADS) {
      const rGeo = new THREE.PlaneGeometry(r.w, r.d);
      const rMat = new THREE.MeshBasicMaterial({ color: 0x111119 });
      const road  = new THREE.Mesh(rGeo, rMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(r.px, 0.02, r.pz);
      add(rGeo, rMat, road);
    }

    // Buildings
    for (const b of BUILDINGS) {
      const bGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bMat = new THREE.MeshBasicMaterial({ color: b.color });
      const building = new THREE.Mesh(bGeo, bMat);
      building.position.set(b.x, b.h / 2, b.z);
      add(bGeo, bMat, building);

      // Thin bright edge strip on top of each building
      const topGeo = new THREE.BoxGeometry(b.w, 0.15, b.d);
      const topMat = new THREE.MeshBasicMaterial({ color: 0x2a2a5a });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.set(b.x, b.h + 0.075, b.z);
      add(topGeo, topMat, top);
    }

    // ── Black Index Tower ────────────────────────────────────────────────────
    // Main shaft
    const tGeo = new THREE.BoxGeometry(6, TOWER_H, 6);
    const tMat = new THREE.MeshBasicMaterial({ color: 0x0a0014 });
    const tower = new THREE.Mesh(tGeo, tMat);
    tower.position.set(TOWER_X, TOWER_H / 2, TOWER_Z);
    add(tGeo, tMat, tower);

    // Glowing cap (bright purple — acts as a beacon)
    const capGeo = new THREE.BoxGeometry(5, 4, 5);
    const capMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(TOWER_X, TOWER_H + 2, TOWER_Z);
    add(capGeo, capMat, cap);

    // Narrow spire above cap
    const spireGeo = new THREE.BoxGeometry(0.8, 6, 0.8);
    const spireMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(TOWER_X, TOWER_H + 7, TOWER_Z);
    add(spireGeo, spireMat, spire);

    // ── Player ───────────────────────────────────────────────────────────────
    const pGeo = new THREE.BoxGeometry(1, 2, 1);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const player = new THREE.Mesh(pGeo, pMat);
    player.position.set(0, 1, 0);
    add(pGeo, pMat, player);
    playerRef.current = player;

    // Forward-facing nose (white dot = front of player)
    const nGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const nMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nose = new THREE.Mesh(nGeo, nMat);
    nose.position.set(0, 0.4, -0.65);
    player.add(nose); // child — moves with player

    // Ambient light
    const light = new THREE.AmbientLight(0xffffff, 1.2);
    objects.push(light);
    scene.add(light);

    // ── Keyboard input ───────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "KeyE" && nearRef.current) {
        onEnterRef.current();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    console.log("[Vanta City] Scene ready ✓ — buildings:", BUILDINGS.length);

    return () => {
      for (const obj of objects) scene.remove(obj);
      for (const { geo, mat } of disposables) { geo.dispose(); mat.dispose(); }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      playerRef.current = null;
    };
  }, [scene]);

  // ── Per-frame: movement + camera + proximity ─────────────────────────────
  useFrame((state, dt) => {
    const player = playerRef.current;
    if (!player) return;

    const keys   = keysRef.current;
    const safeDt = Math.min(dt, 0.05);
    const speed  = 10;
    const rotSpd = 2.2;

    if (keys.has("KeyA") || keys.has("ArrowLeft"))  angleRef.current += rotSpd * safeDt;
    if (keys.has("KeyD") || keys.has("ArrowRight")) angleRef.current -= rotSpd * safeDt;

    const angle = angleRef.current;
    const fwdX  = -Math.sin(angle);
    const fwdZ  = -Math.cos(angle);

    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      player.position.x += fwdX * speed * safeDt;
      player.position.z += fwdZ * speed * safeDt;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      player.position.x -= fwdX * speed * safeDt;
      player.position.z -= fwdZ * speed * safeDt;
    }

    player.rotation.y = angle;

    // Third-person camera — unchanged from previous version
    camTarget.current.set(
      player.position.x - fwdX * 8,
      player.position.y + 5,
      player.position.z - fwdZ * 8,
    );
    state.camera.position.lerp(camTarget.current, 0.1);
    state.camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

    // Proximity check — only fire React setState on state change
    const dx   = player.position.x - TOWER_X;
    const dz   = player.position.z - TOWER_Z;
    const near = Math.sqrt(dx * dx + dz * dz) < ENTER_RADIUS;
    if (near !== nearRef.current) {
      nearRef.current = near;
      onNearTower(near);
    }
  });

  return null;
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function World() {
  const [, navigate]  = useLocation();
  const [nearTower, setNearTower] = useState(false);

  const handleEnter = useCallback(() => navigate("/search"), [navigate]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      width: "100vw", height: "100vh",
      background: "#05030c",
    }}>
      {/* HUD */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 999,
        fontFamily: "monospace", fontSize: 11,
        pointerEvents: "none", letterSpacing: "0.08em",
      }}>
        <div style={{
          color: "#a855f7", background: "rgba(0,0,0,0.75)",
          border: "1px solid #a855f7", padding: "6px 14px", borderRadius: 4,
        }}>
          VANTA CITY
        </div>
        <div style={{
          color: "#6b7280", background: "rgba(0,0,0,0.6)",
          padding: "6px 14px", borderRadius: 4, marginTop: 6, fontSize: 10,
        }}>
          WASD / ↑←↓→ — move
        </div>
      </div>

      {/* Proximity prompt — rendered in HTML so no THREE labels needed */}
      {nearTower && (
        <div style={{
          position: "absolute", bottom: "28%", left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(5,3,12,0.92)",
          border: "1px solid #7c3aed",
          color: "#c4b5fd",
          fontFamily: "monospace", fontSize: 13,
          padding: "10px 24px", borderRadius: 4,
          letterSpacing: "0.1em", zIndex: 999,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          [E]  Enter Black Index
        </div>
      )}

      <CanvasBoundary>
        <Canvas
          style={{ width: "100%", height: "100%" }}
          camera={{ position: [0, 6, 10], fov: 60, near: 0.1, far: 1000 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) =>
            console.log("[Vanta City] Canvas ✓", gl.domElement.width, "×", gl.domElement.height)
          }
        >
          <CityScene onNearTower={setNearTower} onEnterTower={handleEnter} />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
