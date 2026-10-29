import assert from "node:assert/strict";
import test from "node:test";
import { DISTRICT_LANDMARKS } from "./district-landmarks";
import { getDistrictMapBounds, projectDistrictWorldPoint } from "../components/vanta-district-map/district-map-geometry";

test("District keeps its existing active and locked destinations", () => {
  const byId = new Map(DISTRICT_LANDMARKS.map((landmark) => [landmark.id, landmark]));
  assert.equal(byId.get("black-index")?.route, "/search");
  assert.equal(byId.get("music-hub")?.action, "music-hub");
  assert.equal(byId.get("vault-gate")?.route, "/vault");
  assert.equal(byId.get("wireline")?.route, "/wireline");
  assert.equal(byId.get("fract")?.route, "/fract");
  assert.equal(byId.get("subway")?.action, "locked");
  assert.equal(byId.get("vanta-os")?.route, "/enter");
});

test("Fractured Godhead archive and station prototype are distinct map destinations", () => {
  const portal = DISTRICT_LANDMARKS.find((landmark) => landmark.id === "fractured-godhead-portal");
  const station = DISTRICT_LANDMARKS.find((landmark) => landmark.id === "brizz-station");
  assert.equal(portal?.route, "/fgh");
  assert.equal(station?.route, "/godforsaken-paradise");
  assert.notEqual(portal?.id, station?.id);
  assert.notEqual(portal?.route, station?.route);
});

test("District world movement uses the shared map projection on both live axes", () => {
  const bounds = getDistrictMapBounds(DISTRICT_LANDMARKS);
  const origin = projectDistrictWorldPoint(0, 0, bounds);
  const movedRight = projectDistrictWorldPoint(1, 0, bounds);
  const movedUp = projectDistrictWorldPoint(0, -1, bounds);

  assert.ok(movedRight.x > origin.x);
  assert.equal(movedRight.y, origin.y);
  assert.equal(movedUp.x, origin.x);
  assert.ok(movedUp.y < origin.y);
});
