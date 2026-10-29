import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDistrictRoute,
  DEFAULT_DISTRICT_NAVIGATION,
  distanceToDistrictRoute,
  getDistrictFastTravelSpawn,
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
import { getDistrictMapBounds, projectDistrictWorldPoint } from "../components/vanta-district-map/district-map-geometry";

const portal = DISTRICT_LANDMARKS.find((landmark) => landmark.id === "fractured-godhead-portal")!;

test("district route follows map road nodes and shares the map projection", () => {
  const bounds = getDistrictMapBounds(DISTRICT_LANDMARKS);
  const route = buildDistrictRoute({ x: 0, z: 0 }, portal.id, bounds);
  assert.ok(route);
  assert.ok(route.points.length >= 4);
  assert.ok(route.distance > Math.hypot(portal.x, portal.z));
  const projected = projectDistrictRouteToMap(route.points, bounds);
  assert.deepEqual(projected[0], projectDistrictWorldPoint(0, 0, bounds));
  assert.deepEqual(projected.at(-1), projectDistrictWorldPoint(portal.x, portal.z, bounds));
  assert.ok(route.direction.length > 0);
});

test("route distance advances with the player and recalculates after leaving the road", () => {
  const route = buildDistrictRoute({ x: 0, z: 0 }, portal.id)!;
  const onRoute = route.points[Math.min(1, route.points.length - 1)];
  const remaining = trimDistrictRoute(route.points, onRoute, portal.id)!;
  assert.ok(remaining.distance < route.distance);
  assert.ok(!shouldRecalculateDistrictRoute(onRoute, route.points));
  const farOffRoute = { x: onRoute.x + 40, z: onRoute.z + 35 };
  assert.ok(distanceToDistrictRoute(farOffRoute, route.points) > 16);
  assert.ok(shouldRecalculateDistrictRoute(farOffRoute, route.points));
});

test("route guidance becomes direct and reports arrival near its destination", () => {
  const near = buildDistrictRoute({ x: portal.x - 8, z: portal.z + 12 }, portal.id)!;
  assert.equal(near.distance, Math.hypot(8, 12));
  assert.equal(near.points.length, 2);
  const arrived = buildDistrictRoute({ x: portal.x, z: portal.z }, portal.id)!;
  assert.equal(arrived.distance, 0);
  assert.equal(arrived.direction, "ARRIVED");
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
