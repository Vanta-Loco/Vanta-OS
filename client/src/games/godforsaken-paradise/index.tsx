import { useCallback, useEffect, useRef, useState } from "react";
import "./game.css";
import {
  clearProgress,
  completeActiveMission,
  createInitialProgress,
  loadProgress,
  missionForNextShift,
  missionReadyForReport,
  missionRankLabel,
  persistProgress,
  purchaseCabinUpgrade,
  recordMissionObjective,
  type MissionType,
  type ProgressSave,
  type UpgradeId,
} from "./progression";

type Point = { x: number; y: number };
type Dialogue = { name: string; text: string } | null;
type InteractionKind = "npc" | "terminal" | "item" | "repair" | "dispatch" | "cabin" | "canteen" | "operations" | "lift";
type Interaction = { id: string; label: string; kind: InteractionKind; x: number; y: number };
type GameState = {
  player: Point;
  camera: Point;
  progress: ProgressSave;
  nearby: Interaction | null;
  dialogue: Dialogue;
  feedback: string;
  feedbackUntil: number;
};

const ITEMS = [
  { id: "filter", name: "Air filter", x: -5.2, y: -2.8, color: "#b9d37d" },
  { id: "coupler", name: "Power coupler", x: 4.9, y: -1.5, color: "#df9a56" },
  { id: "parcel", name: "Sealed parcel", x: 2.7, y: 5.2, color: "#d6c293" },
];
const NPCS = [
  { id: "mara", name: "Mara Venn", x: -5.4, y: 3.4, coat: "#a55f4b", patrol: 0.38, phase: 0 },
  { id: "tovin", name: "Tovin Rusk", x: 5.4, y: 3.8, coat: "#527e86", patrol: 0.48, phase: Math.PI },
];
const WALLS = [
  { x: -4.6, y: -5.3, w: 4.1, h: 2.1, label: "CABIN 04" },
  { x: 2.8, y: -5.5, w: 2.6, h: 2.0, label: "SUPPLY LOCKER" },
  { x: -1.0, y: 4.6, w: 3.0, h: 1.35, label: "CABLE RUN" },
  { x: -12.0, y: -1.8, w: 3.0, h: 1.1, label: "CANTEEN COUNTER" },
  { x: -11.0, y: 2.1, w: 2.0, h: 1.3, label: "TABLES" },
  { x: 8.0, y: -5.7, w: 3.4, h: 1.3, label: "OPS CONSOLE" },
  { x: 8.1, y: -1.6, w: 3.4, h: 1.2, label: "SHIFT BOARD" },
  { x: -1.2, y: 9.0, w: 2.4, h: 1.2, label: "REPAIR RELAY" },
  { x: 8.2, y: 7.8, w: 4.0, h: 4.6, label: "COMMAND LIFT" },
];
const ROOM_LABELS = [
  { name: "CANTEEN", x: -10.2, y: -4.0, color: "#d8b572" },
  { name: "OPERATIONS DECK", x: 9.6, y: -3.4, color: "#8ab8bd" },
  { name: "MAINTENANCE CORRIDOR", x: 1.0, y: 12.1, color: "#91b181" },
  { name: "COMMAND LIFT · LOCKED", x: 10.2, y: 12.0, color: "#dc7b70" },
];
const MISSION_NAMES: Record<MissionType, string> = {
  supply: "SUPPLY COLLECTION",
  repair: "EQUIPMENT REPAIR",
  delivery: "EMPLOYEE DELIVERY",
};
const MISSION_DESCRIPTIONS: Record<MissionType, string> = {
  supply: "Collect the air filter, power coupler, and sealed parcel; report back to the shift terminal.",
  repair: "Reach the maintenance corridor, restore the relay, and report back to the shift terminal.",
  delivery: "Pick up the dispatch packet in operations and hand it to the assigned crew member.",
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const cloneProgress = (progress: ProgressSave): ProgressSave => ({
  ...progress,
  completedMissionIds: [...progress.completedMissionIds],
  completedMissionTypes: [...progress.completedMissionTypes],
  upgrades: [...progress.upgrades],
  activeMission: progress.activeMission
    ? { ...progress.activeMission, objectives: [...progress.activeMission.objectives] }
    : null,
});

export function GodforsakenParadiseGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const heldRef = useRef<Set<string>>(new Set());
  const [initialProgress] = useState(() => loadProgress());
  const createInitialGame = (): GameState => ({
    player: { x: 0, y: 0 },
    camera: { x: 0, y: 0 },
    progress: cloneProgress(initialProgress),
    nearby: null,
    dialogue: null,
    feedback: initialProgress.activeMission ? "Saved assignment restored. Continue your shift." : "Shift log open. Check the terminal to begin your first assignment.",
    feedbackUntil: 0,
  });
  const gameRef = useRef<GameState>(createInitialGame());
  const reducedRef = useRef(false);
  const [view, setView] = useState(() => ({ ...gameRef.current, progress: cloneProgress(gameRef.current.progress) }));
  const [arrivalOpen, setArrivalOpen] = useState(!initialProgress.arrivalSeen);
  const [missionMenuOpen, setMissionMenuOpen] = useState(false);
  const [upgradeMenuOpen, setUpgradeMenuOpen] = useState(false);
  const [confirmFullReset, setConfirmFullReset] = useState(false);

  const publish = useCallback(() => setView({
    ...gameRef.current,
    player: { ...gameRef.current.player },
    progress: cloneProgress(gameRef.current.progress),
  }), []);
  const report = useCallback((message: string) => {
    gameRef.current.feedback = message;
    gameRef.current.feedbackUntil = performance.now() + 3600;
    publish();
  }, [publish]);
  const commitProgress = useCallback((next: ProgressSave) => {
    gameRef.current.progress = next;
    persistProgress(next);
    publish();
  }, [publish]);

  const acceptMission = useCallback((type: MissionType) => {
    const next = missionForNextShift(gameRef.current.progress, type);
    if (next === gameRef.current.progress) return;
    gameRef.current.progress = next;
    persistProgress(next);
    setMissionMenuOpen(false);
    report(`${MISSION_NAMES[type]} accepted. ${MISSION_DESCRIPTIONS[type]}`);
  }, [report]);

  const completeMission = useCallback((next: ProgressSave, type: MissionType) => {
    const paid = completeActiveMission(next);
    if (paid === next) return false;
    const reward = paid.credits - next.credits;
    gameRef.current.progress = paid;
    persistProgress(paid);
    publish();
    report(`${MISSION_NAMES[type]} filed. +${reward} credits. Rank: ${missionRankLabel(paid.rank)}.`);
    return true;
  }, [publish, report]);

  const interact = useCallback(() => {
    const g = gameRef.current;
    const target = g.nearby;
    if (!target) return;
    if (target.kind === "npc") {
      const npc = NPCS.find((person) => person.id === target.id);
      const active = g.progress.activeMission;
      if (active?.type === "delivery" && active.objectives.includes("dispatch-picked") && active.employeeTarget === target.id) {
        let next = recordMissionObjective(g.progress, `delivered-to-${target.id}`);
        const delivered = completeActiveMission(next);
        if (delivered !== next) {
          const reward = delivered.credits - next.credits;
          g.progress = delivered;
          persistProgress(delivered);
          report(`Dispatch delivered. +${reward} credits. Rank: ${missionRankLabel(delivered.rank)}.`);
          return;
        }
        g.progress = next;
        persistProgress(next);
        report(`Dispatch delivered to ${npc?.name ?? "crew"}.`);
        return;
      }
      if (npc) {
        const line = npc.id === "mara"
          ? "Mara: The Brizz General wants clean manifests, not heroics. Three supplies, back to the terminal. Quiet shift, if we do it right."
          : g.progress.firstShiftEndingUnlocked
            ? "Tovin: That order came through the command lift. No sender tag. The Brizz General does not usually leave the sender blank."
            : "Tovin: General Brizz signed off on this station personally. Keep the old coupler dry and the air filter seated. That is a good day's work.";
        g.dialogue = { name: npc.name, text: line };
        publish();
      }
      return;
    }
    if (target.kind === "item") {
      const item = ITEMS.find((entry) => entry.id === target.id);
      if (item && g.progress.activeMission?.type === "supply") {
        const next = recordMissionObjective(g.progress, item.id);
        if (next !== g.progress) {
          g.progress = next;
          persistProgress(next);
          report(`${item.name} secured. Return it to the station terminal.`);
        }
      }
      return;
    }
    if (target.kind === "terminal") {
      const active = g.progress.activeMission;
      if (!active) {
        setMissionMenuOpen(true);
        return;
      }
      if (active.type === "delivery") {
        report(active.objectives.includes("dispatch-picked")
          ? `Take the dispatch packet to ${active.employeeTarget === "mara" ? "Mara Venn" : "Tovin Rusk"}.`
          : "Pick up the dispatch packet from the operations deck.");
        return;
      }
      if (!missionReadyForReport(g.progress)) {
        report(active.type === "supply"
          ? `Supply run: ${active.objectives.filter((id) => ["filter", "coupler", "parcel"].includes(id)).length} of 3 items secured.`
          : "The maintenance relay still needs repair.");
        return;
      }
      const next = recordMissionObjective(g.progress, "terminal-report");
      completeMission(next, active.type);
      return;
    }
    if (target.kind === "repair" && g.progress.activeMission?.type === "repair") {
      const next = recordMissionObjective(g.progress, "relay-repaired");
      g.progress = next;
      persistProgress(next);
      report("Maintenance relay restored. Return to the shift terminal.");
      return;
    }
    if (target.kind === "dispatch" && g.progress.activeMission?.type === "delivery") {
      const employeeTarget = g.progress.activeMission.employeeTarget;
      const next = recordMissionObjective(g.progress, "dispatch-picked");
      g.progress = next;
      persistProgress(next);
      report(`Packet secured. Deliver it to ${employeeTarget === "mara" ? "Mara Venn" : "Tovin Rusk"}.`);
      return;
    }
    if (target.kind === "cabin") {
      setUpgradeMenuOpen(true);
      return;
    }
    if (target.kind === "lift") {
      if (g.progress.upgrades.includes("signal-receiver") && g.progress.firstShiftEndingUnlocked) {
        g.dialogue = {
          name: "COMMAND LIFT / SIGNAL RECEIVER",
          text: "A recording resolves through the static: “Seal the lower berth. Log its voice as a supply fault. No crew is to ride the lift.” The sender is listed as B.G.",
        };
        publish();
      } else {
        report(g.progress.rank >= 3
          ? "Command lift remains sealed under direct authority of the Brizz General."
          : "Command lift locked. Deck Specialist clearance required.");
      }
      return;
    }
    if (target.kind === "canteen") {
      report(g.progress.rank >= 2 ? "Canteen ration logged. Mara says the General's order arrived without a sender tag." : "Canteen is open to station crew. Check in with Mara.");
      return;
    }
    if (target.kind === "operations") report("Operations deck: dispatches route through the shift board.");
  }, [completeMission, publish, report]);

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
      if (event.key === "Escape") {
        if (gameRef.current.dialogue) {
          gameRef.current.dialogue = null;
          publish();
        } else {
          setMissionMenuOpen(false);
          setUpgradeMenuOpen(false);
          setConfirmFullReset(false);
        }
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("button, input, [role='dialog'], .gp-modal, .gp-panel")) return;
      if (gameRef.current.dialogue) return;
      const dir = mapKey(event.key);
      if (dir && !event.repeat) {
        heldRef.current.add(dir);
        event.preventDefault();
      }
      if ((event.key === "e" || event.key === "E" || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        interact();
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
      if (arrivalOpen || missionMenuOpen || upgradeMenuOpen || confirmFullReset || g.dialogue) heldRef.current.clear();
      const speed = 3.5 * dt;
      const input = heldRef.current;
      let dx = (input.has("right") ? 1 : 0) - (input.has("left") ? 1 : 0);
      let dy = (input.has("down") ? 1 : 0) - (input.has("up") ? 1 : 0);
      const mag = Math.hypot(dx, dy) || 1;
      dx = dx / mag * speed; dy = dy / mag * speed;
      const canOccupy = (x: number, y: number) => {
        if (x < -14 || x > 14 || y < -13 || y > 14) return false;
        return !WALLS.some((w) => x > w.x - .38 && x < w.x + w.w + .38 && y > w.y - .35 && y < w.y + w.h + .35);
      };
      if (canOccupy(g.player.x + dx, g.player.y)) g.player.x += dx;
      if (canOccupy(g.player.x, g.player.y + dy)) g.player.y += dy;
      const seconds = now / 1000;
      const npcPositions = NPCS.map((npc) => ({
        ...npc,
        position: {
          x: npc.x + (reducedRef.current ? 0 : Math.sin(seconds * .48 + npc.phase) * npc.patrol),
          y: npc.y + (reducedRef.current ? 0 : Math.cos(seconds * .33 + npc.phase) * .16),
        },
      }));
      const activeMission = g.progress.activeMission;
      const active: Interaction[] = [
        { id: "terminal", label: "Shift terminal", kind: "terminal", x: 0, y: -1.6 },
        { id: "cabin", label: "Cabin upgrade terminal", kind: "cabin", x: -3.1, y: -2.7 },
        { id: "canteen", label: "Canteen counter", kind: "canteen", x: -8.1, y: .3 },
        { id: "operations", label: "Operations deck", kind: "operations", x: 11.5, y: -3.0 },
        { id: "lift", label: "Command lift", kind: "lift", x: 7.25, y: 9.8 },
        ...npcPositions.map((npc) => ({ id: npc.id, label: npc.name, kind: "npc" as const, x: npc.position.x, y: npc.position.y })),
        ...(activeMission?.type === "supply"
          ? ITEMS.filter((item) => !activeMission.objectives.includes(item.id)).map((item) => ({ id: item.id, label: item.name, kind: "item" as const, x: item.x, y: item.y }))
          : []),
        ...(activeMission?.type === "repair" && !activeMission.objectives.includes("relay-repaired")
          ? [{ id: "relay", label: "Maintenance relay", kind: "repair" as const, x: 1.9, y: 10.6 }]
          : []),
        ...(activeMission?.type === "delivery" && !activeMission.objectives.includes("dispatch-picked")
          ? [{ id: "dispatch-packet", label: "Dispatch packet", kind: "dispatch" as const, x: 7.6, y: -3.0 }]
          : []),
      ];
      const nearest = active.map((target) => ({ target, d: distance(g.player, target) })).filter((v) => v.d < 1.35).sort((a, b) => a.d - b.d)[0];
      const nextNearby = nearest?.target ?? null;
      if (g.nearby?.id !== nextNearby?.id) { g.nearby = nextNearby; publish(); }
      if (!reducedRef.current) {
        g.camera.x += (g.player.x - g.camera.x) * Math.min(1, dt * 5);
        g.camera.y += (g.player.y - g.camera.y) * Math.min(1, dt * 5);
      } else { g.camera.x = g.player.x; g.camera.y = g.player.y; }
      const scale = Math.max(8, Math.min(26, width / 39));
      const project = (x: number, y: number) =>
        iso(x - g.camera.x, y - g.camera.y, width / 2, height * .48, scale);

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#10191d"; ctx.fillRect(0, 0, width, height);
      const radial = ctx.createRadialGradient(width * .53, height * .43, 10, width * .53, height * .43, width * .75);
      radial.addColorStop(0, "rgba(58,75,72,.24)"); radial.addColorStop(1, "rgba(5,9,12,.45)");
      ctx.fillStyle = radial; ctx.fillRect(0, 0, width, height);
      const groundA = project(-14, -13), groundB = project(14, -13), groundC = project(14, 14), groundD = project(-14, 14);
      poly([groundA, groundB, groundC, groundD], "#202a2b", "rgba(207,170,117,.25)");
      const floorZone = (x1: number, y1: number, x2: number, y2: number, color: string) => {
        poly([project(x1,y1),project(x2,y1),project(x2,y2),project(x1,y2)],color);
      };
      floorZone(-13, -4, -6, 6, "rgba(172,119,73,.09)");
      floorZone(6, -7, 13, 5, "rgba(91,147,155,.09)");
      floorZone(-4, 7, 6, 14, "rgba(119,151,97,.09)");
      floorZone(7, 6, 13, 14, "rgba(176,86,78,.08)");
      ctx.strokeStyle = "rgba(193,169,128,.11)"; ctx.lineWidth = 1;
      for (let i = -14; i <= 14; i += 1) {
        const a = project(i, -13), b = project(i, 14), c = project(-14, i), d = project(14, i);
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
      WALLS.forEach((wall, index) => drawStructure(wall.x, wall.y, wall.w, wall.h, wall.label, index === 0 ? "#34464a" : index >= 7 ? "#304044" : "#2e3c40", index === 0 ? 1.4 : index >= 7 ? 1.2 : .8));
      ROOM_LABELS.forEach((room) => {
        const p = project(room.x, room.y);
        ctx.fillStyle = room.color;
        ctx.font = "bold 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(room.name, p.x, p.y);
      });
      // Cabin signal window and terminal console
      const cabinWindow = project(-3.4, -4.55);
      ctx.fillStyle = "rgba(229,168,93,.72)"; ctx.fillRect(cabinWindow.x-8, cabinWindow.y-12, 16, 7);
      const term = project(0, -1.6);
      ctx.fillStyle = "#182326"; ctx.fillRect(term.x-15, term.y-19, 30, 23);
      ctx.fillStyle = "#e1a965"; ctx.fillRect(term.x-10, term.y-15, 20, 8);
      ctx.fillStyle = "rgba(229,168,93,.25)"; ctx.fillRect(term.x-20, term.y+3, 40, 3);
      const relay = project(1.5, 10.6);
      ctx.fillStyle = "#192522"; ctx.fillRect(relay.x - 13, relay.y - 18, 26, 22);
      ctx.fillStyle = activeMission?.type === "repair" && activeMission.objectives.includes("relay-repaired") ? "#9bd58e" : "#8db6a5";
      ctx.fillRect(relay.x - 7, relay.y - 14, 14, 6);
      ctx.fillStyle = "#df9a56"; ctx.fillRect(relay.x - 3, relay.y - 4, 6, 3);
      const dispatch = project(7.6, -3);
      ctx.fillStyle = "#132026"; ctx.fillRect(dispatch.x - 10, dispatch.y - 12, 20, 14);
      ctx.fillStyle = "#dfb371"; ctx.fillRect(dispatch.x - 5, dispatch.y - 9, 10, 6);
      const lift = project(10.2, 7.2);
      ctx.strokeStyle = "rgba(224,113,99,.86)"; ctx.lineWidth = 2;
      ctx.strokeRect(lift.x - 16, lift.y - 20, 32, 25);
      ctx.fillStyle = "#dc7b70"; ctx.font = "bold 10px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText("LOCKED", lift.x, lift.y - 6);
      // Supply objects remain visible; mission progress controls their active glow.
      ITEMS.forEach((item, index) => {
        const collected = activeMission?.type === "supply" && activeMission.objectives.includes(item.id);
        if (collected) return;
        const p = project(item.x, item.y);
        ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(p.x, p.y+5, 12, 5, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = activeMission?.type === "supply" ? 1 : .55;
        ctx.fillStyle = item.color; ctx.fillRect(p.x-7, p.y-8, 14, 10);
        ctx.strokeStyle = "rgba(255,239,197,.65)"; ctx.strokeRect(p.x-7, p.y-8, 14, 10);
        if (activeMission?.type === "supply") { ctx.fillStyle = "rgba(229,168,93,.75)"; ctx.beginPath(); ctx.arc(p.x,p.y-14,2,0,Math.PI*2); ctx.fill(); }
        ctx.globalAlpha = 1;
      });
      // NPCs and player, drawn in depth order.
      const actors = [
        ...npcPositions.map((n) => ({ x:n.position.x,y:n.position.y,color:n.coat,name:n.name,player:false })),
        { x:g.player.x,y:g.player.y,color:g.progress.rank >= 3 ? "#b58ce0" : g.progress.rank === 2 ? "#9dbda4" : "#dfb371",name:"You",player:true },
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
  }, [publish, arrivalOpen, missionMenuOpen, upgradeMenuOpen, confirmFullReset]);

  const restartShift = () => {
    heldRef.current.clear();
    gameRef.current.player = { x: 0, y: 0 };
    gameRef.current.camera = { x: 0, y: 0 };
    gameRef.current.nearby = null;
    gameRef.current.dialogue = null;
    setMissionMenuOpen(false);
    setUpgradeMenuOpen(false);
    report("Shift restarted. Saved credits, rank, upgrades, and mission progress are unchanged.");
  };

  const beginShift = () => {
    if (!gameRef.current.progress.arrivalSeen) {
      commitProgress({ ...gameRef.current.progress, arrivalSeen: true });
    }
    setArrivalOpen(false);
    report("First shift started. The crew is waiting on the station deck.");
  };

  const fullReset = () => {
    clearProgress();
    const fresh = createInitialProgress();
    gameRef.current = {
      player: { x: 0, y: 0 },
      camera: { x: 0, y: 0 },
      progress: fresh,
      nearby: null,
      dialogue: null,
      feedback: "Save cleared. Begin a new first shift.",
      feedbackUntil: 0,
    };
    heldRef.current.clear();
    setArrivalOpen(true);
    setMissionMenuOpen(false);
    setUpgradeMenuOpen(false);
    setConfirmFullReset(false);
    publish();
  };

  const buyUpgrade = (upgrade: UpgradeId) => {
    const next = purchaseCabinUpgrade(gameRef.current.progress, upgrade);
    if (next === gameRef.current.progress) {
      report(gameRef.current.progress.upgrades.includes(upgrade)
        ? "That cabin upgrade is already installed."
        : "Not enough credits for this cabin upgrade.");
      return;
    }
    commitProgress(next);
    report(`${upgrade === "tool-rack" ? "Tool rack" : "Signal receiver"} installed in your cabin.`);
  };

  const markOrderRead = () => {
    const current = gameRef.current.progress;
    commitProgress({ ...current, firstShiftEndingSeen: true });
  };

  const hold = (direction: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (arrivalOpen || missionMenuOpen || upgradeMenuOpen || confirmFullReset || gameRef.current.dialogue) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      heldRef.current.add(direction);
    },
    onPointerUp: () => heldRef.current.delete(direction),
    onPointerCancel: () => heldRef.current.delete(direction),
    onLostPointerCapture: () => heldRef.current.delete(direction),
  });
  const activeMission = view.progress.activeMission;
  const supplyCount = activeMission?.type === "supply"
    ? ["filter", "coupler", "parcel"].filter((id) => activeMission.objectives.includes(id)).length
    : 0;
  const objective = !activeMission
    ? view.progress.firstShiftEndingUnlocked
      ? "The strange command order is on file. The lift remains locked."
      : "No active assignment. Visit the shift terminal to choose a repeatable job."
    : activeMission.type === "supply"
      ? `Collect station supplies, then report to the terminal. ${supplyCount} of 3 secured.`
      : activeMission.type === "repair"
        ? activeMission.objectives.includes("relay-repaired")
          ? "Relay restored. Return to the shift terminal to file the repair."
          : "Reach the maintenance corridor and restore the relay."
        : activeMission.objectives.includes("dispatch-picked")
          ? `Deliver the packet to ${activeMission.employeeTarget === "mara" ? "Mara Venn" : "Tovin Rusk"}.`
          : "Pick up the dispatch packet on the operations deck.";
  const prompt = view.nearby
    ? `${view.nearby.kind === "item" ? "Collect" : view.nearby.kind === "repair" ? "Repair" : view.nearby.kind === "dispatch" ? "Pick up" : "Interact"}: ${view.nearby.label} — press E`
    : "Explore the station. Mission terminal is on the main deck.";
  const objectiveLabel = activeMission
    ? `${MISSION_NAMES[activeMission.type]} · ${activeMission.id.toUpperCase()}`
    : view.progress.firstShiftEndingUnlocked ? "SHIFT ORDER RECEIVED" : "SHIFT NOTE";
  const isOwned = (upgrade: UpgradeId) => view.progress.upgrades.includes(upgrade);

  return (
    <section className="gp-game" aria-label="GODFORSAKEN PARADISE: The Brizz General’s Station">
      <header className="gp-topbar">
        <div className="gp-brand">
          <div className="gp-kicker">GODFORSAKEN PARADISE · MILESTONE 002</div>
          <h1 className="gp-title">THE BRIZZ GENERAL’S STATION</h1>
        </div>
        <div className="gp-stats" aria-label="Station status">
          <div className="gp-stat">CREDITS<strong>{view.progress.credits}</strong></div>
          <div className="gp-stat">RANK<strong>{missionRankLabel(view.progress.rank)}</strong></div>
          <div className="gp-stat">MISSIONS<strong>{view.progress.completedMissionIds.length}</strong></div>
          <button className="gp-reset" type="button" onClick={restartShift} aria-label="Restart the current shift without clearing saved progression">RESTART SHIFT</button>
          <button className="gp-reset gp-reset-danger" type="button" onClick={() => setConfirmFullReset(true)} aria-label="Clear all saved station progress">RESET SAVE</button>
        </div>
      </header>
      <div className="gp-play-area">
        <canvas
          ref={canvasRef}
          className="gp-canvas"
          aria-label={`Isometric station deck. Player position ${view.player.x.toFixed(1)}, ${view.player.y.toFixed(1)}. ${objective} ${prompt}.`}
          role="img"
        />
        <div className="gp-overlays">
          <div className="gp-objective" aria-label="Current assignment">
            <div className="gp-objective-label">{objectiveLabel}</div>
            <div className="gp-objective-copy">{objective}</div>
            {activeMission?.type === "supply" && <div className="gp-collect-row" aria-label="Supply collection status">
              {ITEMS.map((item) => <span key={item.id} className={`gp-item-chip ${activeMission.objectives.includes(item.id) ? "collected" : ""}`}>{activeMission.objectives.includes(item.id) ? "SECURED" : "PENDING"} · {item.name}</span>)}
            </div>}
            {view.progress.upgrades.length > 0 && <div className="gp-upgrade-strip">CABIN · {view.progress.upgrades.map((item) => item === "tool-rack" ? "TOOL RACK" : "SIGNAL RECEIVER").join(" / ")}</div>}
          </div>
          {view.dialogue ? (
            <div className="gp-dialogue gp-panel" role="dialog" aria-label={`Conversation with ${view.dialogue.name}`} aria-live="polite">
              <div className="gp-dialogue-name">{view.dialogue.name} · crew</div>
              <p className="gp-dialogue-text">{view.dialogue.text}</p>
              <button type="button" onClick={() => { gameRef.current.dialogue = null; publish(); }}>CLOSE · ESC</button>
            </div>
          ) : (
            <div className="gp-prompt" aria-live="polite">{prompt}</div>
          )}
          {view.feedback && <div className="gp-feedback" role="status" aria-live="polite">{view.feedback}</div>}
        </div>

        {missionMenuOpen && !activeMission && (
          <div className="gp-modal gp-panel" role="dialog" aria-modal="true" aria-labelledby="gp-mission-title">
            <div className="gp-dialogue-name">OPERATIONS · SHIFT BOARD</div>
            <h2 id="gp-mission-title">Choose a station assignment</h2>
            <p>Assignments can be repeated. Complete each type to uncover the end-of-shift order.</p>
            <div className="gp-choice-list">
              {(["supply", "repair", "delivery"] as MissionType[]).map((type) => (
                <button key={type} type="button" onClick={() => acceptMission(type)}>
                  <strong>{MISSION_NAMES[type]}</strong>
                  <span>{MISSION_DESCRIPTIONS[type]}</span>
                  <small>REWARD · {type === "supply" ? 100 : type === "repair" ? "120 + tool rack bonus" : "110 + receiver bonus"} CREDITS</small>
                </button>
              ))}
            </div>
            <button className="gp-modal-close" type="button" onClick={() => setMissionMenuOpen(false)}>CLOSE</button>
          </div>
        )}

        {upgradeMenuOpen && (
          <div className="gp-modal gp-panel" role="dialog" aria-modal="true" aria-labelledby="gp-upgrade-title">
            <div className="gp-dialogue-name">CABIN 04 · PERSONAL UPGRADES</div>
            <h2 id="gp-upgrade-title">Station-hand equipment</h2>
            <p>Credits are saved locally on this device. Upgrades remain after a shift restart.</p>
            <div className="gp-choice-list">
              <button type="button" disabled={isOwned("tool-rack") || view.progress.credits < 120} onClick={() => buyUpgrade("tool-rack")}>
                <strong>Tool rack · 120 credits {isOwned("tool-rack") ? "· INSTALLED" : ""}</strong>
                <span>Improves equipment-repair mission pay by 30 credits.</span>
              </button>
              <button type="button" disabled={isOwned("signal-receiver") || view.progress.credits < 180} onClick={() => buyUpgrade("signal-receiver")}>
                <strong>Signal receiver · 180 credits {isOwned("signal-receiver") ? "· INSTALLED" : ""}</strong>
                <span>Unlocks a recorded command-lift transmission after the first shift.</span>
              </button>
            </div>
            <button className="gp-modal-close" type="button" onClick={() => setUpgradeMenuOpen(false)}>CLOSE</button>
          </div>
        )}

        {arrivalOpen && (
          <div className="gp-modal gp-panel gp-story-modal" role="dialog" aria-modal="true" aria-labelledby="gp-arrival-title">
            <div className="gp-dialogue-name">STATION ARRIVAL · FIRST SHIFT</div>
            <h2 id="gp-arrival-title">Your cabin is ready. The station is not.</h2>
            <p>Two crew members mention the Brizz General, but neither agrees on when the General last visited. Start with a routine assignment and keep the shift log current.</p>
            <div className="gp-story-controls">MOVE · WASD / ARROWS &nbsp; INTERACT · E &nbsp; TOUCH · DIRECTION PAD + INTERACT</div>
            <button className="gp-primary-action" type="button" onClick={beginShift}>BEGIN FIRST SHIFT</button>
          </div>
        )}

        {confirmFullReset && (
          <div className="gp-modal gp-panel gp-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="gp-reset-title">
            <div className="gp-dialogue-name">LOCAL SAVE</div>
            <h2 id="gp-reset-title">Clear all station progress?</h2>
            <p>This removes saved credits, rank, completed assignments, upgrades, and story progress from this browser.</p>
            <div className="gp-confirm-actions">
              <button type="button" onClick={() => setConfirmFullReset(false)}>CANCEL</button>
              <button type="button" className="gp-danger-action" onClick={fullReset}>CLEAR SAVE</button>
            </div>
          </div>
        )}

        {!arrivalOpen && view.progress.firstShiftEndingUnlocked && !view.progress.firstShiftEndingSeen && (
          <div className="gp-modal gp-panel gp-story-modal" role="dialog" aria-modal="true" aria-labelledby="gp-order-title">
            <div className="gp-dialogue-name">PRIORITY ORDER · COMMAND LIFT</div>
            <h2 id="gp-order-title">A new order appears in the shift log.</h2>
            <blockquote>“Seal the lower berth. Log its voice as a supply fault. No crew is to ride the lift.”</blockquote>
            <p>Authorization: <strong>THE BRIZZ GENERAL</strong>. The command lift remains visibly locked.</p>
            <button className="gp-primary-action" type="button" onClick={markOrderRead}>ACKNOWLEDGE ORDER</button>
          </div>
        )}
      </div>
      <footer className="gp-bottom">
        <div className="gp-controls-copy">
          <b>MOVE</b> WASD / ARROWS &nbsp;·&nbsp; <b>INTERACT</b> E &nbsp;·&nbsp; <b>CLOSE DIALOGUE</b> ESC
          <br />Canteen · Operations · Maintenance · Command lift remains locked.
        </div>
        <div className="gp-touch-controls" aria-label="Touch movement controls">
          <button className="gp-touch-up" type="button" aria-label="Move up" {...hold("up")}>▲</button>
          <button className="gp-touch-left" type="button" aria-label="Move left" {...hold("left")}>◀</button>
          <button className="gp-touch-down" type="button" aria-label="Move down" {...hold("down")}>▼</button>
          <button className="gp-touch-right" type="button" aria-label="Move right" {...hold("right")}>▶</button>
        </div>
        <button className="gp-interact" type="button" disabled={!view.nearby || arrivalOpen || missionMenuOpen || upgradeMenuOpen || confirmFullReset} onClick={interact}>
          {view.nearby?.kind === "item" ? "COLLECT ITEM" : view.nearby?.kind === "repair" ? "REPAIR RELAY" : view.nearby?.kind === "dispatch" ? "PICK UP PACKET" : "INTERACT"}
        </button>
      </footer>
      <div className="gp-sr-status" aria-live="polite">
        Player in The Brizz General’s Station. {objective} {prompt} Credits: {view.progress.credits}. Rank: {missionRankLabel(view.progress.rank)}.
      </div>
    </section>
  );
}

export default GodforsakenParadiseGame;
