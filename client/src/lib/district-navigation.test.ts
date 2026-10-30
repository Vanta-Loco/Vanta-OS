import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDistrictRoute,
  DEFAULT_DISTRICT_NAVIGATION,
  distanceToDistrictRoute,
  getDistrictDestinationEntranceWorld,
  getDistrictFastTravelSpawn,
  isDistrictRouteGeometrySafe,
  hasDistrictMetroPrerequisites,
  isFastTravelEligible,
  isDistrictDestinationAvailable,
  parseDistrictNavigationSave,
  projectDistrictRouteToMap,
  shouldRecalculateDistrictRoute,
  trimDistrictRoute,
  unlockDistrictDestination,
  unlockDistrictMetro,
} from "./district-navigation";
import { DISTRICT_LANDMARKS } from "../data/district-landmarks";
import {
  getDistrictMapBounds,
  projectDistrictWorldPoint,
  unprojectDistrictMapPoint,
} from "../components/vanta-district-map/district-map-geometry";
import { DISTRICT_DESTINATION_ENTRANCES } from "../components/vanta-district-map/district-navigation-geometry";

const portal = DISTRICT_LANDMARKS.find((landmark) => landmark.id === "fractured-godhead-portal")!;

test("district route ends at its mapped entrance and shares the exact map projection", () => {
  const bounds = getDistrictMapBounds(DISTRICT_LANDMARKS);
  const route = buildDistrictRoute({ x: 0, z: 0 }, portal.id, bounds);
  assert.ok(route);
  assert.ok(route.points.length >= 4);
  assert.ok(route.distance > Math.hypot(portal.x, portal.z));
  assert.equal(route.arrivalPoint.x, getDistrictDestinationEntranceWorld(portal.id)!.x);
  assert.equal(route.arrivalPoint.z, getDistrictDestinationEntranceWorld(portal.id)!.z);
  assert.ok(isDistrictRouteGeometrySafe(route, bounds));
  const projected = projectDistrictRouteToMap(route.points, bounds);
  assert.deepEqual(projected[0], projectDistrictWorldPoint(0, 0, bounds));
  assert.deepEqual(projected.at(-1), DISTRICT_DESTINATION_ENTRANCES[portal.id]);
  assert.ok(route.direction.length > 0);
});

test("route distance advances with the player and recalculates after leaving the road", () => {
  const route = buildDistrictRoute({ x: 0, z: 0 }, portal.id)!;
  const onRoute = route.points[Math.min(1, route.points.length - 1)];
  const remaining = trimDistrictRoute(route, onRoute, portal.id)!;
  assert.ok(remaining.distance < route.distance);
  assert.ok(!shouldRecalculateDistrictRoute(onRoute, route.points));
  const farOffRoute = { x: onRoute.x + 40, z: onRoute.z + 35 };
  assert.ok(distanceToDistrictRoute(farOffRoute, route.points) > 16);
  assert.ok(shouldRecalculateDistrictRoute(farOffRoute, route.points));
});

test("route guidance reports arrival near the explicit destination entrance", () => {
  const entrance = getDistrictDestinationEntranceWorld(portal.id)!;
  const near = buildDistrictRoute({ x: entrance.x - 4, z: entrance.z + 4 }, portal.id)!;
  assert.ok(near.distance < 8);
  assert.equal(near.direction, "ARRIVED");
  assert.equal(near.points.length, 2);
  const arrived = buildDistrictRoute(entrance, portal.id)!;
  assert.equal(arrived.distance, 0);
  assert.equal(arrived.direction, "ARRIVED");
});

test("Wireline uses the easiest clear street route from the lower-central Metro corridor", () => {
  const wireline = DISTRICT_LANDMARKS.find((landmark) => landmark.id === "wireline")!;
  const start = { x: -20, z: 70 };
  const route = buildDistrictRoute(start, wireline.id)!;
  assert.ok(route);
  assert.ok(isDistrictRouteGeometrySafe(route));
  const entrance = getDistrictDestinationEntranceWorld(wireline.id)!;
  assert.ok(Math.hypot(route.arrivalPoint.x - entrance.x, route.arrivalPoint.z - entrance.z) < 0.01);
  assert.ok(route.distance < Math.hypot(start.x - entrance.x, start.z - entrance.z) * 1.85);
  assert.ok(route.points.length < 8, "route should follow nearby streets without a large rectangular loop");
  assert.ok(route.direction.includes("→"), "guidance should include the first turn after the initial direction");
});

test("every available mapped destination has a deterministic obstacle-safe path from spawn", () => {
  const unlocked = ["black-index", "wireline", "subway"];
  for (const destination of DISTRICT_LANDMARKS) {
    if (destination.action === "locked" && destination.id !== "subway") continue;
    const first = buildDistrictRoute({ x: 0, z: 0 }, destination.id, undefined, unlocked);
    const second = buildDistrictRoute({ x: 0, z: 0 }, destination.id, undefined, unlocked);
    assert.ok(first, `${destination.id} should be reachable`);
    assert.ok(isDistrictRouteGeometrySafe(first!), `${destination.id} route must avoid blocks and unsafe water crossings`);
    assert.deepEqual(first, second, `${destination.id} route should be deterministic`);
  }
  assert.equal(buildDistrictRoute({ x: 0, z: 0 }, "subway"), null, "locked Metro must not receive a route");
});

test("all destinations remain reachable from several clear District street positions", () => {
  const bounds = getDistrictMapBounds(DISTRICT_LANDMARKS);
  const starts = [[365, 450], [652, 365], [155, 450]].map(([x, y]) =>
    unprojectDistrictMapPoint(x, y, bounds),
  );
  const unlocked = ["black-index", "wireline", "subway"];
  for (const start of starts) {
    for (const destination of DISTRICT_LANDMARKS) {
      const route = buildDistrictRoute(start, destination.id, bounds, unlocked);
      assert.ok(route, `${destination.id} should be reachable from ${start.x.toFixed(0)},${start.z.toFixed(0)}`);
      assert.ok(isDistrictRouteGeometrySafe(route!, bounds));
    }
  }
});

test("water is crossed only on marked bridges and blocked starts report no safe route", () => {
  const index = buildDistrictRoute({ x: 0, z: 0 }, "black-index");
  const music = buildDistrictRoute({ x: 0, z: 0 }, "music-hub");
  assert.ok(index && music);
  assert.ok(index.segmentTypes.includes("bridge"));
  assert.ok(music.segmentTypes.includes("bridge"));
  assert.ok(isDistrictRouteGeometrySafe(index!));
  assert.ok(isDistrictRouteGeometrySafe(music!));
  const bounds = getDistrictMapBounds(DISTRICT_LANDMARKS);
  const insideBlock = { x: 310, y: 405 };
  const blockedWorld = {
    x: bounds.minX + ((insideBlock.x - 110) / 780) * (bounds.maxX - bounds.minX),
    z: bounds.minZ + ((insideBlock.y - 110) / 480) * (bounds.maxZ - bounds.minZ),
  };
  assert.equal(buildDistrictRoute(blockedWorld, "wireline"), null);
});

test("versioned navigation save accepts only safe District coordinates and valid IDs", () => {
  const valid = parseDistrictNavigationSave({
    ...DEFAULT_DISTRICT_NAVIGATION,
    position: { x: -20.5, z: 42 },
    selectedDestinationId: portal.id,
    unlockedDestinationIds: [portal.id, portal.id, "subway", "unknown"],
  });
  assert.deepEqual(valid?.position, { x: -20.5, z: 42 });
  assert.deepEqual(valid?.unlockedDestinationIds, [portal.id]);
  assert.equal(parseDistrictNavigationSave({ version: 2, coordinateSpace: "district-world-xz", position: { x: 0, z: 0 }, selectedDestinationId: null, unlockedDestinationIds: [] }), null);
  assert.equal(parseDistrictNavigationSave({ ...DEFAULT_DISTRICT_NAVIGATION, position: { x: 501, z: 0 } }), null);
  assert.equal(parseDistrictNavigationSave({ ...DEFAULT_DISTRICT_NAVIGATION, position: { x: Number.NaN, z: 0 } }), null);
  assert.equal(parseDistrictNavigationSave({ ...DEFAULT_DISTRICT_NAVIGATION, selectedDestinationId: "missing" }), null);
});

test("first physical arrival unlocks fast travel; route eligibility rejects locked sites", () => {
  const unlocked = unlockDistrictDestination(DEFAULT_DISTRICT_NAVIGATION, portal.id);
  assert.equal(isFastTravelEligible(portal.id, DEFAULT_DISTRICT_NAVIGATION.unlockedDestinationIds), false);
  assert.equal(isFastTravelEligible(portal.id, unlocked.unlockedDestinationIds), true);
  assert.equal(isFastTravelEligible("subway", ["subway"]), false);
  const spawn = getDistrictFastTravelSpawn(portal.id)!;
  assert.ok(Math.hypot(spawn.position.x - portal.x, spawn.position.z - portal.z) < 18);
  assert.equal(getDistrictFastTravelSpawn("subway"), null);
});

test("Metro unlock requires visiting Black Index and Wireline, then persists for route and fast travel", () => {
  const blackIndexVisited = unlockDistrictDestination(DEFAULT_DISTRICT_NAVIGATION, "black-index");
  assert.equal(hasDistrictMetroPrerequisites(blackIndexVisited.unlockedDestinationIds), false);
  assert.equal(unlockDistrictMetro(blackIndexVisited), blackIndexVisited);
  assert.equal(isDistrictDestinationAvailable("subway", blackIndexVisited.unlockedDestinationIds), false);
  assert.equal(isFastTravelEligible("subway", ["subway"]), false);
  assert.equal(buildDistrictRoute({ x: 0, z: 0 }, "subway", undefined, ["subway"]), null);

  const bothVisited = unlockDistrictDestination(blackIndexVisited, "wireline");
  assert.equal(hasDistrictMetroPrerequisites(bothVisited.unlockedDestinationIds), true);
  const metroSave = unlockDistrictMetro(bothVisited);
  assert.ok(metroSave.unlockedDestinationIds.includes("subway"));
  assert.equal(isDistrictDestinationAvailable("subway", metroSave.unlockedDestinationIds), true);
  assert.equal(isFastTravelEligible("subway", metroSave.unlockedDestinationIds), true);
  assert.ok(buildDistrictRoute({ x: 0, z: 0 }, "subway", undefined, metroSave.unlockedDestinationIds));
  assert.ok(getDistrictFastTravelSpawn("subway", metroSave.unlockedDestinationIds));

  const restored = parseDistrictNavigationSave(JSON.parse(JSON.stringify(metroSave)));
  assert.deepEqual(restored?.unlockedDestinationIds, metroSave.unlockedDestinationIds);
  assert.deepEqual(
    parseDistrictNavigationSave({
      ...DEFAULT_DISTRICT_NAVIGATION,
      unlockedDestinationIds: ["subway"],
      selectedDestinationId: "subway",
    }),
    { ...DEFAULT_DISTRICT_NAVIGATION, selectedDestinationId: null, unlockedDestinationIds: [] },
  );
});
