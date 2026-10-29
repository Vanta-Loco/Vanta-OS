import type { DistrictMapLocation } from "./DistrictMapView";

export const DISTRICT_MAP_WIDTH = 1000;
export const DISTRICT_MAP_HEIGHT = 700;
export const DISTRICT_MAP_PADDING = 110;

export type DistrictMapBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type DistrictMapPoint = { x: number; y: number };

export function getDistrictMapBounds(locations: Pick<DistrictMapLocation, "x" | "z">[]): DistrictMapBounds {
  if (!locations.length) return { minX: -160, maxX: 160, minZ: -120, maxZ: 120 };
  const xs = locations.map((point) => point.x);
  const zs = locations.map((point) => point.z);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanZ = Math.max(...zs) - Math.min(...zs);
  const padX = Math.max(spanX * 0.22, 42);
  const padZ = Math.max(spanZ * 0.22, 42);
  return {
    minX: Math.min(...xs) - padX,
    maxX: Math.max(...xs) + padX,
    minZ: Math.min(...zs) - padZ,
    maxZ: Math.max(...zs) + padZ,
  };
}

/** Shared District-world (X/Z) to city-map (SVG X/Y) transform. */
export function projectDistrictWorldPoint(
  x: number,
  z: number,
  bounds: DistrictMapBounds,
): DistrictMapPoint {
  return {
    x: DISTRICT_MAP_PADDING + ((x - bounds.minX) / (bounds.maxX - bounds.minX)) *
      (DISTRICT_MAP_WIDTH - DISTRICT_MAP_PADDING * 2),
    y: DISTRICT_MAP_PADDING + ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) *
      (DISTRICT_MAP_HEIGHT - DISTRICT_MAP_PADDING * 2),
  };
}

/** Inverse of projectDistrictWorldPoint for route-network nodes authored in map space. */
export function unprojectDistrictMapPoint(
  x: number,
  y: number,
  bounds: DistrictMapBounds,
): { x: number; z: number } {
  return {
    x: bounds.minX + ((x - DISTRICT_MAP_PADDING) / (DISTRICT_MAP_WIDTH - DISTRICT_MAP_PADDING * 2)) *
      (bounds.maxX - bounds.minX),
    z: bounds.minZ + ((y - DISTRICT_MAP_PADDING) / (DISTRICT_MAP_HEIGHT - DISTRICT_MAP_PADDING * 2)) *
      (bounds.maxZ - bounds.minZ),
  };
}

export const DISTRICT_ZONES = [
  { name: "INDUSTRIAL", points: "42,35 488,35 454,223 270,278 42,234", tint: "amber", labelX: 166, labelY: 67 },
  { name: "TECH", points: "488,35 958,35 958,255 704,293 454,223", tint: "violet", labelX: 743, labelY: 67 },
  { name: "RESIDENTIAL", points: "42,234 270,278 454,223 512,426 354,652 42,652", tint: "blue", labelX: 171, labelY: 625 },
  { name: "COMMERCIAL", points: "454,223 704,293 958,255 958,652 574,652 512,426", tint: "rose", labelX: 797, labelY: 625 },
] as const;

export const DISTRICT_BLOCKS = [
  [70, 77, 80, 42], [178, 78, 74, 42], [279, 78, 74, 42], [377, 77, 77, 42],
  [567, 77, 75, 42], [671, 77, 74, 42], [774, 77, 78, 42], [873, 77, 54, 42],
  [70, 137, 80, 45], [177, 137, 72, 45], [280, 137, 73, 45], [376, 137, 78, 45],
  [567, 137, 75, 45], [671, 137, 75, 45], [774, 137, 78, 45], [873, 137, 54, 45],
  [70, 292, 82, 58], [178, 295, 74, 56], [277, 294, 77, 58], [386, 285, 57, 68],
  [564, 310, 74, 53], [666, 312, 82, 55], [772, 302, 78, 59], [873, 294, 54, 62],
  [70, 382, 82, 55], [177, 382, 76, 55], [280, 382, 73, 55], [386, 382, 57, 55],
  [564, 382, 74, 55], [666, 382, 82, 55], [772, 382, 78, 55], [873, 382, 54, 55],
  [70, 478, 82, 62], [177, 478, 76, 62], [280, 478, 73, 62], [386, 478, 57, 62],
  [564, 478, 74, 62], [666, 478, 82, 62], [772, 478, 78, 62], [873, 478, 54, 62],
] as const;
