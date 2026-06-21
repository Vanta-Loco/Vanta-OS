import { Canvas } from "@react-three/fiber";

export default function World() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <Canvas>
        <ambientLight />
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="purple" />
        </mesh>
      </Canvas>
    </div>
  );
}
