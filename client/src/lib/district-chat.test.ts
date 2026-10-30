import assert from "node:assert/strict";
import test from "node:test";
import {
  canReportDistrictChatMessage,
  DISTRICT_CHAT_HISTORY_LIMIT,
  isOwnDistrictChatMessage,
  parseDistrictChatInput,
} from "./district-chat-commands";

test("chat commands parse world, private, and reply aliases", () => {
  assert.deepEqual(parseDistrictChatInput("/world hello city", "local", null), {
    kind: "send",
    channel: "world",
    text: "hello city",
  });
  assert.deepEqual(parseDistrictChatInput("/private @Aster private hello", "world", null), {
    kind: "send",
    channel: "private",
    recipient: "Aster",
    text: "private hello",
  });
  assert.deepEqual(parseDistrictChatInput("/r got it", "private", "Aster"), {
    kind: "send",
    channel: "private",
    recipient: "Aster",
    text: "got it",
  });
});

test("party messages are parsed for server authorization and local/system channels stay read-only", () => {
  assert.deepEqual(parseDistrictChatInput("/party hi", "world", null), {
    kind: "send",
    channel: "party",
    text: "hi",
  });
  assert.match(
    parseDistrictChatInput("message", "system", null).kind === "error"
      ? parseDistrictChatInput("message", "system", null).text
      : "",
    /read-only/i,
  );
});

test("chat parser provides help and rejects malformed, empty, and overlong messages", () => {
  assert.equal(parseDistrictChatInput("/help", "world", null).kind, "help");
  assert.equal(parseDistrictChatInput("/private", "world", null).kind, "error");
  assert.equal(parseDistrictChatInput("/reply hello", "world", null).kind, "error");
  assert.equal(parseDistrictChatInput("   ", "world", null).kind, "error");
  assert.equal(parseDistrictChatInput("x".repeat(501), "world", null).kind, "error");
  const maximumMessage = parseDistrictChatInput("x".repeat(500), "world", null);
  assert.equal(maximumMessage.kind, "send");
  if (maximumMessage.kind === "send") assert.equal(maximumMessage.text.length, 500);
  assert.equal(parseDistrictChatInput(`/world ${"x".repeat(501)}`, "world", null).kind, "error");
  assert.equal(DISTRICT_CHAT_HISTORY_LIMIT, 120);
});

test("message actions distinguish incoming private messages from outgoing and own messages", () => {
  assert.equal(canReportDistrictChatMessage({
    channel: "private",
    sender: "Aster",
    direction: "incoming",
  }, "VantaUser"), true);
  assert.equal(canReportDistrictChatMessage({
    channel: "private",
    sender: "VantaUser",
    direction: "outgoing",
  }, "@VantaUser"), false);
  assert.equal(canReportDistrictChatMessage({
    channel: "world",
    sender: "VantaUser",
  }, "VantaUser"), false);
  assert.equal(canReportDistrictChatMessage({
    channel: "party",
    sender: "Aster",
  }, "VantaUser"), true);
  assert.equal(canReportDistrictChatMessage({
    channel: "system",
    sender: "SYSTEM",
  }, "VantaUser"), false);
  assert.equal(isOwnDistrictChatMessage("Guest-abcdef12", "Guest-abcdef12 · TEMP"), true);
});
