import { DISTRICT_BLOCKS } from "./district-map-geometry";

export type DistrictMapGeometryPoint = { x: number; y: number };
export type DistrictRoadClass = "arterial" | "street" | "alley" | "bridge";

export type DistrictRoadLine = {
  id: string;
  roadClass: DistrictRoadClass;
  points: DistrictMapGeometryPoint[];
  bridgeAllowed?: boolean;
};

type Cubic = [
  DistrictMapGeometryPoint,
  DistrictMapGeometryPoint,
  DistrictMapGeometryPoint,
  DistrictMapGeometryPoint,
];

function cubicPoint([p0, p1, p2, p3]: Cubic, t: number): DistrictMapGeometryPoint {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function sampleCubics(curves: Cubic[], steps = 24): DistrictMapGeometryPoint[] {
  return curves.flatMap((curve, curveIndex) =>
    Array.from({ length: steps + 1 }, (_, index) =>
      cubicPoint(curve, index / steps),
    ).slice(curveIndex === 0 ? 0 : 1),
  );
}

const eastWestArterial = sampleCubics([
  [{ x: -20, y: 211 }, { x: 167, y: 191 }, { x: 282, y: 212 }, { x: 424, y: 208 }],
  [{ x: 424, y: 208 }, { x: 566, y: 204 }, { x: 689, y: 220 }, { x: 1020, y: 190 }],
]);

const northSouthSpine = sampleCubics([
  [{ x: 489, y: -20 }, { x: 472, y: 128 }, { x: 501, y: 224 }, { x: 491, y: 341 }],
  [{ x: 491, y: 341 }, { x: 481, y: 458 }, { x: 514, y: 559 }, { x: 548, y: 720 }],
]);

function pointOnPolylineAtX(points: DistrictMapGeometryPoint[], x: number) {
  return points.reduce((best, point) =>
    Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best,
  );
}

function pointOnPolylineAtY(points: DistrictMapGeometryPoint[], y: number) {
  return points.reduce((best, point) =>
    Math.abs(point.y - y) < Math.abs(best.y - y) ? point : best,
  );
}

export const DISTRICT_ROAD_LINES: DistrictRoadLine[] = [
  ...[116, 365, 450].map((y): DistrictRoadLine => ({
    id: `east-west-${y}`,
    roadClass: "street",
    points: [{ x: -20, y }, { x: 1020, y }],
  })),
  ...[155, 365, 652, 856].map((x): DistrictRoadLine => ({
    id: `north-south-${x}`,
    roadClass: "street",
    bridgeAllowed: true,
    points: [{ x, y: -20 }, { x, y: 720 }],
  })),
  { id: "west-east-arterial", roadClass: "arterial", points: eastWestArterial },
  { id: "north-south-spine", roadClass: "arterial", bridgeAllowed: true, points: northSouthSpine },
];

function nearestPolylinePoint(points: DistrictMapGeometryPoint[], target: DistrictMapGeometryPoint) {
  let best = points[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
      ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSquared,
    ));
    const projected = { x: a.x + dx * t, y: a.y + dy * t };
    const distance = Math.hypot(target.x - projected.x, target.y - projected.y);
    if (distance < bestDistance) {
      best = projected;
      bestDistance = distance;
    }
  }
  return best;
}

const portalArterialPoint = nearestPolylinePoint(eastWestArterial, { x: 229, y: 190 });
const fractArterialPoint = nearestPolylinePoint(eastWestArterial, { x: 522, y: 202 });
const coreArterialPoint = nearestPolylinePoint(eastWestArterial, { x: 706, y: 217 });
const indexSpinePoint = pointOnPolylineAtY(northSouthSpine, 288);

export const DISTRICT_DESTINATION_ENTRANCES: Record<string, DistrictMapGeometryPoint> = {
  "black-index": { x: 578, y: 288 },
  "music-hub": { x: 395, y: 264 },
  "vault-gate": { x: 652, y: 374 },
  wireline: { x: 358, y: 400 },
  fract: { x: 522, y: 202 },
  subway: { x: 468, y: 442 },
  "vanta-os": { x: 706, y: 217 },
  "fractured-godhead-portal": { x: 229, y: 190 },
  "brizz-station": { x: 760, y: 517 },
};

export const DISTRICT_DESTINATION_ACCESS_ROADS: DistrictRoadLine[] = [
  { id: "portal-approach", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES["fractured-godhead-portal"], portalArterialPoint] },
  { id: "wireline-approach", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES.wireline, { x: 365, y: 400 }] },
  { id: "brizz-service-alley", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES["brizz-station"], { x: 760, y: 450 }] },
  { id: "music-hub-bridge", roadClass: "bridge", bridgeAllowed: true, points: [{ x: 365, y: 264 }, DISTRICT_DESTINATION_ENTRANCES["music-hub"]] },
  { id: "black-index-causeway", roadClass: "bridge", bridgeAllowed: true, points: [indexSpinePoint, DISTRICT_DESTINATION_ENTRANCES["black-index"]] },
  { id: "fract-approach", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES.fract, fractArterialPoint] },
  { id: "metro-approach", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES.subway, { x: 468, y: 450 }] },
  { id: "vanta-core-approach", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES["vanta-os"], coreArterialPoint] },
  { id: "vault-approach", roadClass: "alley", points: [DISTRICT_DESTINATION_ENTRANCES["vault-gate"], { x: 652, y: 365 }] },
];

/** Shared shoreline samples are rendered directly and also constrain route edges. */
function cubicBoundary(curves: Cubic[], steps = 16): DistrictMapGeometryPoint[] {
  return sampleCubics(curves, steps);
}

const riverTop = cubicBoundary([
  [{ x: -10, y: 251 }, { x: 112, y: 225 }, { x: 172, y: 268 }, { x: 258, y: 256 }],
  [{ x: 258, y: 256 }, { x: 344, y: 244 }, { x: 402, y: 230 }, { x: 476, y: 256 }],
  [{ x: 476, y: 256 }, { x: 555, y: 284 }, { x: 606, y: 320 }, { x: 691, y: 305 }],
  [{ x: 691, y: 305 }, { x: 803, y: 286 }, { x: 875, y: 242 }, { x: 1010, y: 268 }],
]);
const riverBottom = cubicBoundary([
  [{ x: 1010, y: 294 }, { x: 875, y: 268 }, { x: 803, y: 311 }, { x: 694, y: 332 }],
  [{ x: 694, y: 332 }, { x: 600, y: 350 }, { x: 551, y: 312 }, { x: 466, y: 284 }],
  [{ x: 466, y: 284 }, { x: 398, y: 262 }, { x: 344, y: 278 }, { x: 262, y: 288 }],
  [{ x: 262, y: 288 }, { x: 166, y: 300 }, { x: 112, y: 258 }, { x: -10, y: 282 }],
]);

export const DISTRICT_RIVER_TOP_SHORELINE = riverTop;

export const DISTRICT_WATER_POLYGON: DistrictMapGeometryPoint[] = [
  ...riverTop,
  ...riverBottom,
];

function isInsideWater(point: DistrictMapGeometryPoint): boolean {
  let inside = false;
  for (let i = 0, j = DISTRICT_WATER_POLYGON.length - 1; i < DISTRICT_WATER_POLYGON.length; j = i++) {
    const a = DISTRICT_WATER_POLYGON[i], b = DISTRICT_WATER_POLYGON[j];
    if (((a.y > point.y) !== (b.y > point.y)) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1e-12) + a.x) inside = !inside;
  }
  return inside;
}

function bridgeMarkPath(road: DistrictRoadLine): string | null {
  const samples: Array<{ point: DistrictMapGeometryPoint; tangent: DistrictMapGeometryPoint }> = [];
  for (let index = 1; index < road.points.length; index++) {
    const a = road.points[index - 1], b = road.points[index];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.max(1, Math.ceil(length / 1.5));
    for (let step = 0; step <= count; step++) {
      if (index > 1 && step === 0) continue;
      const t = step / count;
      const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      if (isInsideWater(point)) samples.push({ point, tangent: { x: b.x - a.x, y: b.y - a.y } });
    }
  }
  if (samples.length < 4) return null;
  return [0.28, 0.72].map((fraction) => {
    const sample = samples[Math.round((samples.length - 1) * fraction)];
    const length = Math.hypot(sample.tangent.x, sample.tangent.y) || 1;
    const nx = -sample.tangent.y / length * 5;
    const ny = sample.tangent.x / length * 5;
    return `M${(sample.point.x - nx).toFixed(2)} ${(sample.point.y - ny).toFixed(2)}L${(sample.point.x + nx).toFixed(2)} ${(sample.point.y + ny).toFixed(2)}`;
  }).join(" ");
}

export const DISTRICT_BRIDGE_MARK_PATHS = DISTRICT_ROAD_LINES
  .filter((road) => road.bridgeAllowed)
  .map(bridgeMarkPath)
  .filter((path): path is string => Boolean(path));

export const DISTRICT_PARK_POLYGONS: DistrictMapGeometryPoint[][] = [
  [{ x: 73, y: 557 }, { x: 197, y: 541 }, { x: 232, y: 618 }, { x: 179, y: 670 }, { x: 54, y: 663 }],
  [{ x: 786, y: 447 }, { x: 865, y: 431 }, { x: 933, y: 458 }, { x: 916, y: 520 }, { x: 837, y: 532 }, { x: 776, y: 499 }],
];

export const DISTRICT_BUILDING_BLOCKS = DISTRICT_BLOCKS;

/** A light grid overlay in SVG used by both the route graph and the map. */
export function districtRoadPath(points: DistrictMapGeometryPoint[]): string {
  return points.map((point, index) =>
    `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
  ).join(" ");
}

export function getDistrictArterialAnchor(x: number) {
  return pointOnPolylineAtX(eastWestArterial, x);
}

export function getDistrictSpineAnchor(y: number) {
  return pointOnPolylineAtY(northSouthSpine, y);
}
