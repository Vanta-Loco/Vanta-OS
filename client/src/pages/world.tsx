import { Component, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";

// ── Error boundary so a Canvas failure never unmounts the whole tree ──────────
class CanvasBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message ?? String(e) };
  }
  componentDidCatch(e: Error) {
    console.error("[Vanta City] Canvas error:", e.message, e.stack);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
            background: "#05030c",
            fontFamily: "monospace",
            color: "#a855f7",
          }}
        >
          <div style={{ fontSize: 11, color: "#6b7280" }}>VANTA CITY — RENDER FAILED</div>
          <div
            style={{
              fontSize: 10,
              color: "#f87171",
              background: "#1f0a0a",
              border: "1px solid #7f1d1d",
              padding: "6px 14px",
              borderRadius: 4,
              maxWidth: 480,
              textAlign: "center",
              wordBreak: "break-all",
            }}
          >
            {this.state.error}
          </div>
          <div style={{ fontSize: 11, color: "#4b5563" }}>
            Check browser console for full stack trace.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function World() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#05030c" }}>
      {/* This div is OUTSIDE the Canvas and OUTSIDE the error boundary.
          It will survive even if Canvas throws and React error-boundary catches it. */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 999999,
          color: "#00ff88",
          background: "rgba(0,0,0,0.85)",
          border: "1px solid #00ff88",
          padding: "6px 14px",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 12,
          pointerEvents: "none",
          letterSpacing: "0.1em",
        }}
      >
        WORLD COMPONENT LOADED
      </div>

      <CanvasBoundary>
        <Canvas
          style={{
            width: "100vw",
            height: "100vh",
            display: "block",
            background: "#050010",
          }}
          camera={{ position: [3, 3, 5], fov: 60 }}
          gl={{ antialias: true }}
          onCreated={({ gl }) =>
            console.log("[Vanta City] Canvas created ✓", gl.getContext().constructor.name)
          }
        >
          <ambientLight intensity={1} />
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshNormalMaterial />
          </mesh>
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
