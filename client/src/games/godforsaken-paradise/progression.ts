export const PROGRESS_SAVE_KEY = "gfp.first-shift.progress";
export const PROGRESS_SAVE_VERSION = 2;

export const MISSION_TYPES = ["supply", "repair", "delivery"] as const;
export type MissionType = (typeof MISSION_TYPES)[number];
export const UPGRADE_IDS = ["tool-rack", "signal-receiver"] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export interface ActiveMission {
  id: string;
  type: MissionType;
  objectives: string[];
  employeeTarget: "mara" | "tovin";
}

export interface ProgressSave {
  version: 2;
  credits: number;
  rank: number;
  missionsStarted: number;
  completedMissionIds: string[];
  completedMissionTypes: MissionType[];
  activeMission: ActiveMission | null;
  upgrades: UpgradeId[];
  arrivalSeen: boolean;
  firstShiftEndingUnlocked: boolean;
  firstShiftEndingSeen: boolean;
}

export interface StringStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const MAX_CREDITS = 10_000_000;
const MAX_RECORDS = 10_000;
const OBJECTIVES: Record<MissionType, readonly string[]> = {
  supply: ["filter", "coupler", "parcel", "terminal-report"],
  repair: ["relay-repaired", "terminal-report"],
  delivery: ["dispatch-picked", "delivered-to-mara", "delivered-to-tovin"],
};
const UPGRADE_COST: Record<UpgradeId, number> = {
  "tool-rack": 120,
  "signal-receiver": 180,
};

export function createInitialProgress(): ProgressSave {
  return {
    version: PROGRESS_SAVE_VERSION,
    credits: 0,
    rank: 1,
    missionsStarted: 0,
    completedMissionIds: [],
    completedMissionTypes: [],
    activeMission: null,
    upgrades: [],
    arrivalSeen: false,
    firstShiftEndingUnlocked: false,
    firstShiftEndingSeen: false,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isMissionType(value: unknown): value is MissionType {
  return typeof value === "string" && MISSION_TYPES.includes(value as MissionType);
}

function isUpgradeId(value: unknown): value is UpgradeId {
  return typeof value === "string" && UPGRADE_IDS.includes(value as UpgradeId);
}

function safeStringList(value: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(
    (entry): entry is string =>
      typeof entry === "string" &&
      entry.length > 0 &&
      entry.length <= 96 &&
      (!allowed || allowed.includes(entry)),
  ))).slice(0, MAX_RECORDS);
}

function sanitizeActiveMission(value: unknown): ActiveMission | null {
  if (!isRecord(value) || !isMissionType(value.type)) return null;
  const employeeTarget = value.employeeTarget === "mara" || value.employeeTarget === "tovin"
    ? value.employeeTarget
    : "mara";
  const objectives = safeStringList(value.objectives, OBJECTIVES[value.type]);
  const id = typeof value.id === "string" && /^[a-z]+-\d+$/.test(value.id)
    ? value.id.slice(0, 96)
    : "";
  if (!id) return null;
  return { id, type: value.type, objectives, employeeTarget };
}

export function decodeProgressSave(raw: string | null): ProgressSave {
  if (!raw) return createInitialProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== PROGRESS_SAVE_VERSION) {
      return createInitialProgress();
    }

    const completedMissionIds = safeStringList(parsed.completedMissionIds);
    const completedMissionTypes = Array.from(new Set(
      Array.isArray(parsed.completedMissionTypes)
        ? parsed.completedMissionTypes.filter(isMissionType)
        : [],
    ));
    const upgrades = Array.from(new Set(
      Array.isArray(parsed.upgrades) ? parsed.upgrades.filter(isUpgradeId) : [],
    ));
    const credits = typeof parsed.credits === "number" && Number.isFinite(parsed.credits)
      ? Math.max(0, Math.min(MAX_CREDITS, Math.floor(parsed.credits)))
      : 0;
    const storedRank = typeof parsed.rank === "number" && Number.isFinite(parsed.rank)
      ? Math.floor(parsed.rank)
      : 1;
    const rank = Math.max(1, Math.min(3, storedRank));
    const missionsStarted = typeof parsed.missionsStarted === "number" && Number.isFinite(parsed.missionsStarted)
      ? Math.max(completedMissionIds.length, Math.min(MAX_RECORDS, Math.floor(parsed.missionsStarted)))
      : completedMissionIds.length;

    return {
      version: PROGRESS_SAVE_VERSION,
      credits,
      rank,
      missionsStarted,
      completedMissionIds,
      completedMissionTypes,
      activeMission: sanitizeActiveMission(parsed.activeMission),
      upgrades,
      arrivalSeen: parsed.arrivalSeen === true,
      firstShiftEndingUnlocked: parsed.firstShiftEndingUnlocked === true,
      firstShiftEndingSeen: parsed.firstShiftEndingSeen === true,
    };
  } catch {
    return createInitialProgress();
  }
}

export function encodeProgressSave(progress: ProgressSave): string {
  return JSON.stringify(decodeProgressSave(JSON.stringify(progress)));
}

function browserStorage(): StringStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadProgress(storage = browserStorage()): ProgressSave {
  try {
    return storage ? decodeProgressSave(storage.getItem(PROGRESS_SAVE_KEY)) : createInitialProgress();
  } catch {
    return createInitialProgress();
  }
}

export function persistProgress(progress: ProgressSave, storage = browserStorage()): void {
  try {
    storage?.setItem(PROGRESS_SAVE_KEY, encodeProgressSave(progress));
  } catch {
    // Storage can be disabled or full; gameplay remains usable in memory.
  }
}

export function clearProgress(storage = browserStorage()): void {
  try {
    storage?.removeItem(PROGRESS_SAVE_KEY);
  } catch {
    // A blocked storage API must not crash the game.
  }
}

export function missionForNextShift(
  progress: ProgressSave,
  type: MissionType,
): ProgressSave {
  if (progress.activeMission || progress.missionsStarted >= MAX_RECORDS) return progress;
  const sequence = progress.missionsStarted + 1;
  return {
    ...progress,
    missionsStarted: sequence,
    activeMission: {
      id: `${type}-${sequence}`,
      type,
      objectives: [],
      employeeTarget: sequence % 2 === 0 ? "mara" : "tovin",
    },
  };
}

export function recordMissionObjective(
  progress: ProgressSave,
  objective: string,
): ProgressSave {
  const active = progress.activeMission;
  if (!active || !OBJECTIVES[active.type].includes(objective) || active.objectives.includes(objective)) {
    return progress;
  }
  return {
    ...progress,
    activeMission: { ...active, objectives: [...active.objectives, objective] },
  };
}

export function missionReadyForReport(progress: ProgressSave): boolean {
  const active = progress.activeMission;
  if (!active) return false;
  if (active.type === "supply") {
    return ["filter", "coupler", "parcel"].every((id) => active.objectives.includes(id));
  }
  return active.type === "repair" && active.objectives.includes("relay-repaired");
}

function missionReadyToComplete(active: ActiveMission): boolean {
  if (active.type === "supply") {
    return ["filter", "coupler", "parcel", "terminal-report"].every((id) => active.objectives.includes(id));
  }
  if (active.type === "repair") {
    return ["relay-repaired", "terminal-report"].every((id) => active.objectives.includes(id));
  }
  return active.objectives.includes("dispatch-picked") &&
    active.objectives.includes(`delivered-to-${active.employeeTarget}`);
}

const BASE_REWARDS: Record<MissionType, number> = {
  supply: 100,
  repair: 120,
  delivery: 110,
};

export function completeActiveMission(progress: ProgressSave): ProgressSave {
  const active = progress.activeMission;
  if (!active || !missionReadyToComplete(active) || progress.completedMissionIds.includes(active.id)) {
    return progress;
  }
  const bonus = active.type === "repair" && progress.upgrades.includes("tool-rack")
    ? 30
    : active.type === "delivery" && progress.upgrades.includes("signal-receiver")
      ? 20
      : 0;
  const completedMissionIds = [...progress.completedMissionIds, active.id].slice(-MAX_RECORDS);
  const completedMissionTypes = Array.from(new Set([...progress.completedMissionTypes, active.type]));
  const missionsCompleted = completedMissionIds.length;
  const rank = Math.max(progress.rank, missionsCompleted >= 3 ? 3 : missionsCompleted >= 1 ? 2 : 1);
  const firstShiftEndingUnlocked = MISSION_TYPES.every((type) => completedMissionTypes.includes(type));
  return {
    ...progress,
    credits: Math.min(MAX_CREDITS, progress.credits + BASE_REWARDS[active.type] + bonus),
    rank,
    completedMissionIds,
    completedMissionTypes,
    activeMission: null,
    firstShiftEndingUnlocked,
  };
}

export function purchaseCabinUpgrade(
  progress: ProgressSave,
  upgrade: UpgradeId,
): ProgressSave {
  const cost = UPGRADE_COST[upgrade];
  if (progress.upgrades.includes(upgrade) || progress.credits < cost) return progress;
  return {
    ...progress,
    credits: progress.credits - cost,
    upgrades: [...progress.upgrades, upgrade],
  };
}

export function cabinUpgradeCost(upgrade: UpgradeId): number {
  return UPGRADE_COST[upgrade];
}

export function missionRankLabel(rank: number): string {
  if (rank >= 3) return "Deck Specialist";
  if (rank >= 2) return "Station Hand";
  return "Probationary";
}
