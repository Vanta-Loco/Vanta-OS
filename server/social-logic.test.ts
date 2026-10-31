import test from "node:test";
import assert from "node:assert/strict";
import {
  canFollowUser,
  isPublicSocialContent,
  parseModerationState,
  parseReportTarget,
  parseSocialText,
} from "./social-logic";

test("social text is trimmed, bounded, and rejects blank input", () => {
  assert.deepEqual(parseSocialText("  A transmission  ", 30), { value: "A transmission" });
  assert.equal(parseSocialText("  ", 30).error, "Text cannot be empty");
  assert.equal(parseSocialText("1234", 3).error, "Text must be 3 characters or fewer");
});

test("follow validation rejects self follows", () => {
  assert.equal(canFollowUser("member-a", "member-b"), true);
  assert.equal(canFollowUser("member-a", "member-a"), false);
  assert.equal(canFollowUser("", "member-b"), false);
});

test("hidden, removed, draft, and suspended content is not public", () => {
  assert.equal(isPublicSocialContent("published", "active"), true);
  assert.equal(isPublicSocialContent("hidden", "active"), false);
  assert.equal(isPublicSocialContent("removed", "active"), false);
  assert.equal(isPublicSocialContent("published", "suspended"), false);
  assert.equal(isPublicSocialContent("published", "active", "draft"), false);
});

test("report targets and moderation states are allowlisted", () => {
  assert.equal(parseReportTarget("transmission"), "transmission");
  assert.equal(parseReportTarget("user"), null);
  assert.equal(parseModerationState("hidden"), "hidden");
  assert.equal(parseModerationState("delete"), null);
});
