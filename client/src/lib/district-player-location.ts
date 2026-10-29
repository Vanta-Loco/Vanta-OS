import { DISTRICT_LANDMARKS } from "@/data/district-landmarks";

const STORAGE_KEY = "vanta.current-district-destination.v1";
const RECORD_VERSION = 1;

export type DistrictPlayerLocation = {
  version: 1;
  coordinateSpace: "district-destination";
  landmarkId: string;
};

const isAllowedLandmarkId = (value: unknown): value is string =>
  typeof value === "string" &&
  DISTRICT_LANDMARKS.some((landmark) =>
    landmark.id === value && landmark.action !== "locked"
  );

export function parseDistrictPlayerLocation(value: unknown): DistrictPlayerLocation | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.version !== RECORD_VERSION ||
    record.coordinateSpace !== "district-destination" ||
    !isAllowedLandmarkId(record.landmarkId)
  ) return null;
  return {
    version: RECORD_VERSION,
    coordinateSpace: "district-destination",
    landmarkId: record.landmarkId,
  };
}

export function loadDistrictPlayerLocation(): DistrictPlayerLocation | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return parseDistrictPlayerLocation(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveDistrictPlayerLocation(landmarkId: string): boolean {
  const record = parseDistrictPlayerLocation({
    version: RECORD_VERSION,
    coordinateSpace: "district-destination",
    landmarkId,
  });
  if (!record) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
