import assert from "node:assert/strict";
import test from "node:test";
import {
  DISTRICT_CHAT_SYSTEM_QUEUE_KEY,
  drainDistrictChatSystemMessages,
  queueDistrictChatSystemMessage,
  type DistrictChatSystemStorage,
} from "./district-chat-events";

function createStorage(): DistrictChatSystemStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => { values.delete(key); },
  };
}

test("system events cross game routes through bounded session-only storage", () => {
  const storage = createStorage();
  queueDistrictChatSystemMessage("Mission complete.", storage);
  assert.deepEqual(drainDistrictChatSystemMessages(storage), ["Mission complete."]);
  assert.equal(storage.getItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY), null);
  assert.deepEqual(drainDistrictChatSystemMessages(storage), []);
});

test("system queue recovers from corrupt data and caps retained notices", () => {
  const storage = createStorage();
  storage.setItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY, "{bad");
  queueDistrictChatSystemMessage("Recovered.", storage);
  for (let index = 0; index < 30; index++) queueDistrictChatSystemMessage(`notice-${index}`, storage);
  const messages = drainDistrictChatSystemMessages(storage);
  assert.equal(messages.length, 24);
  assert.equal(messages[0], "notice-6");
  assert.equal(messages.at(-1), "notice-29");
});
