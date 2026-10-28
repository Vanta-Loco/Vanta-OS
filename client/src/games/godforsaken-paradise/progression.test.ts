import assert from "node:assert/strict";
import test from "node:test";
import {
  completeActiveMission,
  createInitialProgress,
  decodeProgressSave,
  encodeProgressSave,
  missionForNextShift,
  missionReadyForReport,
  purchaseCabinUpgrade,
  recordMissionObjective,
} from "./progression";

test("corrupt, missing, and older progress saves safely start a fresh shift", () => {
  const initial = createInitialProgress();
  assert.deepEqual(decodeProgressSave(null), initial);
  assert.deepEqual(decodeProgressSave("{broken"), initial);
  assert.deepEqual(decodeProgressSave(JSON.stringify({ version: 1, credits: 9999 })), initial);
});

test("save decoding bounds values and only restores durable progression", () => {
  const restored = decodeProgressSave(JSON.stringify({
    version: 2,
    credits: 900,
    rank: 3,
    missionsStarted: 3,
    completedMissionIds: ["supply-1"],
    completedMissionTypes: ["supply", "unknown"],
    activeMission: {
      id: "repair-2",
      type: "repair",
      objectives: ["relay-repaired", "dialogue-is-not-persisted"],
      employeeTarget: "tovin",
    },
    upgrades: ["tool-rack", "unknown"],
    arrivalSeen: true,
    firstShiftEndingUnlocked: false,
    firstShiftEndingSeen: false,
    dialogue: { name: "Mara", text: "transient" },
  }));
  assert.equal(restored.credits, 900);
  assert.equal(restored.rank, 3);
  assert.deepEqual(restored.completedMissionTypes, ["supply"]);
  assert.deepEqual(restored.activeMission?.objectives, ["relay-repaired"]);
  assert.deepEqual(restored.upgrades, ["tool-rack"]);
  assert.equal("dialogue" in restored, false);
  assert.deepEqual(decodeProgressSave(encodeProgressSave(restored)), restored);
  assert.equal(decodeProgressSave(JSON.stringify({ version: 2, credits: Number.MAX_VALUE })).credits, 10_000_000);
});

test("supply missions pay once and a completed run advances rank", () => {
  let state = missionForNextShift(createInitialProgress(), "supply");
  state = recordMissionObjective(state, "filter");
  state = recordMissionObjective(state, "coupler");
  state = recordMissionObjective(state, "parcel");
  assert.equal(missionReadyForReport(state), true);
  state = recordMissionObjective(state, "terminal-report");
  const paid = completeActiveMission(state);
  assert.equal(paid.credits, 100);
  assert.equal(paid.rank, 2);
  assert.deepEqual(paid.completedMissionIds, ["supply-1"]);
  assert.equal(completeActiveMission(paid), paid);
});

test("repair and employee delivery missions award only after their objectives", () => {
  let state = missionForNextShift(createInitialProgress(), "repair");
  assert.equal(completeActiveMission(state), state);
  state = recordMissionObjective(state, "relay-repaired");
  state = recordMissionObjective(state, "terminal-report");
  state = purchaseCabinUpgrade({ ...state, credits: 120 }, "tool-rack");
  state = completeActiveMission(state);
  assert.equal(state.credits, 150);

  let delivery = missionForNextShift(state, "delivery");
  delivery = recordMissionObjective(delivery, "dispatch-picked");
  delivery = recordMissionObjective(delivery, `delivered-to-${delivery.activeMission!.employeeTarget}`);
  delivery = purchaseCabinUpgrade({ ...delivery, credits: 180 }, "signal-receiver");
  delivery = completeActiveMission(delivery);
  assert.equal(delivery.credits, 130);
  assert.equal(delivery.rank, 2);
  assert.equal(delivery.firstShiftEndingUnlocked, false);
});

test("cabin upgrades reject insufficient funds and cannot be bought twice", () => {
  const initial = createInitialProgress();
  assert.equal(purchaseCabinUpgrade(initial, "tool-rack"), initial);
  const purchased = purchaseCabinUpgrade({ ...initial, credits: 120 }, "tool-rack");
  assert.equal(purchased.credits, 0);
  assert.deepEqual(purchased.upgrades, ["tool-rack"]);
  assert.equal(purchaseCabinUpgrade({ ...purchased, credits: 500 }, "tool-rack"), purchased);
});
