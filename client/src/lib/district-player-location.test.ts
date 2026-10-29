import assert from "node:assert/strict";
import test from "node:test";
import { parseDistrictPlayerLocation } from "./district-player-location";

test("district context records a landmark destination, not station-local coordinates", () => {
  assert.deepEqual(
    parseDistrictPlayerLocation({
      version: 1,
      coordinateSpace: "district-destination",
      landmarkId: "brizz-station",
    }),
    {
      version: 1,
      coordinateSpace: "district-destination",
      landmarkId: "brizz-station",
    },
  );
  assert.equal(
    parseDistrictPlayerLocation({
      version: 1,
      coordinateSpace: "station-local",
      landmarkId: "brizz-station",
      x: 6,
      y: -3,
    }),
    null,
  );
  assert.equal(
    parseDistrictPlayerLocation({
      version: 1,
      coordinateSpace: "district-destination",
      landmarkId: "subway",
    }),
    null,
  );
  assert.equal(
    parseDistrictPlayerLocation({
      version: 2,
      coordinateSpace: "district-destination",
      landmarkId: "brizz-station",
    }),
    null,
  );
});
