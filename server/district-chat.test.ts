import assert from "node:assert/strict";
import test from "node:test";
import {
  DistrictChatHub,
  issueDistrictChatTicket,
  sanitizeDistrictChatText,
  verifyDistrictChatTicket,
} from "./district-chat";

type Event = { type: string; [key: string]: unknown };

function peer(events: Event[]) {
  return { send: (event: Event) => events.push(event) };
}

function eventList(events: Event[], type: string) {
  return events.filter((event) => event.type === type);
}

test("chat tickets are signed, short-lived, and reject tampering", () => {
  const identity = { kind: "member" as const, userId: "member-1", displayName: "VantaUser" };
  const ticket = issueDistrictChatTicket(identity, 10_000, "test-secret");

  assert.equal(verifyDistrictChatTicket(ticket, 10_500, "test-secret")?.userId, "member-1");
  assert.equal(verifyDistrictChatTicket(ticket, 70_001, "test-secret"), null);
  assert.equal(verifyDistrictChatTicket(`${ticket}x`, 10_500, "test-secret"), null);
});

test("world chat broadcasts plain text to connected clients only", () => {
  let now = 1_000;
  const hub = new DistrictChatHub(() => now);
  const first: Event[] = [];
  const second: Event[] = [];
  const third: Event[] = [];
  const ids = [
    hub.connect({ kind: "guest", guestId: "11111111-aaaa", displayName: "Guest-11111111" }, peer(first)),
    hub.connect({ kind: "guest", guestId: "22222222-bbbb", displayName: "Guest-22222222" }, peer(second)),
    hub.connect({ kind: "guest", guestId: "33333333-cccc", displayName: "Guest-33333333" }, peer(third)),
  ];
  first.length = 0;
  second.length = 0;
  third.length = 0;

  hub.receive(ids[0], JSON.stringify({
    type: "send",
    channel: "world",
    text: "<script>alert(1)</script> hello",
  }));

  for (const events of [first, second, third]) {
    const [message] = eventList(events, "message");
    assert.equal(message?.channel, "world");
    assert.equal(message?.text, "<script>alert(1)</script> hello");
    assert.equal(typeof message?.id, "string");
  }
  assert.equal(sanitizeDistrictChatText("  hello\u0000 world  "), "hello world");
});

test("private chat is routed to its named online player, never the wider world", () => {
  const hub = new DistrictChatHub(() => 2_000);
  const senderEvents: Event[] = [];
  const targetEvents: Event[] = [];
  const otherEvents: Event[] = [];
  const senderId = hub.connect(
    { kind: "guest", guestId: "11111111-aaaa", displayName: "Guest-11111111" },
    peer(senderEvents),
  );
  hub.connect(
    { kind: "member", userId: "member-2", displayName: "TargetUser" },
    peer(targetEvents),
  );
  hub.connect(
    { kind: "member", userId: "member-3", displayName: "OtherUser" },
    peer(otherEvents),
  );
  senderEvents.length = 0;
  targetEvents.length = 0;
  otherEvents.length = 0;

  hub.receive(senderId, JSON.stringify({
    type: "send",
    channel: "private",
    recipient: "targetuser",
    text: "private payload",
  }));

  assert.equal(eventList(senderEvents, "message").length, 1);
  assert.equal(eventList(targetEvents, "message").length, 1);
  assert.equal(eventList(otherEvents, "message").length, 0);
  assert.equal(eventList(targetEvents, "message")[0].text, "private payload");

  hub.receive(senderId, JSON.stringify({
    type: "send",
    channel: "private",
    recipient: "missing-user",
    text: "not delivered",
  }));
  assert.equal(eventList(otherEvents, "message").length, 0);
  assert.match(String(eventList(senderEvents, "error").at(-1)?.text), /unavailable or not online/i);
});

test("party messages are rejected without broadcasting", () => {
  const hub = new DistrictChatHub();
  const sender: Event[] = [];
  const other: Event[] = [];
  const senderId = hub.connect(
    { kind: "guest", guestId: "11111111-aaaa", displayName: "Guest-11111111" },
    peer(sender),
  );
  hub.connect(
    { kind: "guest", guestId: "22222222-bbbb", displayName: "Guest-22222222" },
    peer(other),
  );
  sender.length = 0;
  other.length = 0;

  hub.receive(senderId, JSON.stringify({ type: "send", channel: "party", text: "hello" }));

  assert.match(String(eventList(sender, "error")[0]?.text), /join a party/i);
  assert.equal(eventList(other, "message").length, 0);
});

test("invalid and overlong payloads are rejected and rate limits report cooldown", () => {
  let now = 5_000;
  const hub = new DistrictChatHub(() => now);
  const events: Event[] = [];
  const clientId = hub.connect(
    { kind: "guest", guestId: "11111111-aaaa", displayName: "Guest-11111111" },
    peer(events),
  );
  events.length = 0;

  hub.receive(clientId, JSON.stringify({ type: "send", channel: "world", text: "x".repeat(501) }));
  assert.match(String(eventList(events, "error")[0]?.text), /500 characters/);
  events.length = 0;

  for (let i = 0; i < 6; i++) {
    hub.receive(clientId, JSON.stringify({ type: "send", channel: "world", text: `message ${i}` }));
  }
  hub.receive(clientId, JSON.stringify({ type: "send", channel: "world", text: "too soon" }));
  const [rateError] = eventList(events, "error");
  assert.match(String(rateError?.text), /slow down/i);
  assert.ok(Number(rateError?.cooldownMs) > 0);

  now += 10_001;
  events.length = 0;
  hub.receive(clientId, "not-json");
  assert.match(String(eventList(events, "error")[0]?.text), /invalid chat message/i);
});

test("guest display names remain distinct when short prefixes collide", () => {
  const hub = new DistrictChatHub();
  const first: Event[] = [];
  const second: Event[] = [];
  hub.connect(
    { kind: "guest", guestId: "abcdef12-aaaa", displayName: "Guest-abcdef12" },
    peer(first),
  );
  hub.connect(
    { kind: "guest", guestId: "abcdef12-bbbb", displayName: "Guest-abcdef12" },
    peer(second),
  );
  const firstName = String(eventList(first, "welcome")[0]?.displayName);
  const secondName = String(eventList(second, "welcome")[0]?.displayName);
  assert.notEqual(firstName.toLowerCase(), secondName.toLowerCase());
});
