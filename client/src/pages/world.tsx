import { Component, useEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ── Error boundary ────────────────────────────────────────────────────────────
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
          <div style={{ fontSize: 11, color: "#6b7280" }}>VANTA CITY — RENDER FAILED</div>
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

// ── Imperative cube — no R3F JSX primitives, no applyProps, no createInstance ─
// Bypasses the THREE r169 / R3F v8 applyProps incompatibility entirely.
function ImperativeCube() {
  const { scene, camera } = useThree();
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    // Build everything imperatively with THREE directly
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0);
    scene.add(mesh);
    meshRef.current = mesh;

    // Aim camera at origin
    camera.lookAt(0, 0, 0);

    // Ambient light (also imperative)
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    console.log("[Vanta City] Scene built imperatively ✓", { mesh, scene });

    return () => {
      scene.remove(mesh);
      scene.remove(light);
      geometry.dispose();
      material.dispose();
    };
  }, [scene, camera]);

  // Spin the cube each frame
  useFrame((_, dt) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += dt * 0.8;
      meshRef.current.rotation.y += dt * 1.2;
    }
  });

  // No JSX primitives returned — everything lives in the THREE scene directly
  return null;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function World() {
  return (
    <div style={{
      position: "fixed", inset: 0,
      width: "100vw", height: "100vh",
      background: "#05030c",
    }}>
      {/* Proof overlay — outside Canvas, survives any crash */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 999999,
        color: "#00ff88", background: "rgba(0,0,0,0.9)",
        border: "1px solid #00ff88", padding: "6px 14px", borderRadius: 4,
        fontFamily: "monospace", fontSize: 12, pointerEvents: "none",
        letterSpacing: "0.1em",
      }}>
        WORLD COMPONENT LOADED
      </div>

      {/* Lime border shows the canvas wrapper has real dimensions */}
      <div style={{
        position: "absolute", inset: 0,
        border: "2px solid lime", boxSizing: "border-box",
      }}>
        <div style={{
          position: "absolute", bottom: 16, right: 16, zIndex: 10,
          color: "lime", fontFamily: "monospace", fontSize: 11,
          background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: 4,
          pointerEvents: "none",
        }}>
          CANVAS AREA
        </div>

        <CanvasBoundary>
          <Canvas
            style={{ width: "100%", height: "100%", display: "block" }}
            camera={{ position: [3, 3, 5], fov: 60, near: 0.1, far: 1000 }}
            gl={{ antialias: true }}
            onCreated={({ gl, camera }) => {
              console.log(
                "[Vanta City] Canvas created ✓",
                "size:", gl.domElement.width, "×", gl.domElement.height,
                "| camera:", camera.position.toArray().map((n: number) => n.toFixed(1)).join(", "),
              );
            }}
          >
            {/* Zero JSX primitives — all THREE objects created in useEffect above */}
            <ImperativeCube />
          </Canvas>
        </CanvasBoundary>
      </div>
    </div>
  );
}
