import assert from "node:assert/strict";
import test from "node:test";
import { canStartPartyRemoval, getConfirmablePartyRemoval } from "./district-party-removal";

const matchingNamesParty = {
  isLeader: true,
  leaderMemberId: "leader-id",
  members: [
    { id: "leader-id", name: "Leader" },
    { id: "twin-one", name: "Twin" },
    { id: "twin-two", name: "Twin" },
  ],
};

test("party removal confirmation resolves the selected member by ID when names match", () => {
  assert.deepEqual(getConfirmablePartyRemoval(matchingNamesParty, "twin-two"), {
    id: "twin-two",
    name: "Twin",
  });
  assert.equal(canStartPartyRemoval(matchingNamesParty, "twin-two"), true);
});

test("non-leaders, leaders, and stale member IDs cannot confirm a party removal", () => {
  assert.equal(canStartPartyRemoval({ ...matchingNamesParty, isLeader: false }, "twin-one"), false);
  assert.equal(canStartPartyRemoval(matchingNamesParty, "leader-id"), false);
  assert.equal(canStartPartyRemoval(matchingNamesParty, "departed-member"), false);
  assert.equal(getConfirmablePartyRemoval(null, "twin-one"), null);
});
