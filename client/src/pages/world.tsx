import { Canvas } from "@react-three/fiber";

export default function World() {
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {/* Visible even if Canvas fails */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 9999,
          color: "#00ff88",
          fontFamily: "monospace",
          fontSize: 13,
          background: "rgba(0,0,0,0.7)",
          padding: "4px 10px",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      >
        3D TEST ACTIVE
      </div>

      <Canvas
        style={{ width: "100vw", height: "100vh", display: "block", background: "#050010" }}
        camera={{ position: [3, 3, 5], fov: 60 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => console.log("[Vanta City] Canvas created", gl)}
      >
        <ambientLight intensity={1} />
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshNormalMaterial />
        </mesh>
      </Canvas>
    </div>
  );
}
