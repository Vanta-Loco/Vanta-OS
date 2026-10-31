import test from "node:test";
import assert from "node:assert/strict";
import {
  canFollowUser,
  encodeSocialFeedCursor,
  isPublicSocialContent,
  parseModerationState,
  parseReportTarget,
  parseSocialFeedCursor,
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

test("social feed cursors round-trip stable timestamps and IDs", () => {
  const cursor = { createdAt: "2026-10-31T08:15:30.000Z", id: "123e4567-e89b-42d3-a456-426614174000" };
  const encoded = encodeSocialFeedCursor(cursor);
  assert.deepEqual(parseSocialFeedCursor(encoded), cursor);
});

test("social feed cursors reject malformed and oversized input", () => {
  assert.equal(parseSocialFeedCursor(undefined), undefined);
  assert.equal(parseSocialFeedCursor("not-base64-json"), null);
  assert.equal(parseSocialFeedCursor(Buffer.from(JSON.stringify(["not-a-date", "not-a-uuid"])).toString("base64url")), null);
  assert.equal(parseSocialFeedCursor("x".repeat(257)), null);
  assert.throws(() => encodeSocialFeedCursor({ createdAt: "bad", id: "bad" }));
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
