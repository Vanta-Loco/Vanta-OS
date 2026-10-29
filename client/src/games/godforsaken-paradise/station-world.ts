import type { MissionType } from "./progression";

export type StationLocalPoint = { x: number; y: number };

export const STATION_BOUNDS = {
  minX: -14,
  maxX: 14,
  minY: -13,
  maxY: 14,
} as const;

export const STATION_MAP_SIZE = { width: 280, height: 270 } as const;

export const STATION_SPAWN: StationLocalPoint = { x: 0, y: 0 };

export const STATION_WALLS = [
  { x: -4.6, y: -5.3, w: 4.1, h: 2.1, label: "CABIN 04" },
  { x: 2.8, y: -5.5, w: 2.6, h: 2.0, label: "SUPPLY LOCKER" },
  { x: -1.0, y: 4.6, w: 3.0, h: 1.35, label: "CABLE RUN" },
  { x: -12.0, y: -1.8, w: 3.0, h: 1.1, label: "CANTEEN COUNTER" },
  { x: -11.0, y: 2.1, w: 2.0, h: 1.3, label: "TABLES" },
  { x: 8.0, y: -5.7, w: 3.4, h: 1.3, label: "OPS CONSOLE" },
  { x: 8.1, y: -1.6, w: 3.4, h: 1.2, label: "SHIFT BOARD" },
  { x: -1.2, y: 9.0, w: 2.4, h: 1.2, label: "REPAIR RELAY" },
  { x: 8.2, y: 7.8, w: 4.0, h: 4.6, label: "COMMAND LIFT" },
] as const;

export const STATION_ROOMS = [
  {
    id: "cabin",
    name: "STARTER CABIN 04",
    shortName: "CABIN 04",
    x: -9,
    y: -7.7,
    width: 9.4,
    height: 5,
    labelX: -4.2,
    labelY: -6.2,
    color: "#b88754",
  },
  {
    id: "canteen",
    name: "CANTEEN",
    shortName: "CANTEEN",
    x: -13.6,
    y: -7.8,
    width: 6.8,
    height: 13.3,
    labelX: -10.2,
    labelY: -4,
    color: "#c79b5c",
  },
  {
    id: "main-deck",
    name: "MAIN DECK",
    shortName: "MAIN DECK",
    x: -7.2,
    y: -2.4,
    width: 14.5,
    height: 8.2,
    labelX: 0,
    labelY: 1.5,
    color: "#6b8b8b",
  },
  {
    id: "supply-locker",
    name: "SUPPLY LOCKER",
    shortName: "LOCKER",
    x: 2.1,
    y: -7.7,
    width: 4.4,
    height: 4.4,
    labelX: 4.3,
    labelY: -7,
    color: "#8e7da8",
  },
  {
    id: "operations",
    name: "OPERATIONS DECK",
    shortName: "OPERATIONS",
    x: 6.3,
    y: -7.8,
    width: 7.1,
    height: 7.3,
    labelX: 9.6,
    labelY: -3.4,
    color: "#6e9b9a",
  },
  {
    id: "maintenance",
    name: "MAINTENANCE CORRIDOR",
    shortName: "MAINTENANCE",
    x: -3.6,
    y: 6.3,
    width: 6.8,
    height: 6.8,
    labelX: 1,
    labelY: 12.1,
    color: "#7e9b74",
  },
  {
    id: "command-lift",
    name: "COMMAND LIFT · LOCKED",
    shortName: "LIFT · LOCKED",
    x: 7.7,
    y: 7.2,
    width: 5.2,
    height: 5.8,
    labelX: 10.3,
    labelY: 11.5,
    color: "#b46d65",
    locked: true,
  },
] as const;

export const STATION_PATHS: { id: string; points: readonly StationLocalPoint[] }[] = [
  { id: "main-walk", points: [{ x: 0, y: -1.7 }, { x: 0, y: 3.6 }, { x: 2.7, y: 3.6 }, { x: 2.7, y: 6.8 }, { x: 1.9, y: 10.6 }] },
  { id: "canteen-walk", points: [{ x: 0, y: 0 }, { x: -5.8, y: 0 }, { x: -8.2, y: 0.3 }] },
  { id: "operations-walk", points: [{ x: 0, y: -1.7 }, { x: 6.9, y: -1.7 }, { x: 6.9, y: -3 }, { x: 7.6, y: -3 }] },
  { id: "cabin-walk", points: [{ x: 0, y: -1.7 }, { x: -3.1, y: -2.7 }] },
] as const;

export const STATION_INTERACTABLES = [
  { id: "terminal", label: "Shift terminal", shortLabel: "TERMINAL", icon: "T", kind: "terminal", x: 0, y: -1.6 },
  { id: "cabin", label: "Cabin upgrade terminal", shortLabel: "CABIN", icon: "C", kind: "cabin", x: -3.1, y: -2.7 },
  { id: "canteen", label: "Canteen counter", shortLabel: "CANTEEN", icon: "N", kind: "canteen", x: -8.1, y: 0.3 },
  { id: "operations", label: "Operations deck", shortLabel: "OPS", icon: "O", kind: "operations", x: 11.5, y: -3 },
  { id: "lift", label: "Command lift", shortLabel: "LIFT", icon: "L", kind: "lift", x: 7.25, y: 9.8, locked: true },
] as const;

export const STATION_EXIT = {
  id: "vanta-exit",
  label: "Vanta Worlds portal",
  shortLabel: "EXIT",
  icon: "↖",
  ...STATION_SPAWN,
};

export const STATION_ITEMS = [
  { id: "filter", name: "Air filter", shortLabel: "FILTER", x: -5.2, y: -2.8, color: "#b9d37d" },
  { id: "coupler", name: "Power coupler", shortLabel: "COUPLER", x: 4.9, y: -1.5, color: "#df9a56" },
  { id: "parcel", name: "Sealed parcel", shortLabel: "PARCEL", x: 2.7, y: 5.2, color: "#d6c293" },
] as const;

export const STATION_NPCS = [
  { id: "mara", name: "Mara Venn", shortLabel: "M", x: -5.4, y: 3.4, coat: "#a55f4b", patrol: 0.38, phase: 0 },
  { id: "tovin", name: "Tovin Rusk", shortLabel: "T", x: 5.4, y: 3.8, coat: "#527e86", patrol: 0.48, phase: Math.PI },
] as const;

export const STATION_REPAIR_RELAY = { id: "relay", label: "Maintenance relay", shortLabel: "RELAY", x: 1.9, y: 10.6 } as const;
export const STATION_DISPATCH_PACKET = { id: "dispatch-packet", label: "Dispatch packet", shortLabel: "PACKET", x: 7.6, y: -3 } as const;

export type StationObjectivePin = {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  followNpcId?: string;
};

type MissionProjection = {
  type: MissionType;
  objectives: string[];
  employeeTarget: "mara" | "tovin";
} | null;

export function getStationObjectivePins(mission: MissionProjection): StationObjectivePin[] {
  if (!mission) return [];
  if (mission.type === "supply") {
    const remaining = STATION_ITEMS.filter((item) => !mission.objectives.includes(item.id));
    if (remaining.length) {
      return remaining.map((item) => ({
        id: `objective-${item.id}`,
        label: `Collect ${item.name}`,
        shortLabel: item.shortLabel,
        x: item.x,
        y: item.y,
      }));
    }
    return mission.objectives.includes("terminal-report")
      ? []
      : [{ id: "objective-report", label: "Report to shift terminal", shortLabel: "REPORT", x: 0, y: -1.6 }];
  }
  if (mission.type === "repair") {
    return mission.objectives.includes("relay-repaired")
      ? mission.objectives.includes("terminal-report")
        ? []
        : [{ id: "objective-report", label: "Report to shift terminal", shortLabel: "REPORT", x: 0, y: -1.6 }]
      : [{
          id: "objective-relay",
          label: STATION_REPAIR_RELAY.label,
          shortLabel: STATION_REPAIR_RELAY.shortLabel,
          x: STATION_REPAIR_RELAY.x,
          y: STATION_REPAIR_RELAY.y,
        }];
  }
  if (!mission.objectives.includes("dispatch-picked")) {
    return [{
      id: "objective-dispatch",
      label: STATION_DISPATCH_PACKET.label,
      shortLabel: STATION_DISPATCH_PACKET.shortLabel,
      x: STATION_DISPATCH_PACKET.x,
      y: STATION_DISPATCH_PACKET.y,
    }];
  }
  const target = STATION_NPCS.find((npc) => npc.id === mission.employeeTarget);
  return target
    ? [{
        id: "objective-delivery",
        label: `Deliver to ${target.name}`,
        shortLabel: `TO ${target.shortLabel}`,
        x: target.x,
        y: target.y,
        followNpcId: target.id,
      }]
    : [];
}

export function stationLocalToMap(point: StationLocalPoint) {
  return {
    x: ((point.x - STATION_BOUNDS.minX) / (STATION_BOUNDS.maxX - STATION_BOUNDS.minX)) * STATION_MAP_SIZE.width,
    y: ((point.y - STATION_BOUNDS.minY) / (STATION_BOUNDS.maxY - STATION_BOUNDS.minY)) * STATION_MAP_SIZE.height,
  };
}

export function stationRectToMap(rect: { x: number; y: number; width: number; height: number }) {
  const topLeft = stationLocalToMap({ x: rect.x, y: rect.y });
  const bottomRight = stationLocalToMap({ x: rect.x + rect.width, y: rect.y + rect.height });
  return { ...topLeft, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}
