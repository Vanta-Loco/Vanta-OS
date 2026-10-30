import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { Express } from "express";
import type { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { getRequestUser } from "./user-auth";
import { getSessionSecret } from "./runtime-config";

const CHAT_TICKET_TTL_MS = 60_000;
const TICKET_PROTOCOL = "vanta-ticket.";
const CHAT_PROTOCOL = "vanta-chat.v1";
const MESSAGE_WINDOW_MS = 10_000;
const MESSAGE_LIMIT_PER_WINDOW = 6;
const REPORT_WINDOW_MS = 15 * 60_000;
const REPORT_LIMIT_PER_WINDOW = 3;
const REPORTABLE_MESSAGE_LIMIT = 500;
const BLOCKED_SENDER_LIMIT = 100;
const PARTY_INVITE_TTL_MS = 5 * 60_000;
const PARTY_MEMBER_LIMIT = 8;
const PENDING_PARTY_NOTICE_LIMIT = 500;
export const MAX_DISTRICT_CHAT_MESSAGE_LENGTH = 500;
export const DISTRICT_CHAT_REPORT_CATEGORIES = ["harassment", "hate", "threats", "spam", "other"] as const;
type DistrictChatReportCategory = typeof DISTRICT_CHAT_REPORT_CATEGORIES[number];

export type ChatTicketIdentity =
  | { kind: "member"; userId: string; displayName: string }
  | { kind: "guest"; guestId: string; displayName: string };

type SignedChatTicket = ChatTicketIdentity & {
  version: 1;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

type ChatClientCommand = {
  type: "send";
  channel: "world" | "party" | "private";
  text: string;
  recipient?: string;
} | {
  type: "party";
  action: "create" | "join" | "leave" | "invite" | "remove" | "transfer-leadership";
  invitationId?: string;
  recipient?: string;
  memberId?: string;
} | {
  type: "block";
  sender: string;
  blocked: boolean;
} | {
  type: "report";
  messageId: string;
  category: DistrictChatReportCategory;
};

type ChatEvent =
  | { type: "welcome"; displayName: string; identityType: "member" | "guest" }
  | { type: "presence"; names: string[] }
  | { type: "block-state"; senders: string[] }
  | {
      type: "party-state";
      party: {
        id: string;
        name: string;
        leader: string;
        leaderMemberId: string;
        members: Array<{ id: string; name: string }>;
        isLeader: boolean;
      } | null;
      invitations: Array<{ id: string; partyName: string; inviter: string }>;
    }
  | { type: "system"; id: string; text: string; timestamp: string }
  | {
      type: "message";
      id: string;
      channel: "world" | "party" | "private";
      sender: string;
      text: string;
      timestamp: string;
      recipient?: string;
      direction?: "incoming" | "outgoing";
    }
  | { type: "error"; text: string; cooldownMs?: number };

type ChatPeer = {
  send(event: ChatEvent): void;
};

type ConnectedClient = {
  connectionId: string;
  identityKey: string;
  displayName: string;
  kind: "member" | "guest";
  peer: ChatPeer;
  sentAt: number[];
};

type ReportableMessage = {
  channel: "world" | "party" | "private";
  senderIdentityKey: string;
  senderName: string;
  recipientIdentityKeys: Set<string>;
};

const commandSchema = z.object({
  type: z.literal("send"),
  channel: z.enum(["world", "party", "private"]),
  text: z.string().max(MAX_DISTRICT_CHAT_MESSAGE_LENGTH),
  recipient: z.string().max(32).optional(),
}).strict().or(z.object({
  type: z.literal("party"),
  action: z.enum(["create", "join", "leave", "invite", "remove", "transfer-leadership"]),
  invitationId: z.string().uuid().optional(),
  recipient: z.string().max(32).optional(),
  memberId: z.string().uuid().optional(),
}).strict()).or(z.object({
  type: z.literal("block"),
  sender: z.string().min(1).max(32),
  blocked: z.boolean(),
}).strict()).or(z.object({
  type: z.literal("report"),
  messageId: z.string().uuid(),
  category: z.enum(DISTRICT_CHAT_REPORT_CATEGORIES),
}).strict());

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().replace(/^@/, "").toLocaleLowerCase("en-US");
}

export function sanitizeDistrictChatText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signatureFor(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueDistrictChatTicket(
  identity: ChatTicketIdentity,
  now = Date.now(),
  secret = getSessionSecret(),
): string {
  const payload: SignedChatTicket = {
    ...identity,
    version: 1,
    issuedAt: now,
    expiresAt: now + CHAT_TICKET_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = base64UrlJson(payload);
  return `${encoded}.${signatureFor(encoded, secret)}`;
}

export function verifyDistrictChatTicket(
  ticket: string,
  now = Date.now(),
  secret = getSessionSecret(),
): SignedChatTicket | null {
  const [encoded, presentedSignature, extra] = ticket.split(".");
  if (!encoded || !presentedSignature || extra !== undefined) return null;
  const expected = Buffer.from(signatureFor(encoded, secret), "base64url");
  const presented = Buffer.from(presentedSignature, "base64url");
  if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) return null;

  try {
    const data = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedChatTicket;
    if (
      data.version !== 1 ||
      !Number.isFinite(data.issuedAt) ||
      !Number.isFinite(data.expiresAt) ||
      data.issuedAt > now + 5_000 ||
      data.expiresAt <= now ||
      data.expiresAt - data.issuedAt > CHAT_TICKET_TTL_MS ||
      typeof data.nonce !== "string"
    ) return null;
    if (data.kind === "member") {
      if (typeof data.userId !== "string" || !data.userId || !isSafeDisplayName(data.displayName)) return null;
    } else if (data.kind === "guest") {
      if (typeof data.guestId !== "string" || !data.guestId || !isSafeDisplayName(data.displayName)) return null;
    } else {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function isSafeDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 32 &&
    !/[\u0000-\u001F\u007F]/.test(value);
}

function parseCommand(raw: string): ChatClientCommand | null {
  if (Buffer.byteLength(raw, "utf8") > 2_048) return null;
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) return null;
  if (parsed.data.type === "block") {
    const sender = parsed.data.sender.trim().replace(/^@/, "");
    if (!sender || /[\u0000-\u001F\u007F]/.test(sender)) return null;
    return { ...parsed.data, sender };
  }
  if (parsed.data.type === "report") return { ...parsed.data };
  if (parsed.data.type === "party") {
    if (parsed.data.action === "join") {
      return parsed.data.invitationId ? { ...parsed.data } : null;
    }
    if (parsed.data.invitationId !== undefined) return null;
    if (parsed.data.action === "remove" && parsed.data.memberId) {
      return { ...parsed.data };
    }
    if (parsed.data.action === "invite" || parsed.data.action === "remove") {
      const recipient = parsed.data.recipient?.trim().replace(/^@/, "");
      if (!recipient || recipient.length > 32 || /[\u0000-\u001F\u007F]/.test(recipient)) return null;
      return { ...parsed.data, recipient };
    }
    if (parsed.data.recipient !== undefined) return null;
    return { ...parsed.data };
  }
  const text = sanitizeDistrictChatText(parsed.data.text);
  if (!text || text.length > MAX_DISTRICT_CHAT_MESSAGE_LENGTH) return null;
  if (parsed.data.channel === "private") {
    const recipient = parsed.data.recipient?.trim().replace(/^@/, "");
    if (!recipient || recipient.length > 32 || /[\u0000-\u001F\u007F]/.test(recipient)) return null;
    return { ...parsed.data, text, recipient };
  }
  if (parsed.data.recipient !== undefined) return null;
  return { ...parsed.data, text };
}

export class DistrictChatHub {
  private clients = new Map<string, ConnectedClient>();
  private parties = new Map<string, {
    id: string;
    name: string;
    leaderIdentityKey: string;
    members: Set<string>;
    memberNames: Map<string, string>;
    memberIds: Map<string, string>;
  }>();
  private partyByIdentity = new Map<string, string>();
  private partyInvitations = new Map<string, {
    id: string;
    partyId: string;
    targetIdentityKey: string;
    inviterIdentityKey: string;
    inviterName: string;
    expiresAt: number;
  }>();
  private partyInvitationExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingPartyRemovalNotices = new Map<string, string>();
  private blockedSenders = new Map<string, Map<string, string>>();
  private reportTimes = new Map<string, number[]>();
  private reportableMessages = new Map<string, ReportableMessage>();

  constructor(
    private readonly clock: () => number = () => Date.now(),
    private readonly reportSink: (report: {
      messageId: string;
      channel: "world" | "party" | "private";
      category: DistrictChatReportCategory;
      reportedSender: string;
      reporterKind: "member" | "guest";
    }) => void = (report) => console.warn("[district-chat] message report:", JSON.stringify(report)),
    private readonly partyInvitationTtlMs = PARTY_INVITE_TTL_MS,
  ) {}

  connect(identity: ChatTicketIdentity, peer: ChatPeer): string {
    this.expirePartyInvitations();
    const connectionId = randomUUID();
    const identityKey = identity.kind === "member"
      ? `member:${identity.userId}`
      : `guest:${identity.guestId}`;
    let displayName = identity.displayName;

    if (identity.kind === "guest") {
      let suffixLength = 8;
      while (this.hasName(displayName)) {
        suffixLength = Math.min(identity.guestId.replace(/-/g, "").length, suffixLength + 2);
        displayName = `Guest-${identity.guestId.replace(/-/g, "").slice(0, suffixLength)}`;
        if (suffixLength >= identity.guestId.replace(/-/g, "").length) {
          displayName = `Guest-${identity.guestId.replace(/-/g, "")}-${connectionId.slice(0, 4)}`;
          break;
        }
      }
    }

    this.clients.set(connectionId, {
      connectionId,
      identityKey,
      displayName,
      kind: identity.kind,
      peer,
      sentAt: [],
    });
    this.send(connectionId, {
      type: "welcome",
      displayName,
      identityType: identity.kind,
    });
    this.sendBlockState(identityKey);
    this.system(connectionId, "Connected to Vanta District chat. Messages are temporary and clear when the server restarts.");
    const partyId = this.partyByIdentity.get(identityKey);
    const party = partyId ? this.parties.get(partyId) : undefined;
    if (party) {
      party.memberNames.set(identityKey, displayName);
      this.broadcastPartyState(Array.from(party.members));
    } else {
      this.sendPartyState(identityKey);
    }
    const pendingPartyNotice = this.pendingPartyRemovalNotices.get(identityKey);
    if (pendingPartyNotice) {
      this.system(connectionId, pendingPartyNotice);
      this.pendingPartyRemovalNotices.delete(identityKey);
    }
    this.broadcastPresence();
    return connectionId;
  }

  disconnect(connectionId: string): void {
    const client = this.clients.get(connectionId);
    if (!this.clients.delete(connectionId)) return;
    let changedPartyMembers: string[] = [];
    if (client?.kind === "guest" && !this.hasConnectedIdentity(client.identityKey)) {
      const partyId = this.partyByIdentity.get(client.identityKey);
      const party = partyId ? this.parties.get(partyId) : undefined;
      changedPartyMembers = party ? Array.from(party.members).filter((key) => key !== client.identityKey) : [];
      changedPartyMembers.push(...this.removePartyIdentity(client.identityKey));
      changedPartyMembers.push(...this.removeInvitationsForIdentity(client.identityKey));
    } else if (client) {
      const partyId = this.partyByIdentity.get(client.identityKey);
      const party = partyId ? this.parties.get(partyId) : undefined;
      if (party) changedPartyMembers = Array.from(party.members);
    }
    this.broadcastPartyState(changedPartyMembers);
    this.broadcastPresence();
  }

  receive(connectionId: string, raw: string): void {
    const sender = this.clients.get(connectionId);
    if (!sender) return;
    const command = parseCommand(raw);
    if (!command) {
      this.error(connectionId, `Invalid chat message. Keep messages under ${MAX_DISTRICT_CHAT_MESSAGE_LENGTH} characters.`);
      return;
    }
    if (command.type === "party") {
      this.handlePartyCommand(sender, command);
      return;
    }
    if (command.type === "block") {
      this.setBlockedSender(sender, command.sender, command.blocked);
      return;
    }
    if (command.type === "report") {
      this.reportMessage(sender, command.messageId, command.category);
      return;
    }

    const now = this.clock();
    sender.sentAt = sender.sentAt.filter((time) => now - time < MESSAGE_WINDOW_MS);
    if (sender.sentAt.length >= MESSAGE_LIMIT_PER_WINDOW) {
      const cooldownMs = Math.max(250, MESSAGE_WINDOW_MS - (now - sender.sentAt[0]));
      this.error(connectionId, "Slow down before sending another message.", cooldownMs);
      return;
    }
    sender.sentAt.push(now);

    const timestamp = new Date(now).toISOString();
    const id = randomUUID();
    if (command.channel === "party") {
      const partyId = this.partyByIdentity.get(sender.identityKey);
      const party = partyId ? this.parties.get(partyId) : undefined;
      if (!party || !party.members.has(sender.identityKey)) {
        this.error(connectionId, "You are not in a party. Create one or accept an invitation first.");
        return;
      }
      const event: ChatEvent = {
        type: "message",
        id,
        channel: "party",
        sender: sender.displayName,
        text: command.text,
        timestamp,
      };
      const recipients = Array.from(this.clients.values()).filter((client) =>
        party.members.has(client.identityKey) &&
        !this.isBlocked(client.identityKey, sender.displayName)
      );
      this.rememberMessage(id, {
        channel: "party",
        senderIdentityKey: sender.identityKey,
        senderName: sender.displayName,
        recipientIdentityKeys: new Set(recipients.map((client) => client.identityKey)),
      });
      for (const client of recipients) this.safeSend(client, event);
      return;
    }
    if (command.channel === "world") {
      const event: ChatEvent = {
        type: "message",
        id,
        channel: "world",
        sender: sender.displayName,
        text: command.text,
        timestamp,
      };
      const recipients = Array.from(this.clients.values()).filter((client) =>
        !this.isBlocked(client.identityKey, sender.displayName)
      );
      this.rememberMessage(id, {
        channel: "world",
        senderIdentityKey: sender.identityKey,
        senderName: sender.displayName,
        recipientIdentityKeys: new Set(recipients.map((client) => client.identityKey)),
      });
      for (const client of recipients) this.safeSend(client, event);
      return;
    }

    const recipientName = command.recipient!;
    const recipientKey = normalizeName(recipientName);
    const targets = Array.from(this.clients.values()).filter((client) =>
      normalizeName(client.displayName) === recipientKey &&
      client.identityKey !== sender.identityKey
    );
    if (targets.length === 0) {
      this.error(connectionId, "That player is unavailable or not online.");
      return;
    }
    const deliverableTargets = targets.filter((target) => !this.isBlocked(target.identityKey, sender.displayName));
    if (deliverableTargets.length === 0) {
      this.error(connectionId, "That player has blocked messages from this sender.");
      return;
    }
    this.rememberMessage(id, {
      channel: "private",
      senderIdentityKey: sender.identityKey,
      senderName: sender.displayName,
      recipientIdentityKeys: new Set(deliverableTargets.map((target) => target.identityKey)),
    });

    this.safeSend(sender, {
      type: "message",
      id,
      channel: "private",
      sender: sender.displayName,
      recipient: deliverableTargets[0].displayName,
      direction: "outgoing",
      text: command.text,
      timestamp,
    });
    for (const target of deliverableTargets) {
      this.safeSend(target, {
        type: "message",
        id,
        channel: "private",
        sender: sender.displayName,
        recipient: target.displayName,
        direction: "incoming",
        text: command.text,
        timestamp,
      });
    }
  }

  private setBlockedSender(client: ConnectedClient, senderName: string, blocked: boolean): void {
    const normalized = normalizeName(senderName);
    if (!normalized || normalized === normalizeName(client.displayName)) {
      return this.error(client.connectionId, "You cannot block your own sender name.");
    }
    let blockedByIdentity = this.blockedSenders.get(client.identityKey);
    if (!blockedByIdentity) {
      blockedByIdentity = new Map();
      this.blockedSenders.set(client.identityKey, blockedByIdentity);
    }
    if (blocked && !blockedByIdentity.has(normalized) && blockedByIdentity.size >= BLOCKED_SENDER_LIMIT) {
      return this.error(client.connectionId, "Your block list is full. Unblock a sender before adding another.");
    }
    if (blocked) blockedByIdentity.set(normalized, senderName);
    else blockedByIdentity.delete(normalized);
    if (blockedByIdentity.size === 0) this.blockedSenders.delete(client.identityKey);
    this.sendBlockState(client.identityKey);
    this.system(client.connectionId, blocked
      ? `Messages from ${senderName} are blocked.`
      : `Messages from ${senderName} are unblocked.`);
  }

  private sendBlockState(identityKey: string): void {
    const senders = Array.from(this.blockedSenders.get(identityKey)?.values() ?? []);
    for (const client of Array.from(this.clients.values())) {
      if (client.identityKey === identityKey) this.safeSend(client, { type: "block-state", senders });
    }
  }

  private isBlocked(recipientIdentityKey: string, senderName: string): boolean {
    return this.blockedSenders.get(recipientIdentityKey)?.has(normalizeName(senderName)) ?? false;
  }

  private rememberMessage(id: string, message: ReportableMessage): void {
    this.reportableMessages.set(id, message);
    while (this.reportableMessages.size > REPORTABLE_MESSAGE_LIMIT) {
      const oldestId = this.reportableMessages.keys().next().value;
      if (!oldestId) break;
      this.reportableMessages.delete(oldestId);
    }
  }

  private reportMessage(
    reporter: ConnectedClient,
    messageId: string,
    category: DistrictChatReportCategory,
  ): void {
    const message = this.reportableMessages.get(messageId);
    if (
      !message ||
      message.senderIdentityKey === reporter.identityKey ||
      !message.recipientIdentityKeys.has(reporter.identityKey)
    ) {
      return this.error(reporter.connectionId, "That message is no longer available to report.");
    }

    const now = this.clock();
    const recentReports = (this.reportTimes.get(reporter.identityKey) ?? [])
      .filter((time) => now - time < REPORT_WINDOW_MS);
    if (this.reportTimes.size > 10_000) {
      for (const [identityKey, times] of Array.from(this.reportTimes.entries())) {
        if (times.every((time) => now - time >= REPORT_WINDOW_MS)) this.reportTimes.delete(identityKey);
      }
    }
    if (recentReports.length >= REPORT_LIMIT_PER_WINDOW) {
      this.reportTimes.set(reporter.identityKey, recentReports);
      const cooldownMs = Math.max(250, REPORT_WINDOW_MS - (now - recentReports[0]));
      return this.error(reporter.connectionId, "Report limit reached. Try again later.", cooldownMs);
    }
    recentReports.push(now);
    this.reportTimes.set(reporter.identityKey, recentReports);
    try {
      this.reportSink({
        messageId,
        channel: message.channel,
        category,
        reportedSender: message.senderName,
        reporterKind: reporter.kind,
      });
    } catch {
      return this.error(reporter.connectionId, "The report could not be submitted. Please try again.");
    }
    this.system(reporter.connectionId, "Report received. Message content is not included in the report.");
  }

  private handlePartyCommand(
    client: ConnectedClient,
    command: Extract<ChatClientCommand, { type: "party" }>,
  ): void {
    this.expirePartyInvitations();
    const currentPartyId = this.partyByIdentity.get(client.identityKey);
    const currentParty = currentPartyId ? this.parties.get(currentPartyId) : undefined;
    if (command.action === "create") {
      if (currentParty) return this.error(client.connectionId, "Leave your current party before creating another.");
      const id = randomUUID();
      const party = {
        id,
        name: `${client.displayName}'s party`,
        leaderIdentityKey: client.identityKey,
        members: new Set([client.identityKey]),
        memberNames: new Map([[client.identityKey, client.displayName]]),
        memberIds: new Map([[client.identityKey, randomUUID()]]),
      };
      this.parties.set(id, party);
      this.partyByIdentity.set(client.identityKey, id);
      this.broadcastPartyState([client.identityKey]);
      return;
    }
    if (command.action === "leave") {
      if (!currentParty) return this.error(client.connectionId, "You are not currently in a party.");
      const remainingMembers = Array.from(currentParty.members).filter((key) => key !== client.identityKey);
      const affectedInvitees = this.removePartyIdentity(client.identityKey);
      affectedInvitees.push(...this.removeInvitationsForIdentity(client.identityKey));
      this.broadcastPartyState([...remainingMembers, client.identityKey, ...affectedInvitees]);
      return;
    }
    if (command.action === "invite") {
      if (!currentParty) return this.error(client.connectionId, "Create or join a party before inviting players.");
      const recipientKey = normalizeName(command.recipient!);
      const recipientIdentities = new Map<string, ConnectedClient>();
      for (const connected of Array.from(this.clients.values())) {
        if (normalizeName(connected.displayName) === recipientKey && connected.identityKey !== client.identityKey) {
          recipientIdentities.set(connected.identityKey, connected);
        }
      }
      if (recipientIdentities.size === 0) {
        return this.error(client.connectionId, "That player is unavailable or not online.");
      }
      if (recipientIdentities.size > 1) {
        return this.error(client.connectionId, "More than one online player has that name. Use a unique player name.");
      }
      const [targetIdentityKey, target] = Array.from(recipientIdentities.entries())[0];
      if (this.partyByIdentity.has(targetIdentityKey)) {
        return this.error(client.connectionId, "That player is already in a party.");
      }
      const invitation = Array.from(this.partyInvitations.values()).find((item) =>
        item.partyId === currentParty.id && item.targetIdentityKey === targetIdentityKey
      );
      const id = invitation?.id ?? randomUUID();
      const nextInvitation = {
        id,
        partyId: currentParty.id,
        targetIdentityKey,
        inviterIdentityKey: client.identityKey,
        inviterName: client.displayName,
        expiresAt: this.clock() + this.partyInvitationTtlMs,
      };
      this.partyInvitations.set(id, nextInvitation);
      this.schedulePartyInvitationExpiry(nextInvitation);
      this.sendPartyState(targetIdentityKey);
      this.system(client.connectionId, `Party invitation sent to ${target.displayName}.`);
      return;
    }
    if (command.action === "transfer-leadership") {
      if (!currentParty) return this.error(client.connectionId, "You are not currently in a party.");
      if (currentParty.leaderIdentityKey !== client.identityKey) {
        return this.error(client.connectionId, "Only the party leader can transfer leadership.");
      }
      const targetIdentityKey = Array.from(currentParty.memberIds.entries())
        .find(([, memberId]) => memberId === command.memberId)?.[0];
      if (!targetIdentityKey || !currentParty.members.has(targetIdentityKey)) {
        return this.error(client.connectionId, "That player is no longer in your party.");
      }
      if (targetIdentityKey === client.identityKey) {
        return this.error(client.connectionId, "You are already the party leader.");
      }
      currentParty.leaderIdentityKey = targetIdentityKey;
      this.broadcastPartyState(Array.from(currentParty.members));
      return;
    }
    if (command.action === "remove") {
      if (!currentParty) return this.error(client.connectionId, "You are not currently in a party.");
      if (currentParty.leaderIdentityKey !== client.identityKey) {
        return this.error(client.connectionId, "Only the party leader can remove members.");
      }
      let targetIdentityKey: string | undefined;
      if (command.memberId) {
        targetIdentityKey = Array.from(currentParty.memberIds.entries())
          .find(([, memberId]) => memberId === command.memberId)?.[0];
        if (!targetIdentityKey || !currentParty.members.has(targetIdentityKey)) {
          return this.error(client.connectionId, "That player is no longer in your party.");
        }
      } else {
        const targetName = normalizeName(command.recipient ?? "");
        const targets = Array.from(currentParty.members).filter((identityKey) =>
          normalizeName(currentParty.memberNames.get(identityKey) ?? "") === targetName
        );
        if (targets.length === 0) return this.error(client.connectionId, "That player is not in your party.");
        if (targets.length > 1) {
          return this.error(client.connectionId, "More than one party member has that name. Select a member from the party roster.");
        }
        targetIdentityKey = targets[0];
      }
      if (targetIdentityKey === client.identityKey) {
        return this.error(client.connectionId, "You cannot remove yourself. Leave the party instead.");
      }
      const targetNameInParty = currentParty.memberNames.get(targetIdentityKey) ?? command.recipient ?? "Player";
      const partyName = currentParty.name;
      const remainingMembers = Array.from(currentParty.members).filter((key) => key !== targetIdentityKey);
      const affectedInvitees = this.removePartyIdentity(targetIdentityKey);
      affectedInvitees.push(...this.removeInvitationsForIdentity(targetIdentityKey));
      const removalNotice =
        `You were removed from ${partyName} by ${client.displayName}. Party access has been revoked.`;
      let deliveredNotice = false;
      for (const connected of Array.from(this.clients.values())) {
        if (connected.identityKey === targetIdentityKey) {
          this.system(connected.connectionId, removalNotice);
          deliveredNotice = true;
        }
      }
      if (!deliveredNotice) {
        this.pendingPartyRemovalNotices.set(targetIdentityKey, removalNotice);
        if (this.pendingPartyRemovalNotices.size > PENDING_PARTY_NOTICE_LIMIT) {
          const oldestIdentity = this.pendingPartyRemovalNotices.keys().next().value;
          if (oldestIdentity) this.pendingPartyRemovalNotices.delete(oldestIdentity);
        }
      }
      this.broadcastPartyState([...remainingMembers, targetIdentityKey, ...affectedInvitees]);
      this.system(client.connectionId, `${targetNameInParty} was removed from the party.`);
      return;
    }

    if (currentParty) return this.error(client.connectionId, "Leave your current party before joining another.");
    const invitation = this.partyInvitations.get(command.invitationId!);
    if (!invitation || invitation.targetIdentityKey !== client.identityKey || invitation.expiresAt <= this.clock()) {
      if (invitation?.targetIdentityKey === client.identityKey) this.deletePartyInvitation(invitation.id);
      this.sendPartyState(client.identityKey);
      return this.error(client.connectionId, "That party invitation is no longer valid.");
    }
    const party = this.parties.get(invitation.partyId);
    if (!party || party.members.size >= PARTY_MEMBER_LIMIT) {
      this.deletePartyInvitation(invitation.id);
      this.sendPartyState(client.identityKey);
      return this.error(client.connectionId, party ? "That party is full." : "That party no longer exists.");
    }
    party.members.add(client.identityKey);
    party.memberNames.set(client.identityKey, client.displayName);
    party.memberIds.set(client.identityKey, randomUUID());
    this.partyByIdentity.set(client.identityKey, party.id);
    const affectedInvitees = this.removeInvitationsForIdentity(client.identityKey);
    this.broadcastPartyState([...Array.from(party.members), ...affectedInvitees]);
  }

  private removePartyIdentity(identityKey: string): string[] {
    const partyId = this.partyByIdentity.get(identityKey);
    const party = partyId ? this.parties.get(partyId) : undefined;
    this.partyByIdentity.delete(identityKey);
    if (!party) return [];
    party.members.delete(identityKey);
    party.memberNames.delete(identityKey);
    party.memberIds.delete(identityKey);
    if (party.leaderIdentityKey === identityKey) {
      party.leaderIdentityKey = party.members.values().next().value ?? "";
    }
    const affectedInvitees: string[] = [];
    if (party.members.size === 0) {
      this.parties.delete(party.id);
      for (const [id, invite] of Array.from(this.partyInvitations.entries())) {
        if (invite.partyId === party.id) {
          affectedInvitees.push(invite.targetIdentityKey);
          this.deletePartyInvitation(id);
        }
      }
    }
    return affectedInvitees;
  }

  private removeInvitationsForIdentity(identityKey: string): string[] {
    const affectedInvitees: string[] = [];
    for (const [id, invitation] of Array.from(this.partyInvitations.entries())) {
      if (invitation.targetIdentityKey === identityKey || invitation.inviterIdentityKey === identityKey) {
        if (invitation.targetIdentityKey !== identityKey) affectedInvitees.push(invitation.targetIdentityKey);
        this.deletePartyInvitation(id);
      }
    }
    return affectedInvitees;
  }

  private schedulePartyInvitationExpiry(invitation: {
    id: string;
    expiresAt: number;
  }): void {
    const existingTimer = this.partyInvitationExpiryTimers.get(invitation.id);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      this.partyInvitationExpiryTimers.delete(invitation.id);
      this.expirePartyInvitations();
      const stillPending = this.partyInvitations.get(invitation.id);
      if (stillPending) this.schedulePartyInvitationExpiry(stillPending);
    }, Math.max(0, invitation.expiresAt - this.clock()));
    timer.unref?.();
    this.partyInvitationExpiryTimers.set(invitation.id, timer);
  }

  private deletePartyInvitation(id: string): void {
    this.partyInvitations.delete(id);
    const timer = this.partyInvitationExpiryTimers.get(id);
    if (timer) clearTimeout(timer);
    this.partyInvitationExpiryTimers.delete(id);
  }

  private expirePartyInvitations(): void {
    const now = this.clock();
    const affectedInvitees = new Set<string>();
    for (const [id, invitation] of Array.from(this.partyInvitations.entries())) {
      if (invitation.expiresAt <= now || !this.parties.has(invitation.partyId)) {
        affectedInvitees.add(invitation.targetIdentityKey);
        this.deletePartyInvitation(id);
      }
    }
    this.broadcastPartyState(Array.from(affectedInvitees));
  }

  private hasConnectedIdentity(identityKey: string): boolean {
    return Array.from(this.clients.values()).some((client) => client.identityKey === identityKey);
  }

  private sendPartyState(identityKey: string): void {
    const partyId = this.partyByIdentity.get(identityKey);
    const party = partyId ? this.parties.get(partyId) : undefined;
    const members = party
      ? Array.from(party.members, (memberIdentityKey) => ({
          id: party.memberIds.get(memberIdentityKey) ?? "",
          name: party.memberNames.get(memberIdentityKey) ?? "",
        }))
      : [];
    const invitations = Array.from(this.partyInvitations.values())
      .filter((invitation) => invitation.targetIdentityKey === identityKey)
      .flatMap((invitation) => {
        const invitedParty = this.parties.get(invitation.partyId);
        return invitedParty
          ? [{ id: invitation.id, partyName: invitedParty.name, inviter: invitation.inviterName }]
          : [];
      });
    const event: ChatEvent = {
      type: "party-state",
      party: party
        ? {
            id: party.id,
            name: party.name,
            leader: party.memberNames.get(party.leaderIdentityKey) ?? "",
            leaderMemberId: party.memberIds.get(party.leaderIdentityKey) ?? "",
            members,
            isLeader: party.leaderIdentityKey === identityKey,
          }
        : null,
      invitations,
    };
    for (const connected of Array.from(this.clients.values())) {
      if (connected.identityKey === identityKey) this.safeSend(connected, event);
    }
  }

  private broadcastPartyState(identityKeys: string[]): void {
    Array.from(new Set(identityKeys)).forEach((identityKey) => this.sendPartyState(identityKey));
  }

  private hasName(displayName: string): boolean {
    const normalized = normalizeName(displayName);
    return Array.from(this.clients.values()).some((client) => normalizeName(client.displayName) === normalized);
  }

  private send(connectionId: string, event: ChatEvent): void {
    const client = this.clients.get(connectionId);
    if (client) this.safeSend(client, event);
  }

  private safeSend(client: ConnectedClient, event: ChatEvent): void {
    try {
      client.peer.send(event);
    } catch {
      this.disconnect(client.connectionId);
    }
  }

  private system(connectionId: string, text: string): void {
    this.send(connectionId, {
      type: "system",
      id: randomUUID(),
      text,
      timestamp: new Date(this.clock()).toISOString(),
    });
  }

  private error(connectionId: string, text: string, cooldownMs?: number): void {
    this.send(connectionId, { type: "error", text, ...(cooldownMs ? { cooldownMs } : {}) });
  }

  private broadcastPresence(): void {
    const names = Array.from(new Set(Array.from(this.clients.values()).map((client) => client.displayName)))
      .sort((a, b) => a.localeCompare(b));
    Array.from(this.clients.values()).forEach((client) => {
      this.safeSend(client, { type: "presence", names });
    });
  }
}

function rateLimitKey(req: import("express").Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function consumeRequestToken(
  buckets: Map<string, number[]>,
  key: string,
  now: number,
  limit: number,
  windowMs: number,
): boolean {
  const times = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  if (times.length >= limit) {
    buckets.set(key, times);
    return false;
  }
  times.push(now);
  buckets.set(key, times);
  if (buckets.size > 10_000) {
    Array.from(buckets.entries()).forEach(([bucketKey, bucketTimes]) => {
      if (bucketTimes.every((time: number) => now - time >= windowMs)) buckets.delete(bucketKey);
    });
  }
  return true;
}

function getTicketFromProtocols(request: IncomingMessage): string | null {
  const raw = request.headers["sec-websocket-protocol"];
  if (typeof raw !== "string") return null;
  const tokenProtocol = raw.split(",").map((value) => value.trim())
    .find((value) => value.startsWith(TICKET_PROTOCOL));
  return tokenProtocol?.slice(TICKET_PROTOCOL.length) || null;
}

function isSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (typeof origin !== "string") return process.env.NODE_ENV !== "production";
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const forwardedHost = request.headers["x-forwarded-host"];
    const expectedHost = (typeof forwardedHost === "string" ? forwardedHost.split(",")[0] : request.headers.host)
      ?.trim()
      .toLowerCase();
    return Boolean(expectedHost && originHost === expectedHost);
  } catch {
    return false;
  }
}

export function installDistrictChat(app: Express, server: Server): void {
  const ticketBuckets = new Map<string, number[]>();
  const connectionBuckets = new Map<string, number[]>();
  const hub = new DistrictChatHub();

  app.post("/api/world-chat/ticket", async (req, res) => {
    const now = Date.now();
    const ip = rateLimitKey(req);
    if (!consumeRequestToken(ticketBuckets, ip, now, 10, 60_000)) {
      return res.status(429).json({ error: "Please wait before reconnecting to chat." });
    }

    try {
      const presentedToken = req.headers["x-user-token"];
      const user = await getRequestUser(req);
      if (typeof presentedToken === "string" && !user) {
        return res.status(401).json({ error: "Your member session is no longer valid." });
      }
      if (user?.accountStatus === "suspended") {
        return res.status(403).json({ error: "Account suspended." });
      }

      const identity: ChatTicketIdentity = user
        ? {
            kind: "member",
            userId: user.userId,
            displayName: user.username.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 32),
          }
        : (() => {
            const guestId = randomUUID();
            return { kind: "guest" as const, guestId, displayName: `Guest-${guestId.replace(/-/g, "").slice(0, 8)}` };
          })();
      const ticket = issueDistrictChatTicket(identity, now);
      return res.json({
        ticket,
        identityType: identity.kind,
        displayName: identity.displayName,
        expiresInMs: CHAT_TICKET_TTL_MS,
      });
    } catch (error) {
      console.error("[district-chat] ticket issuance failed:", error);
      return res.status(503).json({ error: "Chat identity is temporarily unavailable." });
    }
  });

  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => protocols.has(CHAT_PROTOCOL) ? CHAT_PROTOCOL : false,
  });

  server.on("upgrade", (request, socket, head) => {
    let pathname = "";
    try {
      pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    } catch {
      return;
    }
    if (pathname !== "/ws/vanta-district-chat") return;
    const reject = (status: number, message: string) => {
      if (!socket.destroyed) {
        socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
        socket.destroy();
      }
    };

    if (!isSameOrigin(request)) return reject(403, "Forbidden");
    const ip = request.socket.remoteAddress ?? "unknown";
    if (!consumeRequestToken(connectionBuckets, ip, Date.now(), 20, 60_000)) {
      return reject(429, "Too Many Requests");
    }
    const ticket = getTicketFromProtocols(request);
    const identity = ticket ? verifyDistrictChatTicket(ticket) : null;
    if (!identity) return reject(401, "Unauthorized");

    wss.handleUpgrade(request, socket, head, (webSocket) => {
      const connectionId = hub.connect(identity, {
        send: (event) => {
          if (webSocket.readyState === WebSocket.OPEN) webSocket.send(JSON.stringify(event));
        },
      });
      const statefulClient = webSocket as WebSocket & { isAlive?: boolean };
      statefulClient.isAlive = true;
      webSocket.on("pong", () => { statefulClient.isAlive = true; });
      webSocket.on("message", (data, isBinary) => {
        if (isBinary) {
          webSocket.close(1003, "Text messages only");
          return;
        }
        hub.receive(connectionId, data.toString("utf8"));
      });
      webSocket.on("close", () => hub.disconnect(connectionId));
      webSocket.on("error", () => hub.disconnect(connectionId));
    });
  });

  const heartbeat = setInterval(() => {
    Array.from(wss.clients).forEach((client) => {
      const statefulClient = client as WebSocket & { isAlive?: boolean };
      if (!statefulClient.isAlive) {
        client.terminate();
        return;
      }
      statefulClient.isAlive = false;
      if (client.readyState === WebSocket.OPEN) client.ping();
    });
  }, 30_000);
  heartbeat.unref?.();
  server.once("close", () => {
    clearInterval(heartbeat);
    Array.from(wss.clients).forEach((client) => client.close(1001, "Server shutting down"));
    wss.close();
  });
}
