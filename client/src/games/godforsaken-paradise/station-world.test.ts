import assert from "node:assert/strict";
import test from "node:test";
import {
  STATION_BOUNDS,
  STATION_EXIT,
  STATION_INTERACTABLES,
  STATION_ITEMS,
  STATION_MAP_SIZE,
  STATION_NPCS,
  STATION_REPAIR_RELAY,
  STATION_ROOMS,
  STATION_WALLS,
  getStationObjectivePins,
  stationLocalToMap,
  stationRectToMap,
} from "./station-world";

test("station map uses the full station-local bounds and keeps the major areas visible", () => {
  const corners = [
    stationLocalToMap({ x: STATION_BOUNDS.minX, y: STATION_BOUNDS.minY }),
    stationLocalToMap({ x: STATION_BOUNDS.maxX, y: STATION_BOUNDS.maxY }),
  ];
  assert.deepEqual(corners[0], { x: 0, y: 0 });
  assert.deepEqual(corners[1], { x: STATION_MAP_SIZE.width, y: STATION_MAP_SIZE.height });
  for (const room of STATION_ROOMS) {
    const mapped = stationRectToMap(room);
    assert.ok(mapped.width > 0 && mapped.height > 0, `${room.id} maps to an area`);
  }
  for (const wall of STATION_WALLS) {
    assert.ok(wall.x >= STATION_BOUNDS.minX && wall.y >= STATION_BOUNDS.minY, `${wall.label} starts inside station bounds`);
    assert.ok(wall.x + wall.w <= STATION_BOUNDS.maxX && wall.y + wall.h <= STATION_BOUNDS.maxY, `${wall.label} ends inside station bounds`);
  }
  assert.deepEqual(STATION_EXIT, { id: "vanta-exit", label: "Vanta Worlds portal", shortLabel: "EXIT", icon: "↖", x: 0, y: 0 });
});

test("objective pins follow mission state without exposing inactive assignment targets", () => {
  assert.deepEqual(getStationObjectivePins(null), []);

  const supply = getStationObjectivePins({
    type: "supply",
    objectives: [],
    employeeTarget: "mara",
  });
  assert.deepEqual(supply.map((pin) => pin.id), STATION_ITEMS.map((item) => `objective-${item.id}`));
  assert.deepEqual(
    getStationObjectivePins({ type: "supply", objectives: ["filter", "coupler", "parcel"], employeeTarget: "mara" })
      .map((pin) => pin.id),
    ["objective-report"],
  );
  assert.deepEqual(
    getStationObjectivePins({ type: "supply", objectives: ["filter", "coupler", "parcel", "terminal-report"], employeeTarget: "mara" }),
    [],
  );

  assert.deepEqual(
    getStationObjectivePins({ type: "repair", objectives: [], employeeTarget: "tovin" }).map((pin) => pin.id),
    ["objective-relay"],
  );
  assert.deepEqual(
    getStationObjectivePins({ type: "repair", objectives: ["relay-repaired"], employeeTarget: "tovin" }).map((pin) => pin.id),
    ["objective-report"],
  );
  const delivery = getStationObjectivePins({
    type: "delivery",
    objectives: ["dispatch-picked"],
    employeeTarget: "mara",
  });
  assert.equal(delivery[0]?.followNpcId, "mara");
  assert.deepEqual(
    getStationObjectivePins({ type: "delivery", objectives: [], employeeTarget: "tovin" })
      .map((pin) => pin.id),
    ["objective-dispatch"],
  );

  assert.equal(STATION_INTERACTABLES.length, 5);
  assert.equal(STATION_NPCS.length, 2);
  assert.ok(STATION_REPAIR_RELAY.x >= STATION_BOUNDS.minX && STATION_REPAIR_RELAY.x <= STATION_BOUNDS.maxX);
});
