import assert from "node:assert/strict";
import test from "node:test";
import { DISTRICT_CHAT_HISTORY_LIMIT, parseDistrictChatInput } from "./district-chat-commands";

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

test("party remains unavailable and local/system channels are read-only", () => {
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
  assert.equal(DISTRICT_CHAT_HISTORY_LIMIT, 120);
});
