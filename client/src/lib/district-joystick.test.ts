import assert from "node:assert/strict";
import test from "node:test";
import { projectDistrictJoystick } from "./district-joystick";

test("joystick projection applies a dead zone and keeps the thumb visible", () => {
  const center = projectDistrictJoystick(0, 0, 40);
  assert.deepEqual(center, { x: 0, y: 0, magnitude: 0, offsetX: 0, offsetY: 0 });

  const dead = projectDistrictJoystick(4, 0, 40);
  assert.equal(dead.magnitude, 0);
  assert.equal(dead.x, 0);
  assert.equal(dead.offsetX, 4);
});

test("joystick preserves all directions, normalizes diagonals, and scales magnitude", () => {
  const right = projectDistrictJoystick(20, 0, 40);
  assert.equal(right.x, 1);
  assert.equal(right.y, 0);
  assert.ok(right.magnitude > 0 && right.magnitude < 1);

  const upLeft = projectDistrictJoystick(-40, -40, 40);
  assert.ok(Math.abs(upLeft.x + Math.SQRT1_2) < 1e-10);
  assert.ok(Math.abs(upLeft.y + Math.SQRT1_2) < 1e-10);
  assert.equal(upLeft.magnitude, 1);
  assert.ok(Math.hypot(upLeft.offsetX, upLeft.offsetY) <= 40);
});

test("invalid geometry safely returns neutral movement", () => {
  assert.deepEqual(projectDistrictJoystick(Number.NaN, 1, 40), {
    x: 0, y: 0, magnitude: 0, offsetX: 0, offsetY: 0,
  });
  assert.equal(projectDistrictJoystick(1, 1, 0).magnitude, 0);
});
