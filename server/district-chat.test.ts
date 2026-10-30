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

test("blocks are server-enforced for world and private delivery and can be removed", () => {
  const hub = new DistrictChatHub(() => 2_500);
  const senderEvents: Event[] = [];
  const targetEvents: Event[] = [];
  const otherEvents: Event[] = [];
  const senderId = hub.connect(
    { kind: "guest", guestId: "11111111-aaaa", displayName: "Guest-11111111" },
    peer(senderEvents),
  );
  const targetId = hub.connect(
    { kind: "member", userId: "member-2", displayName: "TargetUser" },
    peer(targetEvents),
  );
  hub.connect(
    { kind: "member", userId: "member-3", displayName: "OtherUser" },
    peer(otherEvents),
  );
  targetEvents.length = 0;
  hub.receive(targetId, JSON.stringify({
    type: "block",
    sender: "Guest-11111111",
    blocked: true,
  }));
  assert.deepEqual(eventList(targetEvents, "block-state").at(-1)?.senders, ["Guest-11111111"]);
  targetEvents.length = 0;

  hub.receive(senderId, JSON.stringify({
    type: "send",
    channel: "world",
    text: "not for the blocker",
  }));
  assert.equal(eventList(targetEvents, "message").length, 0);
  assert.equal(eventList(otherEvents, "message").length, 1);

  hub.receive(senderId, JSON.stringify({
    type: "send",
    channel: "private",
    recipient: "TargetUser",
    text: "private blocked message",
  }));
  assert.equal(eventList(targetEvents, "message").length, 0);
  assert.match(String(eventList(senderEvents, "error").at(-1)?.text), /blocked messages/i);

  hub.receive(targetId, JSON.stringify({
    type: "block",
    sender: "Guest-11111111",
    blocked: false,
  }));
  assert.deepEqual(eventList(targetEvents, "block-state").at(-1)?.senders, []);
  targetEvents.length = 0;
  hub.receive(senderId, JSON.stringify({
    type: "send",
    channel: "private",
    recipient: "TargetUser",
    text: "allowed after unblock",
  }));
  assert.equal(eventList(targetEvents, "message").length, 1);
  assert.equal(eventList(targetEvents, "message")[0].text, "allowed after unblock");
});

test("reports validate message delivery and omit private content and recipient metadata", () => {
  const hubReports: Array<Record<string, unknown>> = [];
  const hub = new DistrictChatHub(() => 4_000, (report) => hubReports.push(report));
  const senderEvents: Event[] = [];
  const targetEvents: Event[] = [];
  const outsiderEvents: Event[] = [];
  const senderId = hub.connect(
    { kind: "member", userId: "sender", displayName: "Sender" },
    peer(senderEvents),
  );
  const targetId = hub.connect(
    { kind: "member", userId: "target", displayName: "Target" },
    peer(targetEvents),
  );
  const outsiderId = hub.connect(
    { kind: "member", userId: "outsider", displayName: "Outsider" },
    peer(outsiderEvents),
  );
  targetEvents.length = 0;
  outsiderEvents.length = 0;
  hub.receive(senderId, JSON.stringify({
    type: "send",
    channel: "private",
    recipient: "Target",
    text: "private message text must not be retained",
  }));
  const privateMessageId = eventList(targetEvents, "message")[0]?.id as string;

  hub.receive(outsiderId, JSON.stringify({
    type: "report",
    messageId: privateMessageId,
    category: "harassment",
  }));
  assert.equal(hubReports.length, 0);
  assert.match(String(eventList(outsiderEvents, "error").at(-1)?.text), /no longer available/i);

  hub.receive(targetId, JSON.stringify({
    type: "report",
    messageId: privateMessageId,
    category: "threats",
  }));
  assert.equal(hubReports.length, 1);
  assert.deepEqual(hubReports[0], {
    messageId: privateMessageId,
    channel: "private",
    category: "threats",
    reportedSender: "Sender",
    reporterKind: "member",
  });
  assert.equal("text" in hubReports[0], false);
  assert.equal("recipient" in hubReports[0], false);

  targetEvents.length = 0;
  hub.receive(targetId, JSON.stringify({
    type: "report",
    messageId: "not-a-uuid",
    category: "other",
  }));
  assert.match(String(eventList(targetEvents, "error").at(-1)?.text), /invalid chat message/i);
  hub.receive(targetId, JSON.stringify({
    type: "report",
    messageId: privateMessageId,
    category: "unrecognized",
  }));
  assert.match(String(eventList(targetEvents, "error").at(-1)?.text), /invalid chat message/i);
});

test("reports have a separate per-player rate limit", () => {
  let now = 6_000;
  const reports: Array<Record<string, unknown>> = [];
  const hub = new DistrictChatHub(() => now, (report) => reports.push(report));
  const senderEvents: Event[] = [];
  const reporterEvents: Event[] = [];
  const senderId = hub.connect(
    { kind: "member", userId: "sender", displayName: "Sender" },
    peer(senderEvents),
  );
  const reporterId = hub.connect(
    { kind: "member", userId: "reporter", displayName: "Reporter" },
    peer(reporterEvents),
  );
  senderEvents.length = 0;
  reporterEvents.length = 0;
  for (let i = 0; i < 4; i++) {
    hub.receive(senderId, JSON.stringify({
      type: "send",
      channel: "world",
      text: `message ${i}`,
    }));
    const messageId = eventList(reporterEvents, "message").at(-1)?.id as string;
    hub.receive(reporterId, JSON.stringify({
      type: "report",
      messageId,
      category: "spam",
    }));
    now += 1;
  }
  assert.equal(reports.length, 3);
  const [limitError] = eventList(reporterEvents, "error");
  assert.match(String(limitError?.text), /report limit/i);
  assert.ok(Number(limitError?.cooldownMs) > 0);
});

test("party membership requires a targeted invitation and routes only to party members", () => {
  const hub = new DistrictChatHub(() => 3_000);
  const leader: Event[] = [];
  const invitee: Event[] = [];
  const outsider: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "member-1", displayName: "Leader" },
    peer(leader),
  );
  const inviteeId = hub.connect(
    { kind: "member", userId: "member-2", displayName: "Invitee" },
    peer(invitee),
  );
  const outsiderId = hub.connect(
    { kind: "member", userId: "member-3", displayName: "Outsider" },
    peer(outsider),
  );
  leader.length = 0;
  invitee.length = 0;
  outsider.length = 0;

  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "not yet" }));
  assert.match(String(eventList(leader, "error")[0]?.text), /not in a party/i);
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  const leaderState = eventList(leader, "party-state").at(-1);
  assert.equal((leaderState?.party as { members: string[] }).members[0], "Leader");

  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Invitee" }));
  const invitation = (eventList(invitee, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  assert.ok(invitation?.id);
  hub.receive(inviteeId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  leader.length = 0;
  invitee.length = 0;
  outsider.length = 0;

  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "members only" }));
  assert.equal(eventList(leader, "message").length, 1);
  assert.equal(eventList(invitee, "message").length, 1);
  assert.equal(eventList(outsider, "message").length, 0);
  assert.equal(eventList(invitee, "message")[0].channel, "party");

  hub.receive(inviteeId, JSON.stringify({ type: "party", action: "leave" }));
  assert.equal(eventList(invitee, "party-state").at(-1)?.party, null);
  leader.length = 0;
  invitee.length = 0;
  outsider.length = 0;
  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "after leave" }));
  assert.equal(eventList(leader, "message").length, 1);
  assert.equal(eventList(invitee, "message").length, 0);
  assert.equal(eventList(outsider, "message").length, 0);
});

test("only the party leader can remove a member and the removed member loses party access", () => {
  const hub = new DistrictChatHub(() => 3_500);
  const leader: Event[] = [];
  const member: Event[] = [];
  const remainingMember: Event[] = [];
  const outsider: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "leader-id", displayName: "Leader" },
    peer(leader),
  );
  const memberId = hub.connect(
    { kind: "member", userId: "member-id", displayName: "Member" },
    peer(member),
  );
  const remainingMemberId = hub.connect(
    { kind: "member", userId: "remaining-id", displayName: "Staying" },
    peer(remainingMember),
  );
  const outsiderId = hub.connect(
    { kind: "member", userId: "outsider-id", displayName: "Outsider" },
    peer(outsider),
  );

  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  for (const [target, identity, name] of [
    [memberId, member, "Member"],
    [remainingMemberId, remainingMember, "Staying"],
  ] as const) {
    hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: name }));
    const invitation = (eventList(identity, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
    hub.receive(target, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  }

  leader.length = 0;
  member.length = 0;
  remainingMember.length = 0;
  outsider.length = 0;
  hub.receive(memberId, JSON.stringify({ type: "party", action: "remove", recipient: "Staying" }));
  assert.match(String(eventList(member, "error").at(-1)?.text), /only the party leader/i);
  hub.receive(outsiderId, JSON.stringify({ type: "party", action: "remove", recipient: "Member" }));
  assert.match(String(eventList(outsider, "error").at(-1)?.text), /not currently in a party/i);
  assert.equal(eventList(remainingMember, "party-state").length, 0);

  hub.receive(leaderId, JSON.stringify({ type: "party", action: "remove", recipient: "Member" }));
  assert.equal(eventList(member, "party-state").at(-1)?.party, null);
  assert.match(String(eventList(member, "system").at(-1)?.text), /removed from .* party access has been revoked/i);
  assert.deepEqual(
    (eventList(leader, "party-state").at(-1)?.party as { members: string[] }).members,
    ["Leader", "Staying"],
  );
  assert.deepEqual(
    (eventList(remainingMember, "party-state").at(-1)?.party as { members: string[] }).members,
    ["Leader", "Staying"],
  );

  leader.length = 0;
  member.length = 0;
  remainingMember.length = 0;
  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "after removal" }));
  assert.equal(eventList(leader, "message").length, 1);
  assert.equal(eventList(remainingMember, "message").length, 1);
  assert.equal(eventList(member, "message").length, 0);
  hub.receive(memberId, JSON.stringify({ type: "send", channel: "party", text: "still here?" }));
  assert.match(String(eventList(member, "error").at(-1)?.text), /not in a party/i);
});

test("an offline removed member receives the removal explanation on reconnect", () => {
  const hub = new DistrictChatHub();
  const leaderEvents: Event[] = [];
  const memberEvents: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "leader-id", displayName: "Leader" },
    peer(leaderEvents),
  );
  const memberIdentity = { kind: "member" as const, userId: "member-id", displayName: "Member" };
  const memberId = hub.connect(memberIdentity, peer(memberEvents));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Member" }));
  const invitation = (eventList(memberEvents, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  hub.receive(memberId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  hub.disconnect(memberId);

  hub.receive(leaderId, JSON.stringify({ type: "party", action: "remove", recipient: "Member" }));
  const reconnectedEvents: Event[] = [];
  hub.connect(memberIdentity, peer(reconnectedEvents));
  assert.equal(eventList(reconnectedEvents, "party-state").at(-1)?.party, null);
  assert.match(String(eventList(reconnectedEvents, "system").at(-1)?.text), /removed from .* party access has been revoked/i);
});

test("party invitations reject invalid recipients and cannot be accepted by another identity", () => {
  const hub = new DistrictChatHub();
  const leader: Event[] = [];
  const target: Event[] = [];
  const other: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "member-1", displayName: "Leader" },
    peer(leader),
  );
  const targetId = hub.connect(
    { kind: "member", userId: "member-2", displayName: "Target" },
    peer(target),
  );
  const otherId = hub.connect(
    { kind: "member", userId: "member-3", displayName: "Other" },
    peer(other),
  );
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  leader.length = 0;
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "nobody" }));
  assert.match(String(eventList(leader, "error").at(-1)?.text), /unavailable or not online/i);

  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Target" }));
  const invitation = (eventList(target, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  hub.receive(otherId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  assert.match(String(eventList(other, "error").at(-1)?.text), /no longer valid/i);
  hub.receive(targetId, JSON.stringify({ type: "party", action: "join", invitationId: "not-a-uuid" }));
  assert.match(String(eventList(target, "error").at(-1)?.text), /invalid chat message/i);
});

test("expired invitations disappear for connected recipients and expired IDs stay invalid", async () => {
  let now = 10_000;
  const invitationTtlMs = 20;
  const hub = new DistrictChatHub(() => now, undefined, invitationTtlMs);
  const leaderEvents: Event[] = [];
  const inviteeEvents: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "expiry-leader", displayName: "Leader" },
    peer(leaderEvents),
  );
  const inviteeId = hub.connect(
    { kind: "member", userId: "expiry-invitee", displayName: "Invitee" },
    peer(inviteeEvents),
  );
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Invitee" }));
  const invitation = (eventList(inviteeEvents, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  assert.ok(invitation?.id);

  inviteeEvents.length = 0;
  now += invitationTtlMs;
  await new Promise((resolve) => setTimeout(resolve, invitationTtlMs + 10));

  const expiredState = eventList(inviteeEvents, "party-state").at(-1);
  assert.deepEqual(expiredState?.invitations, []);
  hub.receive(inviteeId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  assert.match(String(eventList(inviteeEvents, "error").at(-1)?.text), /no longer valid/i);
  assert.equal(eventList(inviteeEvents, "party-state").at(-1)?.party, null);
});

test("expired invitations are omitted after reconnect and cannot be joined", () => {
  let now = 20_000;
  const invitationTtlMs = 50;
  const hub = new DistrictChatHub(() => now, undefined, invitationTtlMs);
  const leaderEvents: Event[] = [];
  const inviteeEvents: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "reconnect-leader", displayName: "Leader" },
    peer(leaderEvents),
  );
  const inviteeIdentity = { kind: "member" as const, userId: "reconnect-invitee", displayName: "Invitee" };
  const inviteeId = hub.connect(inviteeIdentity, peer(inviteeEvents));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Invitee" }));
  const invitation = (eventList(inviteeEvents, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  assert.ok(invitation?.id);
  hub.disconnect(inviteeId);

  now += invitationTtlMs;
  const reconnectedEvents: Event[] = [];
  const reconnectedId = hub.connect(inviteeIdentity, peer(reconnectedEvents));
  assert.deepEqual(eventList(reconnectedEvents, "party-state").at(-1)?.invitations, []);
  hub.receive(reconnectedId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  assert.match(String(eventList(reconnectedEvents, "error").at(-1)?.text), /no longer valid/i);
  assert.equal(eventList(reconnectedEvents, "party-state").at(-1)?.party, null);
});

test("party delivery excludes disconnected members and guest disconnects remove membership", () => {
  const hub = new DistrictChatHub();
  const leader: Event[] = [];
  const guest: Event[] = [];
  const outsider: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "member-1", displayName: "Leader" },
    peer(leader),
  );
  const guestId = hub.connect(
    { kind: "guest", guestId: "guest-2", displayName: "Guest-guest2" },
    peer(guest),
  );
  const outsiderId = hub.connect(
    { kind: "member", userId: "member-3", displayName: "Outsider" },
    peer(outsider),
  );
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Guest-guest2" }));
  const invitation = (eventList(guest, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  hub.receive(guestId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  hub.disconnect(guestId);
  leader.length = 0;
  guest.length = 0;
  outsider.length = 0;

  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "only connected members" }));
  assert.equal(eventList(leader, "message").length, 1);
  assert.equal(eventList(guest, "message").length, 0);
  assert.equal(eventList(outsider, "message").length, 0);
  hub.disconnect(outsiderId);
});

test("member party membership survives disconnects without delivering to offline sockets", () => {
  const hub = new DistrictChatHub();
  const leader: Event[] = [];
  const member: Event[] = [];
  const leaderId = hub.connect(
    { kind: "member", userId: "member-1", displayName: "Leader" },
    peer(leader),
  );
  const memberIdentity = { kind: "member" as const, userId: "member-2", displayName: "Member" };
  const memberId = hub.connect(memberIdentity, peer(member));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "create" }));
  hub.receive(leaderId, JSON.stringify({ type: "party", action: "invite", recipient: "Member" }));
  const invitation = (eventList(member, "party-state").at(-1)?.invitations as Array<{ id: string }>)[0];
  hub.receive(memberId, JSON.stringify({ type: "party", action: "join", invitationId: invitation.id }));
  hub.disconnect(memberId);

  leader.length = 0;
  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "offline member" }));
  assert.equal(eventList(leader, "message").length, 1);
  assert.equal(eventList(member, "message").length, 0);

  const reconnectedEvents: Event[] = [];
  const reconnectedId = hub.connect(memberIdentity, peer(reconnectedEvents));
  const state = eventList(reconnectedEvents, "party-state").at(-1);
  assert.equal((state?.party as { members: string[] }).members.includes("Member"), true);
  leader.length = 0;
  reconnectedEvents.length = 0;
  hub.receive(leaderId, JSON.stringify({ type: "send", channel: "party", text: "member returned" }));
  assert.equal(eventList(leader, "message").length, 1);
  assert.equal(eventList(reconnectedEvents, "message").length, 1);
  hub.disconnect(reconnectedId);
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
