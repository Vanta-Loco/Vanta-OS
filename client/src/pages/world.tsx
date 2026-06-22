import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Error boundary ─────────────────────────────────────────────────────────────
class CanvasBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message ?? String(e) };
  }
  componentDidCatch(e: Error) {
    console.error("[Vanta City] Canvas error:", e.message, "\n", e.stack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12, background: "#05030c",
          fontFamily: "monospace",
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

// ── Scene: ground + player + camera  ──────────────────────────────────────────
// Everything is imperative THREE.js to avoid R3F v8/three r169 applyProps crash.
function CityScene() {
  const { scene } = useThree();

  // Player state refs — no re-renders needed
  const playerRef   = useRef<THREE.Mesh | null>(null);
  const keysRef     = useRef<Set<string>>(new Set());
  const angleRef    = useRef(0);           // player facing angle (radians, Y axis)
  const camTarget   = useRef(new THREE.Vector3(0, 6, 10));

  // ── Build scene imperatively ──────────────────────────────────────────────
  useEffect(() => {
    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x080810 });
    const ground    = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Grid overlay (GridHelper is imperative THREE.js — safe)
    const grid = new THREE.GridHelper(400, 80, 0x1c1c3a, 0x111128);
    grid.position.y = 0.01; // tiny offset to avoid z-fighting with ground
    scene.add(grid);

    // Player body
    const playerGeo = new THREE.BoxGeometry(1, 2, 1);
    const playerMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const player    = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(0, 1, 0);
    scene.add(player);
    playerRef.current = player;

    // Forward-facing "nose" on the player so direction is obvious
    const noseGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nose    = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.4, -0.65); // front-center of body
    player.add(nose); // child of player — moves/rotates with it

    // Ambient light
    const light = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(light);

    // ── Keyboard input ──────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      // Prevent arrow keys from scrolling the page
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    console.log("[Vanta City] Scene ready ✓");

    return () => {
      scene.remove(ground);
      scene.remove(grid);
      scene.remove(player);
      scene.remove(light);
      groundGeo.dispose(); groundMat.dispose();
      playerGeo.dispose(); playerMat.dispose();
      noseGeo.dispose();   noseMat.dispose();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [scene]);

  // ── Per-frame: movement + camera ──────────────────────────────────────────
  useFrame((state, dt) => {
    const player = playerRef.current;
    if (!player) return;

    const keys    = keysRef.current;
    const safeDt  = Math.min(dt, 0.05); // clamp to avoid post-tab jumps
    const speed   = 10;   // units/sec forward speed
    const rotSpd  = 2.2;  // radians/sec turn speed

    // Turn: A / ←  →  / D
    if (keys.has("KeyA") || keys.has("ArrowLeft"))  angleRef.current += rotSpd * safeDt;
    if (keys.has("KeyD") || keys.has("ArrowRight")) angleRef.current -= rotSpd * safeDt;

    const angle = angleRef.current;
    const fwdX  = -Math.sin(angle);
    const fwdZ  = -Math.cos(angle);

    // Translate: W / ↑  ↓  / S
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      player.position.x += fwdX * speed * safeDt;
      player.position.z += fwdZ * speed * safeDt;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      player.position.x -= fwdX * speed * safeDt;
      player.position.z -= fwdZ * speed * safeDt;
    }

    player.rotation.y = angle;

    // Third-person camera: stay behind and above the player
    const camDist   = 8;
    const camHeight = 5;
    camTarget.current.set(
      player.position.x - fwdX * camDist,
      player.position.y + camHeight,
      player.position.z - fwdZ * camDist,
    );
    // Smooth follow via lerp (modifies in place — no allocations)
    state.camera.position.lerp(camTarget.current, 0.1);
    state.camera.lookAt(
      player.position.x,
      player.position.y + 1,   // look at chest height, not feet
      player.position.z,
    );
  });

  return null;
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function World() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      width: "100vw", height: "100vh",
      background: "#05030c",
    }}>
      {/* HUD — lives outside Canvas, unaffected by WebGL errors */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 999,
        fontFamily: "monospace", fontSize: 11, pointerEvents: "none",
        letterSpacing: "0.08em", lineHeight: "1.8",
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

      <CanvasBoundary>
        <Canvas
          style={{ width: "100%", height: "100%" }}
          camera={{ position: [0, 6, 10], fov: 60, near: 0.1, far: 1000 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            console.log(
              "[Vanta City] Canvas created ✓",
              gl.domElement.width, "×", gl.domElement.height,
            );
          }}
        >
          <CityScene />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
