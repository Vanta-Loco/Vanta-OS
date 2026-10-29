import { DISTRICT_LANDMARKS } from "@/data/district-landmarks";
import {
  getDistrictMapBounds,
  projectDistrictWorldPoint,
  unprojectDistrictMapPoint,
  type DistrictMapBounds,
} from "@/components/vanta-district-map/district-map-geometry";

export type DistrictWorldPoint = { x: number; z: number };
export type DistrictNavigationSave = {
  version: 1;
  coordinateSpace: "district-world-xz";
  position: DistrictWorldPoint;
  selectedDestinationId: string | null;
  unlockedDestinationIds: string[];
};
export type DistrictRoute = {
  points: DistrictWorldPoint[];
  distance: number;
  direction: string;
};

const STORAGE_KEY = "vanta.district-navigation.v1";
export const DISTRICT_SAFE_POSITION_LIMIT = 500;
const ROAD_XS = [155, 365, 652, 856] as const;
const ROAD_YS = [116, 365, 450] as const;

export const DEFAULT_DISTRICT_NAVIGATION: DistrictNavigationSave = {
  version: 1,
  coordinateSpace: "district-world-xz",
  position: { x: 0, z: 0 },
  selectedDestinationId: null,
  unlockedDestinationIds: [],
};

const landmarkById = new Map(DISTRICT_LANDMARKS.map((landmark) => [landmark.id, landmark]));

export function isSafeDistrictPosition(value: unknown): value is DistrictWorldPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Record<string, unknown>;
  return typeof point.x === "number" && Number.isFinite(point.x) &&
    typeof point.z === "number" && Number.isFinite(point.z) &&
    Math.abs(point.x) <= DISTRICT_SAFE_POSITION_LIMIT &&
    Math.abs(point.z) <= DISTRICT_SAFE_POSITION_LIMIT;
}

export function parseDistrictNavigationSave(value: unknown): DistrictNavigationSave | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    record.coordinateSpace !== "district-world-xz" ||
    !isSafeDistrictPosition(record.position) ||
    !(record.selectedDestinationId === null ||
      (typeof record.selectedDestinationId === "string" && landmarkById.has(record.selectedDestinationId))) ||
    !Array.isArray(record.unlockedDestinationIds)
  ) return null;

  const validUnlockedIds = record.unlockedDestinationIds.filter(
    (id): id is string => typeof id === "string" &&
      landmarkById.has(id) && landmarkById.get(id)!.action !== "locked",
  );
  const unlockedDestinationIds = validUnlockedIds.filter((id, index) => validUnlockedIds.indexOf(id) === index);
  return {
    version: 1,
    coordinateSpace: "district-world-xz",
    position: { x: record.position.x, z: record.position.z },
    selectedDestinationId: record.selectedDestinationId as string | null,
    unlockedDestinationIds,
  };
}

export function loadDistrictNavigationSave(): DistrictNavigationSave | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseDistrictNavigationSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDistrictNavigationSave(value: DistrictNavigationSave): boolean {
  const valid = parseDistrictNavigationSave(value);
  if (!valid) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}

export function resetDistrictNavigationSave(): void {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function unlockDistrictDestination(
  save: DistrictNavigationSave,
  destinationId: string,
): DistrictNavigationSave {
  const destination = landmarkById.get(destinationId);
  if (!destination || destination.action === "locked") return save;
  return {
    ...save,
    unlockedDestinationIds: save.unlockedDestinationIds.indexOf(destinationId) >= 0
      ? save.unlockedDestinationIds
      : [...save.unlockedDestinationIds, destinationId],
  };
}

export function isFastTravelEligible(
  destinationId: string,
  unlockedDestinationIds: string[],
): boolean {
  const destination = landmarkById.get(destinationId);
  return Boolean(destination && destination.action !== "locked" &&
    unlockedDestinationIds.includes(destinationId));
}

export function getDistrictFastTravelSpawn(destinationId: string): {
  position: DistrictWorldPoint;
  angle: number;
} | null {
  const destination = landmarkById.get(destinationId);
  if (!destination || destination.action === "locked") return null;
  const position = { x: destination.x - 8, z: destination.z + 12 };
  return {
    position,
    angle: Math.atan2(-(destination.x - position.x), -(destination.z - position.z)),
  };
}

function distance(a: DistrictWorldPoint, b: DistrictWorldPoint) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function routeDirection(from: DistrictWorldPoint, to: DistrictWorldPoint): string {
  const angle = Math.atan2(to.x - from.x, -(to.z - from.z));
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
}

function makeRoadNetwork(bounds: DistrictMapBounds) {
  const nodes: DistrictWorldPoint[] = [];
  const index = new Map<string, number>();
  for (const y of ROAD_YS) {
    for (const x of ROAD_XS) {
      index.set(`${x},${y}`, nodes.length);
      nodes.push(unprojectDistrictMapPoint(x, y, bounds));
    }
  }
  const edges: Array<Array<{ to: number; weight: number }>> = nodes.map(() => []);
  const connect = (a: number, b: number) => {
    const weight = distance(nodes[a], nodes[b]);
    edges[a].push({ to: b, weight });
    edges[b].push({ to: a, weight });
  };
  ROAD_YS.forEach((y) => ROAD_XS.slice(0, -1).forEach((x, column) => {
    connect(index.get(`${x},${y}`)!, index.get(`${ROAD_XS[column + 1]},${y}`)!);
  }));
  ROAD_XS.forEach((x) => ROAD_YS.slice(0, -1).forEach((y, row) => {
    connect(index.get(`${x},${y}`)!, index.get(`${x},${ROAD_YS[row + 1]}`)!);
  }));
  return { nodes, edges };
}

function shortestRoadPath(
  nodes: DistrictWorldPoint[],
  edges: Array<Array<{ to: number; weight: number }>>,
  start: number,
  end: number,
): DistrictWorldPoint[] {
  const costs = nodes.map(() => Number.POSITIVE_INFINITY);
  const previous = nodes.map(() => -1);
  const visited = new Set<number>();
  costs[start] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && (current === -1 || costs[i] < costs[current])) current = i;
    }
    if (current === -1 || !Number.isFinite(costs[current])) break;
    if (current === end) break;
    visited.add(current);
    for (const edge of edges[current]) {
      const candidate = costs[current] + edge.weight;
      if (candidate < costs[edge.to]) {
        costs[edge.to] = candidate;
        previous[edge.to] = current;
      }
    }
  }
  const path: number[] = [];
  for (let current = end; current !== -1; current = previous[current]) {
    path.unshift(current);
    if (current === start) break;
  }
  return path.map((node) => nodes[node]);
}

export function buildDistrictRoute(
  start: DistrictWorldPoint,
  destinationId: string,
  bounds = getDistrictMapBounds(DISTRICT_LANDMARKS),
): DistrictRoute | null {
  const destination = landmarkById.get(destinationId);
  if (!destination || destination.action === "locked" || !isSafeDistrictPosition(start)) return null;
  const goal = { x: destination.x, z: destination.z };
  const directDistance = distance(start, goal);
  if (directDistance <= 18) {
    return {
      points: directDistance > 0.01 ? [start, goal] : [start],
      distance: directDistance,
      direction: directDistance <= 1 ? "ARRIVED" : routeDirection(start, goal),
    };
  }
  const network = makeRoadNetwork(bounds);
  const nearest = (point: DistrictWorldPoint) => {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < network.nodes.length; i++) {
      const candidate = distance(point, network.nodes[i]);
      if (candidate < bestDistance) { best = i; bestDistance = candidate; }
    }
    return best;
  };
  const roadPath = shortestRoadPath(
    network.nodes,
    network.edges,
    nearest(start),
    nearest(goal),
  );
  const points = [start, ...roadPath, goal].filter((point, index, all) =>
    index === 0 || distance(point, all[index - 1]) > 0.01,
  );
  const total = points.slice(1).reduce((sum, point, index) =>
    sum + distance(points[index], point), 0);
  return {
    points,
    distance: total,
    direction: routeDirection(start, goal),
  };
}

function projectOntoSegment(point: DistrictWorldPoint, a: DistrictWorldPoint, b: DistrictWorldPoint) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared,
  ));
  return { point: { x: a.x + dx * t, z: a.z + dz * t }, t };
}

export function distanceToDistrictRoute(position: DistrictWorldPoint, route: DistrictWorldPoint[]): number {
  if (!route.length) return Number.POSITIVE_INFINITY;
  if (route.length === 1) return distance(position, route[0]);
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let i = 1; i < route.length; i++) {
    const projected = projectOntoSegment(position, route[i - 1], route[i]).point;
    nearestDistance = Math.min(nearestDistance, distance(position, projected));
  }
  return nearestDistance;
}

export function trimDistrictRoute(
  route: DistrictWorldPoint[],
  position: DistrictWorldPoint,
  destinationId: string,
): DistrictRoute | null {
  const destination = landmarkById.get(destinationId);
  if (!route.length || !destination) return null;
  if (route.length === 1) return buildDistrictRoute(position, destinationId);

  let nearestIndex = 1;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPoint = route[0];
  for (let i = 1; i < route.length; i++) {
    const projection = projectOntoSegment(position, route[i - 1], route[i]);
    const candidateDistance = distance(position, projection.point);
    if (candidateDistance < nearestDistance) {
      nearestDistance = candidateDistance;
      nearestIndex = i;
      nearestPoint = projection.point;
    }
  }
  const points = [position];
  if (distance(position, nearestPoint) > 0.1) points.push(nearestPoint);
  points.push(...route.slice(nearestIndex));
  const compact = points.filter((point, index, all) =>
    index === 0 || distance(point, all[index - 1]) > 0.01,
  );
  const total = compact.slice(1).reduce((sum, point, index) =>
    sum + distance(compact[index], point), 0);
  return {
    points: compact,
    distance: total,
    direction: routeDirection(position, { x: destination.x, z: destination.z }),
  };
}

export function shouldRecalculateDistrictRoute(
  position: DistrictWorldPoint,
  route: DistrictWorldPoint[],
  offRouteThreshold = 16,
): boolean {
  return distanceToDistrictRoute(position, route) > offRouteThreshold;
}

export function projectDistrictRouteToMap(
  route: DistrictWorldPoint[],
  bounds: DistrictMapBounds,
): Array<{ x: number; y: number }> {
  return route.map((point) => projectDistrictWorldPoint(point.x, point.z, bounds));
}
