import { useRef, useEffect } from "react";

const MAP_SIZE   = 148;   // canvas pixels
const WORLD_VIEW = 240;   // world units visible per side (radius)
const SCALE      = MAP_SIZE / (WORLD_VIEW * 2);  // px per world unit
const CHUNK      = 80;    // chunk boundary spacing

// Mirror of world.tsx LANDMARKS
const MAP_LMS = [
  { name: "BLACK INDEX",      x:  40, z:  -40, color: "#7c3aed", short: "IDX" },
  { name: "MUSIC HUB",        x: -60, z:  -60, color: "#ec4899", short: "MUS" },
  { name: "VAULT GATE",       x:  90, z:   20, color: "#22c55e", short: "VLT" },
  { name: "WIRELINE",         x: -90, z:   50, color: "#3b82f6", short: "WRL" },
  { name: "FRACT",            x:  10, z: -110, color: "#f59e0b", short: "FRX" },
  { name: "VANTA METRO",      x: -20, z:   70, color: "#6b7280", short: "MET" },
  { name: "VANTA OS CORE",    x: 110, z:  -90, color: "#a855f7", short: "VOS" },
];

function toMap(wx: number, wz: number, px: number, pz: number) {
  return {
    mx: MAP_SIZE / 2 + (wx - px) * SCALE,
    my: MAP_SIZE / 2 + (wz - pz) * SCALE,
  };
}

interface Props {
  playerPosRef: React.MutableRefObject<{ x: number; z: number; angle: number }>;
}

export function WorldMinimap({ playerPosRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    // Rebind as definitely-non-null so TypeScript is happy inside the draw closure
    const ctx: CanvasRenderingContext2D = rawCtx;

    function draw() {
      const { x: px, z: pz, angle } = playerPosRef.current;
      const half = MAP_SIZE / 2;

      // ── Background ─────────────────────────────────────────────────────────
      ctx.fillStyle = "rgba(5,3,12,0.96)";
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      // ── Chunk grid ─────────────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(168,85,247,0.10)";
      ctx.lineWidth = 0.5;
      const x0 = Math.floor((px - WORLD_VIEW) / CHUNK) * CHUNK;
      const z0 = Math.floor((pz - WORLD_VIEW) / CHUNK) * CHUNK;
      for (let gx = x0; gx <= px + WORLD_VIEW; gx += CHUNK) {
        const mx = half + (gx - px) * SCALE;
        if (mx >= 0 && mx <= MAP_SIZE) {
          ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, MAP_SIZE); ctx.stroke();
        }
      }
      for (let gz = z0; gz <= pz + WORLD_VIEW; gz += CHUNK) {
        const my = half + (gz - pz) * SCALE;
        if (my >= 0 && my <= MAP_SIZE) {
          ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(MAP_SIZE, my); ctx.stroke();
        }
      }

      // ── Landmarks ──────────────────────────────────────────────────────────
      for (const lm of MAP_LMS) {
        const { mx, my } = toMap(lm.x, lm.z, px, pz);
        // Skip if off-map
        if (mx < -4 || mx > MAP_SIZE + 4 || my < -4 || my > MAP_SIZE + 4) continue;

        // Glow halo
        const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 10);
        grd.addColorStop(0, lm.color + "66");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.fill();

        // Dot
        ctx.fillStyle = lm.color;
        ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2); ctx.fill();

        // Label — only if well inside the map
        if (mx > 16 && mx < MAP_SIZE - 16 && my > 10 && my < MAP_SIZE - 6) {
          ctx.font = "bold 6px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = lm.color + "cc";
          ctx.fillText(lm.short, mx, my - 6);
        }
      }

      // ── Player arrow ───────────────────────────────────────────────────────
      // Three.js Y-rotation: positive = counter-clockwise viewed from above
      // angle=0 → facing -Z (into screen = up on map), so rotate by -angle
      ctx.save();
      ctx.translate(half, half);
      ctx.rotate(-angle);

      // Arrow chevron
      ctx.fillStyle = "#c084fc";
      ctx.beginPath();
      ctx.moveTo(0, -8);   // nose
      ctx.lineTo(4.5, 6);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-4.5, 6);
      ctx.closePath();
      ctx.fill();

      // Center dot
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();

      ctx.restore();

      // ── Scanlines ──────────────────────────────────────────────────────────
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      for (let sy = 1; sy < MAP_SIZE; sy += 4) {
        ctx.fillRect(0, sy, MAP_SIZE, 1);
      }

      // ── Border ─────────────────────────────────────────────────────────────
      ctx.strokeStyle = "rgba(168,85,247,0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, MAP_SIZE - 1, MAP_SIZE - 1);

      // Corner ticks (Vanta OS aesthetic)
      const T = 10;
      ctx.strokeStyle = "rgba(168,85,247,0.8)";
      ctx.lineWidth = 1.5;
      for (const [cx2, cy2, sx, sy] of [
        [0, 0, 1, 1], [MAP_SIZE, 0, -1, 1],
        [0, MAP_SIZE, 1, -1], [MAP_SIZE, MAP_SIZE, -1, -1],
      ] as [number, number, number, number][]) {
        ctx.beginPath();
        ctx.moveTo(cx2 + sx * T, cy2);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx2, cy2 + sy * T);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playerPosRef]);

  return (
    <div
      data-testid="div-world-minimap"
      style={{
        position: "fixed", bottom: 16, left: 16, zIndex: 1000,
        border: "1px solid rgba(168,85,247,0.45)",
        borderRadius: 4, overflow: "hidden",
        pointerEvents: "none",
        boxShadow: "0 0 16px rgba(168,85,247,0.12)",
      }}
    >
      {/* Label bar */}
      <div style={{
        background: "rgba(168,85,247,0.10)",
        borderBottom: "1px solid rgba(168,85,247,0.3)",
        padding: "3px 8px",
        fontFamily: "'Courier New', monospace",
        fontSize: 8, color: "#a855f7",
        letterSpacing: "0.14em", fontWeight: 700,
      }}>
        ◈ VANTA CITY MAP
      </div>
      <canvas ref={canvasRef} width={MAP_SIZE} height={MAP_SIZE} style={{ display: "block" }} />
    </div>
  );
}
