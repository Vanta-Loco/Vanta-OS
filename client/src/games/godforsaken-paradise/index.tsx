import { useCallback, useEffect, useRef, useState } from "react";
import "./game.css";

type Point = { x: number; y: number };
type Dialogue = { name: string; text: string } | null;
type Interaction = { id: string; label: string; kind: "npc" | "terminal" | "item"; x: number; y: number };
type GameState = {
  player: Point;
  camera: Point;
  collected: boolean[];
  missionStarted: boolean;
  completed: boolean;
  credits: number;
  rank: number;
  nearby: Interaction | null;
  dialogue: Dialogue;
  feedback: string;
  feedbackUntil: number;
};

const INITIAL: GameState = {
  player: { x: 0, y: 0 },
  camera: { x: 0, y: 0 },
  collected: [false, false, false],
  missionStarted: false,
  completed: false,
  credits: 0,
  rank: 1,
  nearby: null,
  dialogue: null,
  feedback: "Shift log open. Check the terminal to begin your first assignment.",
  feedbackUntil: 0,
};
const ITEMS = [
  { id: "filter", name: "Air filter", x: -5.2, y: -2.8, color: "#b9d37d" },
  { id: "coupler", name: "Power coupler", x: 4.9, y: -1.5, color: "#df9a56" },
  { id: "parcel", name: "Sealed parcel", x: 2.7, y: 5.2, color: "#d6c293" },
];
const NPCS = [
  { id: "mara", name: "Mara Venn", x: -5.4, y: 3.4, coat: "#a55f4b", line: "Mara: The Brizz General wants clean manifests, not heroics. Three supplies, back to the terminal. Quiet shift, if we do it right." },
  { id: "tovin", name: "Tovin Rusk", x: 5.4, y: 3.8, coat: "#527e86", line: "Tovin: General Brizz signed off on this station personally. Keep the old coupler dry and the air filter seated. That is a good day's work." },
];
const WALLS = [
  { x: -4.6, y: -5.3, w: 4.1, h: 2.1, label: "CABIN 04" },
  { x: 2.8, y: -5.5, w: 2.6, h: 2.0, label: "SUPPLY LOCKER" },
  { x: -1.0, y: 4.6, w: 3.0, h: 1.35, label: "CABLE RUN" },
  { x: -7.1, y: -.5, w: 1.0, h: 2.7, label: "" },
  { x: 6.2, y: -.8, w: 1.0, h: 2.6, label: "" },
];
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function GodforsakenParadiseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const heldRef = useRef<Set<string>>(new Set());
  const gameRef = useRef<GameState>({ ...INITIAL, player: { ...INITIAL.player }, camera: { ...INITIAL.camera }, collected: [...INITIAL.collected] });
  const reducedRef = useRef(false);
  const [view, setView] = useState(() => ({ ...gameRef.current }));

  const publish = useCallback(() => setView({ ...gameRef.current, player: { ...gameRef.current.player }, collected: [...gameRef.current.collected] }), []);
  const report = useCallback((message: string) => {
    gameRef.current.feedback = message;
    gameRef.current.feedbackUntil = performance.now() + 3600;
    publish();
  }, [publish]);

  const interact = useCallback(() => {
    const g = gameRef.current;
    const target = g.nearby;
    if (!target) return;
    if (target.kind === "npc") {
      const npc = NPCS.find((person) => person.id === target.id);
      if (npc) {
        g.dialogue = { name: npc.name, text: npc.line };
        publish();
      }
      return;
    }
    if (target.kind === "item") {
      const itemIndex = ITEMS.findIndex((item) => item.id === target.id);
      if (itemIndex >= 0 && !g.collected[itemIndex]) {
        g.collected[itemIndex] = true;
        report(`${ITEMS[itemIndex].name} secured. Return it to the station terminal.`);
      }
      return;
    }
    if (!g.missionStarted) {
      g.missionStarted = true;
      report("Assignment accepted: recover the air filter, power coupler, and sealed parcel.");
    } else if (g.collected.every(Boolean) && !g.completed) {
      g.completed = true;
      g.credits += 125;
      g.rank = 2;
      report("Shift assignment complete. +125 credits. Rank advanced to Station Hand.");
    } else if (g.completed) {
      report("Terminal: shift record filed. No further assignments are queued.");
    } else {
        report(`Terminal: ${g.collected.filter(Boolean).length} of 3 supplies recovered. Keep moving.`);
    }
    publish();
  }, [publish, report]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedRef.current = media.matches;
    const update = () => { reducedRef.current = media.matches; };
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const mapKey = (key: string) => {
      const k = key.toLowerCase();
      if (k === "w" || k === "arrowup") return "up";
      if (k === "s" || k === "arrowdown") return "down";
      if (k === "a" || k === "arrowleft") return "left";
      if (k === "d" || k === "arrowright") return "right";
      return null;
    };
    const down = (event: KeyboardEvent) => {
      const dir = mapKey(event.key);
      if (dir && !event.repeat) {
        heldRef.current.add(dir);
        event.preventDefault();
      }
      if ((event.key === "e" || event.key === "E" || event.key === "Enter") && !event.repeat) {
        if (document.activeElement?.tagName === "BUTTON" && event.key === "Enter") return;
        event.preventDefault();
        interact();
      }
      if (event.key === "Escape") {
        gameRef.current.dialogue = null;
        publish();
      }
    };
    const up = (event: KeyboardEvent) => {
      const dir = mapKey(event.key);
      if (dir) heldRef.current.delete(dir);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    const clear = () => heldRef.current.clear();
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [interact, publish]);

  useEffect(() => {
    let last = 0;
    let publishTimer = 0;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const canvas = canvasRef.current!;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const iso = (x: number, y: number, cx: number, cy: number, scale: number): Point => ({
      x: cx + (x - y) * scale,
      y: cy + (x + y) * scale * 0.48,
    });
    const poly = (points: Point[], fill: string, stroke?: string) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    };
    const draw = (now: number) => {
      frameRef.current = requestAnimationFrame(draw);
      if (document.hidden) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width, height = rect.height;
      if (width < 1 || height < 1) return;
      const g = gameRef.current;
      const dt = Math.min((now - (last || now)) / 1000, .05);
      last = now;
      const speed = 3.5 * dt;
      const input = heldRef.current;
      let dx = (input.has("right") ? 1 : 0) - (input.has("left") ? 1 : 0);
      let dy = (input.has("down") ? 1 : 0) - (input.has("up") ? 1 : 0);
      const mag = Math.hypot(dx, dy) || 1;
      dx = dx / mag * speed; dy = dy / mag * speed;
      const canOccupy = (x: number, y: number) => {
        if (Math.abs(x) > 8 || Math.abs(y) > 7) return false;
        return !WALLS.some((w) => x > w.x - .38 && x < w.x + w.w + .38 && y > w.y - .35 && y < w.y + w.h + .35);
      };
      if (canOccupy(g.player.x + dx, g.player.y)) g.player.x += dx;
      if (canOccupy(g.player.x, g.player.y + dy)) g.player.y += dy;
      const active: Interaction[] = [
        { id: "terminal", label: g.completed ? "Shift terminal" : g.missionStarted ? "Shift terminal" : "Shift terminal", kind: "terminal", x: 0, y: -1.6 },
        ...NPCS.map((n) => ({ id: n.id, label: n.name, kind: "npc" as const, x: n.x, y: n.y })),
        ...ITEMS.filter((_, i) => g.missionStarted && !g.collected[i]).map((item) => ({ id: item.id, label: item.name, kind: "item" as const, x: item.x, y: item.y })),
      ];
      const nearest = active.map((target) => ({ target, d: distance(g.player, target) })).filter((v) => v.d < 1.35).sort((a, b) => a.d - b.d)[0];
      const nextNearby = nearest?.target ?? null;
      if (g.nearby?.id !== nextNearby?.id) { g.nearby = nextNearby; publish(); }
      if (!reducedRef.current) {
        g.camera.x += (g.player.x - g.camera.x) * Math.min(1, dt * 5);
        g.camera.y += (g.player.y - g.camera.y) * Math.min(1, dt * 5);
      } else { g.camera.x = g.player.x; g.camera.y = g.player.y; }
      const scale = Math.max(11, Math.min(32, width / 31));
      const project = (x: number, y: number) =>
        iso(x - g.camera.x, y - g.camera.y, width / 2, height * .48, scale);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#10191d"; ctx.fillRect(0, 0, width, height);
      const radial = ctx.createRadialGradient(width * .53, height * .43, 10, width * .53, height * .43, width * .75);
      radial.addColorStop(0, "rgba(58,75,72,.24)"); radial.addColorStop(1, "rgba(5,9,12,.45)");
      ctx.fillStyle = radial; ctx.fillRect(0, 0, width, height);
      const groundA = project(-8, -7), groundB = project(8, -7), groundC = project(8, 7), groundD = project(-8, 7);
      poly([groundA, groundB, groundC, groundD], "#202a2b", "rgba(207,170,117,.25)");
      ctx.strokeStyle = "rgba(193,169,128,.1)"; ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i += 1) {
        const a = project(i, -7), b = project(i, 7), c = project(-8, i), d = project(8, i);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
      const drawStructure = (x: number, y: number, w: number, h: number, label: string, color: string, tall = 1) => {
        const base = [project(x,y), project(x+w,y), project(x+w,y+h), project(x,y+h)];
        const lift = tall * scale * .75;
        poly([base[0], base[1], {x:base[1].x,y:base[1].y-lift}, {x:base[0].x,y:base[0].y-lift}], color, "rgba(0,0,0,.45)");
        poly([base[1], base[2], {x:base[2].x,y:base[2].y-lift}, {x:base[1].x,y:base[1].y-lift}], "#243238", "rgba(0,0,0,.45)");
        poly([{x:base[0].x,y:base[0].y-lift},{x:base[1].x,y:base[1].y-lift},{x:base[2].x,y:base[2].y-lift},{x:base[3].x,y:base[3].y-lift}], "#526063", "rgba(221,179,124,.4)");
        if (label) {
          const center = project(x+w*.5,y+h*.45);
          ctx.fillStyle = "#c4b8a1"; ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
          ctx.fillText(label, center.x, center.y-lift*.56);
        }
      };
      WALLS.forEach((wall, index) => drawStructure(wall.x, wall.y, wall.w, wall.h, wall.label, index === 0 ? "#34464a" : "#2e3c40", index === 0 ? 1.4 : .8));
      // Cabin signal window and terminal console
      const cabinWindow = project(-3.4, -4.55);
      ctx.fillStyle = "rgba(229,168,93,.72)"; ctx.fillRect(cabinWindow.x-8, cabinWindow.y-12, 16, 7);
      const term = project(0, -1.6);
      ctx.fillStyle = "#182326"; ctx.fillRect(term.x-15, term.y-19, 30, 23);
      ctx.fillStyle = "#e1a965"; ctx.fillRect(term.x-10, term.y-15, 20, 8);
      ctx.fillStyle = "rgba(229,168,93,.25)"; ctx.fillRect(term.x-20, term.y+3, 40, 3);
      // Items are visible on the floor even before mission acceptance.
      ITEMS.forEach((item, index) => {
        if (g.collected[index]) return;
        const p = project(item.x, item.y);
        ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(p.x, p.y+5, 12, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = item.color; ctx.fillRect(p.x-7, p.y-8, 14, 10);
        ctx.strokeStyle = "rgba(255,239,197,.65)"; ctx.strokeRect(p.x-7, p.y-8, 14, 10);
        if (!g.missionStarted) { ctx.fillStyle = "rgba(229,168,93,.45)"; ctx.beginPath(); ctx.arc(p.x,p.y-14,2,0,Math.PI*2); ctx.fill(); }
      });
      // NPCs and player, drawn in depth order.
      const actors = [
        ...NPCS.map((n) => ({ x:n.x,y:n.y,color:n.coat,name:n.name,player:false })),
        { x:g.player.x,y:g.player.y,color:"#dfb371",name:"You",player:true },
      ].sort((a,b)=>a.x+a.y-(b.x+b.y));
      actors.forEach((actor) => {
        const p = project(actor.x,actor.y);
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(p.x,p.y+4,10,4,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = actor.color; ctx.fillRect(p.x-7,p.y-20,14,18);
        ctx.fillStyle = "#d3b99a"; ctx.beginPath(); ctx.arc(p.x,p.y-24,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "#d3c9b7"; ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
        ctx.fillText(actor.name,p.x,p.y-34);
      });
      // Screen-edge station framing.
      ctx.strokeStyle = "rgba(229,168,93,.16)"; ctx.strokeRect(12,12,width-24,height-24);
      if (g.feedbackUntil < now && g.feedback) { g.feedback = ""; }
      publishTimer += dt;
      if (publishTimer > .18) { publishTimer = 0; publish(); }
    };
    frameRef.current = requestAnimationFrame(draw);
    const visibility = () => {
      if (document.hidden && frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      else if (!document.hidden) { last = 0; frameRef.current = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      document.removeEventListener("visibilitychange", visibility);
      resizeObserver.disconnect();
    };
  }, [publish]);

  const reset = () => {
    heldRef.current.clear();
    gameRef.current = { ...INITIAL, player: { ...INITIAL.player }, camera: { ...INITIAL.camera }, collected: [...INITIAL.collected] };
    publish();
  };

  const hold = (direction: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      heldRef.current.add(direction);
    },
    onPointerUp: () => heldRef.current.delete(direction),
    onPointerCancel: () => heldRef.current.delete(direction),
    onLostPointerCapture: () => heldRef.current.delete(direction),
  });
  const prompt = view.nearby
    ? `${view.nearby.kind === "item" ? "Collect" : "Interact"}: ${view.nearby.label} — press E`
    : "Explore the station deck";
  const objective = view.completed
    ? "Assignment filed. Your first quiet shift is on record."
    : view.missionStarted
      ? `Recover station supplies, then report back. ${view.collected.filter(Boolean).length} of 3 collected.`
      : "A routine supply check is waiting at the shift terminal.";

  return (
    <section className="gp-game" aria-label="The Brizz General’s Station playable game">
      <header className="gp-topbar">
        <div className="gp-brand">
          <div className="gp-kicker">Godforsaken Paradise · Milestone 001</div>
          <h1 className="gp-title">THE BRIZZ GENERAL’S STATION</h1>
        </div>
        <div className="gp-stats" aria-label="Station status">
          <div className="gp-stat">CREDITS<strong>{view.credits}</strong></div>
          <div className="gp-stat">RANK<strong>{view.rank === 1 ? "Probationary" : "Station Hand"}</strong></div>
          <button className="gp-reset" type="button" onClick={reset} aria-label="Reset or restart the station shift">RESTART SHIFT</button>
        </div>
      </header>
      <div className="gp-play-area">
        <canvas ref={canvasRef} className="gp-canvas" aria-label={`Isometric station deck. ${objective} ${prompt}.`} role="img" />
        <div className="gp-overlays">
          <div className="gp-objective" aria-label="Current assignment">
            <div className="gp-objective-label">{view.completed ? "SHIFT COMPLETE" : view.missionStarted ? "ACTIVE ASSIGNMENT" : "SHIFT NOTE"}</div>
            <div className="gp-objective-copy">{objective}</div>
            {view.missionStarted && <div className="gp-collect-row" aria-label="Supply collection status">
              {ITEMS.map((item, index) => <span key={item.id} className={`gp-item-chip ${view.collected[index] ? "collected" : ""}`}>{view.collected[index] ? "SECURED" : "PENDING"} · {item.name}</span>)}
            </div>}
          </div>
          {view.dialogue ? (
            <div className="gp-dialogue" role="dialog" aria-label={`Conversation with ${view.dialogue.name}`} aria-live="polite">
              <div className="gp-dialogue-name">{view.dialogue.name} · crew</div>
              <p className="gp-dialogue-text">{view.dialogue.text}</p>
              <button type="button" onClick={() => { gameRef.current.dialogue = null; publish(); }}>CLOSE · ESC</button>
            </div>
          ) : (
            <div className="gp-prompt" aria-live="polite">{prompt}</div>
          )}
          {view.feedback && <div className="gp-feedback" role="status" aria-live="polite">{view.feedback}</div>}
        </div>
      </div>
      <footer className="gp-bottom">
        <div className="gp-controls-copy">
          <b>MOVE</b> WASD / ARROWS &nbsp;·&nbsp; <b>INTERACT</b> E &nbsp;·&nbsp; <b>CLOSE DIALOGUE</b> ESC
          <br />Find the terminal by the employee cabin. Deck boundaries and station structures are solid.
        </div>
        <div className="gp-touch-controls" aria-label="Touch movement controls">
          <button className="gp-touch-up" type="button" aria-label="Move up" {...hold("up")}>▲</button>
          <button className="gp-touch-left" type="button" aria-label="Move left" {...hold("left")}>◀</button>
          <button className="gp-touch-down" type="button" aria-label="Move down" {...hold("down")}>▼</button>
          <button className="gp-touch-right" type="button" aria-label="Move right" {...hold("right")}>▶</button>
        </div>
        <button className="gp-interact" type="button" disabled={!view.nearby} onClick={interact}>
          {view.nearby?.kind === "item" ? "COLLECT ITEM" : "INTERACT"}
        </button>
      </footer>
      <div className="gp-sr-status" aria-live="polite">
        Player at station deck. {objective} {prompt} Credits: {view.credits}. Rank: {view.rank === 1 ? "Probationary" : "Station Hand"}.
      </div>
    </section>
  );
}

export default GodforsakenParadiseGame;
