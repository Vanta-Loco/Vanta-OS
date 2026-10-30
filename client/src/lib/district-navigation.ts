import { DISTRICT_LANDMARKS } from "@/data/district-landmarks";
import {
  getDistrictMapBounds,
  projectDistrictWorldPoint,
  unprojectDistrictMapPoint,
  type DistrictMapBounds,
} from "@/components/vanta-district-map/district-map-geometry";
import {
  DISTRICT_BUILDING_BLOCKS,
  DISTRICT_DESTINATION_ACCESS_ROADS,
  DISTRICT_DESTINATION_ENTRANCES,
  DISTRICT_PARK_POLYGONS,
  DISTRICT_ROAD_LINES,
  DISTRICT_WATER_POLYGON,
  type DistrictMapGeometryPoint,
  type DistrictRoadClass,
  type DistrictRoadLine,
} from "@/components/vanta-district-map/district-navigation-geometry";

export type DistrictWorldPoint = { x: number; z: number };
export type DistrictRouteSegmentKind = DistrictRoadClass | "connector";
export type DistrictNavigationSave = {
  version: 1;
  coordinateSpace: "district-world-xz";
  position: DistrictWorldPoint;
  selectedDestinationId: string | null;
  unlockedDestinationIds: string[];
};
export type DistrictRoute = {
  points: DistrictWorldPoint[];
  /** One entry per adjacent point pair; bridge segments are the only routes allowed across water. */
  segmentTypes: DistrictRouteSegmentKind[];
  distance: number;
  direction: string;
  arrivalPoint: DistrictWorldPoint;
};

const STORAGE_KEY = "vanta.district-navigation.v1";
export const DISTRICT_METRO_UNLOCK_REQUIREMENT =
  "Visit BLACK INDEX and WIRELINE TERMINAL on foot to clear Metro access.";
const METRO_PREREQUISITE_IDS = ["black-index", "wireline"] as const;
const METRO_DESTINATION_ID = "subway";
export const DISTRICT_SAFE_POSITION_LIMIT = 500;
export const DISTRICT_ARRIVAL_RADIUS = 8;
export const DISTRICT_ROUTE_OFF_PATH_THRESHOLD = 16;

export const DEFAULT_DISTRICT_NAVIGATION: DistrictNavigationSave = {
  version: 1,
  coordinateSpace: "district-world-xz",
  position: { x: 0, z: 0 },
  selectedDestinationId: null,
  unlockedDestinationIds: [],
};

const landmarkById = new Map(DISTRICT_LANDMARKS.map((landmark) => [landmark.id, landmark]));

export function hasDistrictMetroPrerequisites(unlockedDestinationIds: string[]): boolean {
  return METRO_PREREQUISITE_IDS.every((id) => unlockedDestinationIds.includes(id));
}

export function isDistrictDestinationAvailable(
  destinationId: string,
  unlockedDestinationIds: string[],
): boolean {
  const destination = landmarkById.get(destinationId);
  if (!destination) return false;
  if (destinationId === METRO_DESTINATION_ID) {
    return unlockedDestinationIds.includes(METRO_DESTINATION_ID) &&
      hasDistrictMetroPrerequisites(unlockedDestinationIds);
  }
  return destination.action !== "locked";
}

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

  const candidateUnlockedIds = record.unlockedDestinationIds.filter(
    (id): id is string => typeof id === "string" &&
      landmarkById.has(id) &&
      (landmarkById.get(id)!.action !== "locked" || id === METRO_DESTINATION_ID),
  );
  const uniqueUnlockedIds = candidateUnlockedIds.filter(
    (id, index) => candidateUnlockedIds.indexOf(id) === index,
  );
  const unlockedDestinationIds = uniqueUnlockedIds.filter((id) =>
    id !== METRO_DESTINATION_ID || hasDistrictMetroPrerequisites(uniqueUnlockedIds),
  );
  const selectedDestinationId = record.selectedDestinationId as string | null;
  return {
    version: 1,
    coordinateSpace: "district-world-xz",
    position: { x: record.position.x, z: record.position.z },
    selectedDestinationId: selectedDestinationId &&
      !isDistrictDestinationAvailable(selectedDestinationId, unlockedDestinationIds)
      ? null
      : selectedDestinationId,
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

export function unlockDistrictMetro(save: DistrictNavigationSave): DistrictNavigationSave {
  if (!hasDistrictMetroPrerequisites(save.unlockedDestinationIds) ||
    save.unlockedDestinationIds.includes(METRO_DESTINATION_ID)) return save;
  return {
    ...save,
    unlockedDestinationIds: [...save.unlockedDestinationIds, METRO_DESTINATION_ID],
  };
}

export function isFastTravelEligible(
  destinationId: string,
  unlockedDestinationIds: string[],
): boolean {
  return Boolean(isDistrictDestinationAvailable(destinationId, unlockedDestinationIds) &&
    unlockedDestinationIds.includes(destinationId));
}

export function getDistrictFastTravelSpawn(
  destinationId: string,
  unlockedDestinationIds: string[] = [],
): { position: DistrictWorldPoint; angle: number } | null {
  const destination = landmarkById.get(destinationId);
  if (!destination || !isDistrictDestinationAvailable(destinationId, unlockedDestinationIds)) return null;
  const position = { x: destination.x - 8, z: destination.z + 12 };
  return {
    position,
    angle: Math.atan2(-(destination.x - position.x), -(destination.z - position.z)),
  };
}

function distance(a: DistrictWorldPoint, b: DistrictWorldPoint) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function mapDistance(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function routeDirection(from: DistrictWorldPoint, to: DistrictWorldPoint): string {
  const angle = Math.atan2(to.x - from.x, -(to.z - from.z));
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8];
}

function directionForRoute(points: DistrictWorldPoint[], destination: DistrictWorldPoint): string {
  if (points.length <= 1 || distance(points[0], destination) <= DISTRICT_ARRIVAL_RADIUS) return "ARRIVED";
  const firstIndex = points.findIndex((point, index) => index > 0 && distance(points[0], point) > 0.5);
  if (firstIndex < 0) return "ARRIVED";
  const firstDirection = routeDirection(points[0], points[firstIndex]);
  for (let index = firstIndex + 1; index < points.length; index++) {
    if (distance(points[index - 1], points[index]) <= 0.5) continue;
    const nextDirection = routeDirection(points[index - 1], points[index]);
    if (nextDirection !== firstDirection) return `${firstDirection} → ${nextDirection}`;
  }
  return firstDirection;
}

function projectOntoSegment<T extends { x: number; y?: number; z?: number }>(
  point: T,
  a: T,
  b: T,
) {
  const px = point.x;
  const py = point.y ?? point.z ?? 0;
  const ax = a.x;
  const ay = a.y ?? a.z ?? 0;
  const bx = b.x;
  const by = b.y ?? b.z ?? 0;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((px - ax) * dx + (py - ay) * dy) / lengthSquared,
  ));
  return {
    point: { x: ax + dx * t, y: ay + dy * t },
    t,
  };
}

function orientation(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint, c: DistrictMapGeometryPoint) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(
  a: DistrictMapGeometryPoint,
  b: DistrictMapGeometryPoint,
  c: DistrictMapGeometryPoint,
  d: DistrictMapGeometryPoint,
): boolean {
  const epsilon = 1e-7;
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return abC * abD <= epsilon && cdA * cdB <= epsilon &&
    Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + epsilon &&
    Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) + epsilon;
}

function pointInsidePolygon(point: DistrictMapGeometryPoint, polygon: DistrictMapGeometryPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const intersects = ((a.y > point.y) !== (b.y > point.y)) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1e-12) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function segmentIntersectsPolygon(
  a: DistrictMapGeometryPoint,
  b: DistrictMapGeometryPoint,
  polygon: DistrictMapGeometryPoint[],
): boolean {
  if (pointInsidePolygon(a, polygon) || pointInsidePolygon(b, polygon)) return true;
  for (let index = 0; index < polygon.length; index++) {
    if (segmentsIntersect(a, b, polygon[index], polygon[(index + 1) % polygon.length])) return true;
  }
  return false;
}

function segmentIntersectsBlock(
  a: DistrictMapGeometryPoint,
  b: DistrictMapGeometryPoint,
  block: readonly number[],
  clearance = 2,
): boolean {
  const [x, y, width, height] = block;
  const left = x - clearance, right = x + width + clearance;
  const top = y - clearance, bottom = y + height + clearance;
  if (
    (a.x >= left && a.x <= right && a.y >= top && a.y <= bottom) ||
    (b.x >= left && b.x <= right && b.y >= top && b.y <= bottom)
  ) return true;
  const corners: DistrictMapGeometryPoint[] = [
    { x: left, y: top }, { x: right, y: top },
    { x: right, y: bottom }, { x: left, y: bottom },
  ];
  return corners.some((corner, index) =>
    segmentsIntersect(a, b, corner, corners[(index + 1) % corners.length]),
  );
}

function segmentHitsBuilding(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint): boolean {
  return DISTRICT_BUILDING_BLOCKS.some((block) => segmentIntersectsBlock(a, b, block));
}

function segmentCrossesWater(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint): boolean {
  return segmentIntersectsPolygon(a, b, DISTRICT_WATER_POLYGON);
}

function segmentCrossesPark(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint): boolean {
  return DISTRICT_PARK_POLYGONS.some((polygon) => segmentIntersectsPolygon(a, b, polygon));
}

function pointToSegmentDistance(point: DistrictMapGeometryPoint, a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint) {
  return mapDistance(point, projectOntoSegment(point, a, b).point as DistrictMapGeometryPoint);
}

function isAlongApprovedBridge(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint): boolean {
  const bridgeLines: DistrictRoadLine[] = [
    ...DISTRICT_ROAD_LINES.filter((road) => road.bridgeAllowed),
    ...DISTRICT_DESTINATION_ACCESS_ROADS.filter((road) => road.bridgeAllowed),
  ];
  return bridgeLines.some((road) => {
    const samples = Array.from({ length: 9 }, (_, index) => ({
      x: a.x + (b.x - a.x) * index / 8,
      y: a.y + (b.y - a.y) * index / 8,
    }));
    return samples.every((sample) =>
      road.points.slice(1).some((point, index) =>
        pointToSegmentDistance(sample, road.points[index], point) <= 2.5,
      ),
    );
  });
}

function isAlongWalkableRoad(a: DistrictMapGeometryPoint, b: DistrictMapGeometryPoint): boolean {
  const lines = [...DISTRICT_ROAD_LINES, ...DISTRICT_DESTINATION_ACCESS_ROADS];
  const samples = Array.from({ length: 9 }, (_, index) => ({
    x: a.x + (b.x - a.x) * index / 8,
    y: a.y + (b.y - a.y) * index / 8,
  }));
  return lines.some((road) => samples.every((sample) =>
    road.points.slice(1).some((point, index) =>
      pointToSegmentDistance(sample, road.points[index], point) <= 2.5,
    ),
  ));
}

function isSafeMapSegment(
  a: DistrictMapGeometryPoint,
  b: DistrictMapGeometryPoint,
  allowBridge = false,
): boolean {
  if (segmentHitsBuilding(a, b)) return false;
  if (segmentCrossesPark(a, b) && !isAlongWalkableRoad(a, b)) return false;
  if (!segmentCrossesWater(a, b)) return true;
  return allowBridge || isAlongApprovedBridge(a, b);
}

type GraphEdge = { to: number; length: number; kind: DistrictRouteSegmentKind };
type RoadGraph = { mapNodes: DistrictMapGeometryPoint[]; worldNodes: DistrictWorldPoint[]; edges: GraphEdge[][] };
type RawSegment = {
  a: DistrictMapGeometryPoint;
  b: DistrictMapGeometryPoint;
  road: DistrictRoadLine;
  cuts: number[];
};
const districtGraphCache = new Map<string, RoadGraph>();

function densifyRoad(road: DistrictRoadLine): DistrictMapGeometryPoint[] {
  const points: DistrictMapGeometryPoint[] = [];
  for (let index = 1; index < road.points.length; index++) {
    const a = road.points[index - 1];
    const b = road.points[index];
    const count = Math.max(1, Math.ceil(mapDistance(a, b) / 24));
    for (let step = index === 1 ? 0 : 1; step <= count; step++) {
      const t = step / count;
      points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return points;
}

function makeRawSegments(): RawSegment[] {
  const roads = [...DISTRICT_ROAD_LINES, ...DISTRICT_DESTINATION_ACCESS_ROADS];
  const segments: RawSegment[] = [];
  for (const road of roads) {
    const points = densifyRoad(road);
    for (let index = 1; index < points.length; index++) {
      segments.push({ a: points[index - 1], b: points[index], road, cuts: [0, 1] });
    }
  }
  return segments;
}

function intersectionParameters(
  a: DistrictMapGeometryPoint,
  b: DistrictMapGeometryPoint,
  c: DistrictMapGeometryPoint,
  d: DistrictMapGeometryPoint,
): { t: number; u: number } | null {
  const rx = b.x - a.x, ry = b.y - a.y;
  const sx = d.x - c.x, sy = d.y - c.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 1e-8) return null;
  const qx = c.x - a.x, qy = c.y - a.y;
  const t = (qx * sy - qy * sx) / denominator;
  const u = (qx * ry - qy * rx) / denominator;
  return t >= -1e-7 && t <= 1 + 1e-7 && u >= -1e-7 && u <= 1 + 1e-7
    ? { t: Math.max(0, Math.min(1, t)), u: Math.max(0, Math.min(1, u)) }
    : null;
}

function buildRoadGraphUncached(bounds: DistrictMapBounds): RoadGraph {
  const segments = makeRawSegments();
  for (let first = 0; first < segments.length; first++) {
    for (let second = first + 1; second < segments.length; second++) {
      const a = segments[first], b = segments[second];
      const hit = intersectionParameters(a.a, a.b, b.a, b.b);
      if (hit) {
        a.cuts.push(hit.t);
        b.cuts.push(hit.u);
      }
    }
  }

  const mapNodes: DistrictMapGeometryPoint[] = [];
  const nodeByKey = new Map<string, number>();
  const edges: GraphEdge[][] = [];
  const getNode = (point: DistrictMapGeometryPoint) => {
    const key = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    const existing = nodeByKey.get(key);
    if (existing !== undefined) return existing;
    const index = mapNodes.length;
    nodeByKey.set(key, index);
    mapNodes.push({ x: Number(point.x.toFixed(2)), y: Number(point.y.toFixed(2)) });
    edges.push([]);
    return index;
  };
  const addEdge = (from: number, to: number, kind: DistrictRouteSegmentKind) => {
    if (from === to) return;
    const length = distance(
      unprojectDistrictMapPoint(mapNodes[from].x, mapNodes[from].y, bounds),
      unprojectDistrictMapPoint(mapNodes[to].x, mapNodes[to].y, bounds),
    );
    if (!Number.isFinite(length) || length < 0.001) return;
    const existing = edges[from].find((edge) => edge.to === to && edge.kind === kind);
    if (!existing) edges[from].push({ to, length, kind });
    const reverse = edges[to].find((edge) => edge.to === from && edge.kind === kind);
    if (!reverse) edges[to].push({ to: from, length, kind });
  };

  for (const segment of segments) {
    const cuts = segment.cuts.sort((a, b) => a - b)
      .filter((value, index, all) => index === 0 || value - all[index - 1] > 1e-5);
    for (let index = 1; index < cuts.length; index++) {
      const t0 = cuts[index - 1], t1 = cuts[index];
      if (t1 - t0 < 1e-5) continue;
      const at = (t: number): DistrictMapGeometryPoint => ({
        x: segment.a.x + (segment.b.x - segment.a.x) * t,
        y: segment.a.y + (segment.b.y - segment.a.y) * t,
      });
      const a = at(t0), b = at(t1);
      const crossesWater = segmentCrossesWater(a, b);
      if (
        segmentHitsBuilding(a, b) ||
        (segmentCrossesPark(a, b) && !isAlongWalkableRoad(a, b)) ||
        (crossesWater && !segment.road.bridgeAllowed)
      ) continue;
      const kind: DistrictRouteSegmentKind = crossesWater || segment.road.roadClass === "bridge"
        ? "bridge"
        : segment.road.roadClass;
      addEdge(getNode(a), getNode(b), kind);
    }
  }

  const worldNodes = mapNodes.map((point) => unprojectDistrictMapPoint(point.x, point.y, bounds));
  return { mapNodes, worldNodes, edges };
}

function buildRoadGraph(bounds: DistrictMapBounds): RoadGraph {
  const cacheKey = [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ]
    .map((value) => value.toFixed(3)).join(":");
  const cached = districtGraphCache.get(cacheKey);
  if (cached) return cached;
  const graph = buildRoadGraphUncached(bounds);
  districtGraphCache.set(cacheKey, graph);
  return graph;
}

function reachableSafeGraphNodes(
  point: DistrictMapGeometryPoint,
  graph: RoadGraph,
  maxDistanceWorld: number,
  bounds: DistrictMapBounds,
): Array<{ index: number; mapPoint: DistrictMapGeometryPoint; distance: number }> {
  const candidates: Array<{ index: number; mapPoint: DistrictMapGeometryPoint; distance: number }> = [];
  for (let index = 0; index < graph.mapNodes.length; index++) {
    const node = graph.mapNodes[index];
    if (!isSafeMapSegment(point, node)) continue;
    const worldDistance = distance(
      unprojectDistrictMapPoint(point.x, point.y, bounds),
      graph.worldNodes[index],
    );
    if (worldDistance > maxDistanceWorld) continue;
    candidates.push({ index, mapPoint: node, distance: worldDistance });
  }
  return candidates.sort((a, b) => a.distance - b.distance || a.index - b.index);
}

type SearchState = {
  key: string;
  previous: number;
  current: number;
  lastKind: DistrictRouteSegmentKind | "start";
  cost: number;
  priority: number;
};

function turnPenalty(
  previous: DistrictWorldPoint,
  current: DistrictWorldPoint,
  next: DistrictWorldPoint,
): number {
  const ax = current.x - previous.x, az = current.z - previous.z;
  const bx = next.x - current.x, bz = next.z - current.z;
  const denominator = Math.hypot(ax, az) * Math.hypot(bx, bz);
  if (!denominator) return 0;
  const cosine = Math.max(-1, Math.min(1, (ax * bx + az * bz) / denominator));
  if (cosine < -0.65) return 9;
  if (cosine < 0.25) return 2.4;
  return 0;
}

function shortestRoadPath(
  graph: RoadGraph,
  starts: Array<{ index: number; distance: number }>,
  goals: Array<{ index: number; distance: number }>,
): {
  nodes: number[];
  edgeKinds: DistrictRouteSegmentKind[];
} | null {
  if (!starts.length || !goals.length) return null;
  const goalIndices = new Set(goals.map((goal) => goal.index));
  const goalHeuristic = (nodeIndex: number) => Math.min(...goals.map((goal) =>
    distance(graph.worldNodes[nodeIndex], graph.worldNodes[goal.index]) + goal.distance,
  ));
  const states = new Map<string, SearchState>();
  const parents = new Map<string, { key: string; kind: DistrictRouteSegmentKind }>();
  const bestCosts = new Map<string, number>();
  const open: SearchState[] = [];
  const compare = (left: SearchState, right: SearchState) =>
    left.priority - right.priority || left.cost - right.cost ||
    left.current - right.current || left.previous - right.previous || left.key.localeCompare(right.key);
  const push = (state: SearchState) => {
    open.push(state);
    let index = open.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compare(open[parent], open[index]) <= 0) break;
      [open[parent], open[index]] = [open[index], open[parent]];
      index = parent;
    }
  };
  const pop = () => {
    const first = open[0];
    const last = open.pop()!;
    if (open.length) {
      open[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < open.length && compare(open[left], open[smallest]) < 0) smallest = left;
        if (right < open.length && compare(open[right], open[smallest]) < 0) smallest = right;
        if (smallest === index) break;
        [open[index], open[smallest]] = [open[smallest], open[index]];
        index = smallest;
      }
    }
    return first;
  };
  for (const start of starts) {
    const key = `-1:${start.index}:connector`;
    const state: SearchState = {
      key,
      previous: -1,
      current: start.index,
      lastKind: "connector",
      cost: start.distance,
      priority: start.distance + goalHeuristic(start.index),
    };
    const existing = bestCosts.get(key);
    if (existing === undefined || state.cost < existing) {
      bestCosts.set(key, state.cost);
      states.set(key, state);
      push(state);
    }
  }
  let resultKey: string | null = null;

  while (open.length) {
    const queued = pop();
    const key = queued.key;
    if (queued.cost > (bestCosts.get(key) ?? Number.POSITIVE_INFINITY) + 1e-7) continue;
    const state = queued;
    if (goalIndices.has(state.current)) { resultKey = key; break; }

    for (const edge of graph.edges[state.current]) {
      const nextPoint = graph.worldNodes[edge.to];
      const currentPoint = graph.worldNodes[state.current];
      const previousPoint = state.previous >= 0 ? graph.worldNodes[state.previous] : currentPoint;
      const turn = state.previous >= 0
        ? turnPenalty(previousPoint, currentPoint, nextPoint)
        : 0;
      const classChange = state.lastKind !== "start" && state.lastKind !== edge.kind ? 1.25 : 0;
      const narrowAlley = edge.kind === "alley" ? 1.7 + edge.length * 0.018 : 0;
      const bridgePenalty = edge.kind === "bridge" ? 0.8 : 0;
      const nextCost = state.cost + edge.length + turn + classChange + narrowAlley + bridgePenalty;
      const nextKey = `${state.current}:${edge.to}:${edge.kind}`;
      if (nextCost + 1e-7 >= (bestCosts.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
      bestCosts.set(nextKey, nextCost);
      parents.set(nextKey, { key, kind: edge.kind });
      const nextState: SearchState = {
        key: nextKey,
        previous: state.current,
        current: edge.to,
        lastKind: edge.kind,
        cost: nextCost,
        priority: nextCost + goalHeuristic(edge.to),
      };
      states.set(nextKey, nextState);
      push(nextState);
    }
  }
  if (!resultKey) return null;

  const nodes: number[] = [];
  const edgeKinds: DistrictRouteSegmentKind[] = [];
  let key = resultKey;
  while (true) {
    nodes.unshift(states.get(key)!.current);
    const parent = parents.get(key);
    if (!parent) break;
    edgeKinds.unshift(parent.kind);
    key = parent.key;
  }
  return { nodes, edgeKinds };
}

function simplifyCollinearRoute(
  points: DistrictWorldPoint[],
  segmentTypes: DistrictRouteSegmentKind[],
): { points: DistrictWorldPoint[]; segmentTypes: DistrictRouteSegmentKind[] } {
  if (points.length < 3) return { points, segmentTypes };
  const compactPoints = [points[0]];
  const compactTypes: DistrictRouteSegmentKind[] = [];
  for (let index = 1; index < points.length - 1; index++) {
    const a = compactPoints[compactPoints.length - 1];
    const b = points[index];
    const c = points[index + 1];
    const before = segmentTypes[index - 1];
    const after = segmentTypes[index];
    const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
    const sameDirection = (b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z) >= 0;
    if (before === after && sameDirection && Math.abs(cross) < 0.002) continue;
    compactTypes.push(before);
    compactPoints.push(b);
  }
  compactTypes.push(segmentTypes[segmentTypes.length - 1]);
  compactPoints.push(points[points.length - 1]);
  return { points: compactPoints, segmentTypes: compactTypes };
}

function routeLength(points: DistrictWorldPoint[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
}

function createRoute(
  points: DistrictWorldPoint[],
  segmentTypes: DistrictRouteSegmentKind[],
  arrivalPoint: DistrictWorldPoint,
): DistrictRoute {
  const simplified = simplifyCollinearRoute(points, segmentTypes);
  return {
    ...simplified,
    distance: routeLength(simplified.points),
    direction: routeLength(simplified.points) <= DISTRICT_ARRIVAL_RADIUS
      ? "ARRIVED"
      : directionForRoute(simplified.points, arrivalPoint),
    arrivalPoint,
  };
}

export function getDistrictDestinationEntranceWorld(
  destinationId: string,
  bounds = getDistrictMapBounds(DISTRICT_LANDMARKS),
): DistrictWorldPoint | null {
  const entrance = DISTRICT_DESTINATION_ENTRANCES[destinationId];
  return entrance ? unprojectDistrictMapPoint(entrance.x, entrance.y, bounds) : null;
}

export function buildDistrictRoute(
  start: DistrictWorldPoint,
  destinationId: string,
  bounds = getDistrictMapBounds(DISTRICT_LANDMARKS),
  unlockedDestinationIds: string[] = [],
): DistrictRoute | null {
  const destination = landmarkById.get(destinationId);
  const entranceMap = DISTRICT_DESTINATION_ENTRANCES[destinationId];
  if (!destination || !entranceMap ||
    !isDistrictDestinationAvailable(destinationId, unlockedDestinationIds) ||
    !isSafeDistrictPosition(start)) return null;

  const arrivalPoint = unprojectDistrictMapPoint(entranceMap.x, entranceMap.y, bounds);
  const startMap = projectDistrictWorldPoint(start.x, start.z, bounds);
  if (distance(start, arrivalPoint) <= DISTRICT_ARRIVAL_RADIUS &&
    isSafeMapSegment(startMap, entranceMap)) {
    return createRoute(
      distance(start, arrivalPoint) > 0.01 ? [start, arrivalPoint] : [start],
      distance(start, arrivalPoint) > 0.01 ? ["connector"] : [],
      arrivalPoint,
    );
  }

  const graph = buildRoadGraph(bounds);
  const startSnaps = reachableSafeGraphNodes(startMap, graph, 52, bounds);
  const endSnaps = reachableSafeGraphNodes(entranceMap, graph, 2, bounds);
  if (!startSnaps.length || !endSnaps.length) return null;
  const path = shortestRoadPath(
    graph,
    startSnaps.map(({ index, distance: snapDistance }) => ({ index, distance: snapDistance })),
    endSnaps.map(({ index, distance: snapDistance }) => ({ index, distance: snapDistance })),
  );
  if (!path) return null;
  const pathEndIndex = path.nodes[path.nodes.length - 1];
  const endSnap = endSnaps.find((candidate) => candidate.index === pathEndIndex);
  if (!endSnap) return null;

  const points: DistrictWorldPoint[] = [start];
  const segmentTypes: DistrictRouteSegmentKind[] = [];
  const append = (point: DistrictWorldPoint, kind: DistrictRouteSegmentKind) => {
    const previous = points[points.length - 1];
    if (distance(previous, point) <= 0.001) return;
    points.push(point);
    segmentTypes.push(kind);
  };
  append(graph.worldNodes[path.nodes[0]], "connector");
  for (let index = 1; index < path.nodes.length; index++) {
    append(graph.worldNodes[path.nodes[index]], path.edgeKinds[index - 1]);
  }
  append(arrivalPoint, endSnap.index === path.nodes[path.nodes.length - 1]
    ? (DISTRICT_DESTINATION_ACCESS_ROADS.find((road) =>
      road.points.some((point) => mapDistance(point, entranceMap) < 0.01),
    )?.roadClass ?? "connector")
    : "connector");
  const route = createRoute(points, segmentTypes, arrivalPoint);
  return isDistrictRouteGeometrySafe(route, bounds) ? route : null;
}

export function isDistrictRouteGeometrySafe(
  route: DistrictRoute,
  bounds = getDistrictMapBounds(DISTRICT_LANDMARKS),
): boolean {
  if (route.points.length < 1 || route.segmentTypes.length !== route.points.length - 1) return false;
  for (let index = 1; index < route.points.length; index++) {
    const a = projectDistrictWorldPoint(route.points[index - 1].x, route.points[index - 1].z, bounds);
    const b = projectDistrictWorldPoint(route.points[index].x, route.points[index].z, bounds);
    const kind = route.segmentTypes[index - 1];
    if (segmentHitsBuilding(a, b)) return false;
    if (segmentCrossesPark(a, b) && !isAlongWalkableRoad(a, b)) return false;
    if (segmentCrossesWater(a, b) && kind !== "bridge" && !isAlongApprovedBridge(a, b)) return false;
  }
  return true;
}

export function distanceToDistrictRoute(
  position: DistrictWorldPoint,
  route: DistrictRoute | DistrictWorldPoint[],
): number {
  const points = Array.isArray(route) ? route : route.points;
  if (!points.length) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return distance(position, points[0]);
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index++) {
    const projected = projectWorldOntoSegment(position, points[index - 1], points[index]).point;
    nearestDistance = Math.min(nearestDistance, distance(position, projected));
  }
  return nearestDistance;
}

function projectWorldOntoSegment(
  point: DistrictWorldPoint,
  a: DistrictWorldPoint,
  b: DistrictWorldPoint,
): { point: DistrictWorldPoint; t: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared,
  ));
  return { point: { x: a.x + dx * t, z: a.z + dz * t }, t };
}

export function trimDistrictRoute(
  route: DistrictRoute,
  position: DistrictWorldPoint,
  destinationId: string,
  unlockedDestinationIds: string[] = [],
): DistrictRoute | null {
  if (!route.points.length || !landmarkById.has(destinationId) ||
    !isDistrictDestinationAvailable(destinationId, unlockedDestinationIds)) return null;
  if (route.points.length === 1) {
    return buildDistrictRoute(position, destinationId, undefined, unlockedDestinationIds);
  }

  let segmentIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPoint: { x: number; z: number } = route.points[0];
  for (let index = 1; index < route.points.length; index++) {
    const projection = projectWorldOntoSegment(position, route.points[index - 1], route.points[index]);
    const candidateDistance = distance(position, projection.point);
    if (candidateDistance < nearestDistance) {
      nearestDistance = candidateDistance;
      segmentIndex = index - 1;
      nearestPoint = projection.point;
    }
  }

  const bounds = getDistrictMapBounds(DISTRICT_LANDMARKS);
  const playerMap = projectDistrictWorldPoint(position.x, position.z, bounds);
  const projectedMap = projectDistrictWorldPoint(nearestPoint.x, nearestPoint.z, bounds);
  if (!isSafeMapSegment(playerMap, projectedMap)) {
    return buildDistrictRoute(position, destinationId, bounds, unlockedDestinationIds);
  }

  const points: DistrictWorldPoint[] = [position];
  const segmentTypes: DistrictRouteSegmentKind[] = [];
  const append = (point: DistrictWorldPoint, kind: DistrictRouteSegmentKind) => {
    if (distance(points[points.length - 1], point) <= 0.001) return;
    points.push(point);
    segmentTypes.push(kind);
  };
  append(nearestPoint, "connector");
  for (let index = segmentIndex + 1; index < route.points.length; index++) {
    append(route.points[index], route.segmentTypes[index - 1]);
  }
  const trimmed = createRoute(points, segmentTypes, route.arrivalPoint);
  return isDistrictRouteGeometrySafe(trimmed, bounds) ? trimmed : null;
}

export function shouldRecalculateDistrictRoute(
  position: DistrictWorldPoint,
  route: DistrictRoute | DistrictWorldPoint[],
  offRouteThreshold = DISTRICT_ROUTE_OFF_PATH_THRESHOLD,
): boolean {
  return distanceToDistrictRoute(position, route) > offRouteThreshold;
}

export function projectDistrictRouteToMap(
  route: DistrictWorldPoint[],
  bounds: DistrictMapBounds,
): Array<{ x: number; y: number }> {
  return route.map((point) => projectDistrictWorldPoint(point.x, point.z, bounds));
}
