import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { getUserToken } from "@/hooks/use-user";
import {
  DISTRICT_CHAT_HISTORY_LIMIT,
  type DistrictChatReportCategory,
  parseDistrictChatInput,
  type DistrictChatChannel,
} from "@/lib/district-chat-commands";
import { drainDistrictChatSystemMessages } from "@/lib/district-chat-events";
import {
  VantaDistrictChat,
  type DistrictChatConnectionStatus,
  type DistrictChatMessage,
  type DistrictChatUnreadCounts,
} from "@/components/vanta-district-chat-ui";

const CHAT_PROTOCOL = "vanta-chat.v1";
const TICKET_PROTOCOL_PREFIX = "vanta-ticket.";

type ServerEvent =
  | { type: "welcome"; displayName: string; identityType: "member" | "guest" }
  | { type: "presence"; names: string[] }
  | { type: "block-state"; senders: string[] }
  | {
      type: "party-state";
      party: { id: string; name: string; leader: string; members: string[]; isLeader: boolean } | null;
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

type PartyAction = "create" | "join" | "leave" | "invite" | "remove";

type TicketResponse = {
  ticket: string;
  displayName: string;
  identityType: "member" | "guest";
};

export interface DistrictChatHandle {
  system(text: string): void;
  local(text: string): void;
}

export interface DistrictChatProps {
  open: boolean;
  onToggle(open: boolean): void;
  onInputFocus(focused: boolean): void;
  onUnreadCountChange?(count: number): void;
  keyboardShortcutEnabled?: boolean;
}

function makeLocalMessage(channel: "system" | "local", text: string): DistrictChatMessage {
  return {
    id: `local-${crypto.randomUUID()}`,
    channel,
    timestamp: new Date(),
    sender: channel === "system" ? "SYSTEM" : "LOCAL EVENT",
    text,
  };
}

export const DistrictChat = forwardRef<DistrictChatHandle, DistrictChatProps>(
  function DistrictChat(
    { open, onToggle, onInputFocus, onUnreadCountChange, keyboardShortcutEnabled = true },
    forwardedRef,
  ) {
    const [messages, setMessages] = useState<DistrictChatMessage[]>([]);
    const [activeChannel, setActiveChannel] = useState<DistrictChatChannel>("world");
    const [unreadCounts, setUnreadCounts] = useState<DistrictChatUnreadCounts>({});
    const [mutedChannels, setMutedChannels] = useState<DistrictChatChannel[]>([]);
    const [blockedSenders, setBlockedSenders] = useState<string[]>([]);
    const [onlineNames, setOnlineNames] = useState<string[]>([]);
    const [party, setParty] = useState<{
      name: string;
      leader: string;
      members: string[];
      isLeader: boolean;
    } | null>(null);
    const [partyInvitations, setPartyInvitations] = useState<Array<{ id: string; partyName: string; inviter: string }>>([]);
    const [connectionStatus, setConnectionStatus] = useState<DistrictChatConnectionStatus>("connecting");
    const [identityLabel, setIdentityLabel] = useState("District comms");
    const lastPrivatePeerRef = useRef<string | null>(null);
    const activeChannelRef = useRef(activeChannel);
    const openRef = useRef(open);
    const mutedChannelsRef = useRef(mutedChannels);
    const socketRef = useRef<WebSocket | null>(null);
    const historyRef = useRef<DistrictChatMessage[]>([]);
    const mountedRef = useRef(true);

    useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);
    useEffect(() => { openRef.current = open; }, [open]);
    useEffect(() => { mutedChannelsRef.current = mutedChannels; }, [mutedChannels]);

    const appendMessage = useCallback((message: DistrictChatMessage) => {
      if (!mountedRef.current) return;
      const next = [...historyRef.current, message].slice(-DISTRICT_CHAT_HISTORY_LIMIT);
      historyRef.current = next;
      setMessages(next);
      if (
        (message.channel !== activeChannelRef.current || !openRef.current) &&
        !mutedChannelsRef.current.includes(message.channel)
      ) {
        setUnreadCounts((counts) => ({
          ...counts,
          [message.channel]: Math.min(999, (counts[message.channel] ?? 0) + 1),
        }));
      }
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      system: (text) => appendMessage(makeLocalMessage("system", text)),
      local: (text) => appendMessage(makeLocalMessage("local", text)),
    }), [appendMessage]);

    useEffect(() => {
      if (open) {
        setUnreadCounts((counts) => ({ ...counts, [activeChannel]: 0 }));
      }
    }, [activeChannel, open]);

    useEffect(() => {
      drainDistrictChatSystemMessages().forEach((text) => {
        appendMessage(makeLocalMessage("system", text));
      });
    }, [appendMessage]);

    useEffect(() => {
      const count = Object.values(unreadCounts).reduce((total, value) => total + (value ?? 0), 0);
      onUnreadCountChange?.(count);
    }, [onUnreadCountChange, unreadCounts]);

    useEffect(() => {
      mountedRef.current = true;
      let active = true;
      let retryTimer: number | undefined;
      let reconnectDelay = 1_000;
      let hasConnected = false;
      let hasReportedDrop = false;

      const addSystem = (text: string) => {
        appendMessage(makeLocalMessage("system", text));
      };

      const scheduleReconnect = () => {
        if (!active || retryTimer !== undefined) return;
        setConnectionStatus("disconnected");
        const jitter = Math.floor(Math.random() * Math.min(700, reconnectDelay * 0.2));
        retryTimer = window.setTimeout(() => {
          retryTimer = undefined;
          void connect();
        }, reconnectDelay + jitter);
        reconnectDelay = Math.min(30_000, reconnectDelay * 2);
      };

      const handleEvent = (event: ServerEvent) => {
        if (!active) return;
        if (event.type === "welcome") {
          setIdentityLabel(event.identityType === "guest"
            ? `${event.displayName} · TEMP`
            : `@${event.displayName}`);
          if (event.identityType === "guest") {
            addSystem(`Connected as temporary guest ${event.displayName}. This name ends when you disconnect.`);
          }
        } else if (event.type === "presence") {
          setOnlineNames(event.names.filter((name) => typeof name === "string").slice(0, 100));
        } else if (event.type === "block-state") {
          setBlockedSenders(event.senders.filter((name) => typeof name === "string").slice(0, 100));
        } else if (event.type === "party-state") {
          setParty(event.party
            ? {
                name: event.party.name,
                leader: event.party.leader,
                members: event.party.members,
                isLeader: event.party.isLeader,
              }
            : null);
          setPartyInvitations(event.invitations);
          if (!event.party) setActiveChannel((current) => current === "party" ? "world" : current);
        } else if (event.type === "system") {
          appendMessage({
            id: event.id,
            channel: "system",
            timestamp: event.timestamp,
            sender: "SYSTEM",
            text: event.text,
          });
        } else if (event.type === "message") {
          if (event.channel === "private") {
            lastPrivatePeerRef.current = event.direction === "outgoing"
              ? event.recipient ?? null
              : event.sender;
          }
          appendMessage({
            id: event.id,
            channel: event.channel,
            timestamp: event.timestamp,
            sender: event.sender,
            text: event.text,
            recipient: event.recipient,
            direction: event.direction,
          });
        } else if (event.type === "error") {
          const cooldown = event.cooldownMs
            ? ` Try again in ${Math.max(1, Math.ceil(event.cooldownMs / 1_000))}s.`
            : "";
          addSystem(`${event.text}${cooldown}`);
        }
      };

      async function connect() {
        if (!active) return;
        setConnectionStatus(hasConnected ? "disconnected" : "connecting");
        try {
          const userToken = getUserToken();
          const response = await fetch("/api/world-chat/ticket", {
            method: "POST",
            headers: userToken ? { "X-User-Token": userToken } : {},
            credentials: "include",
          });
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(typeof result.error === "string" ? result.error : "Chat identity is unavailable.");
          }
          const ticket = await response.json() as TicketResponse;
          if (!active) return;
          const socketUrl = new URL("/ws/vanta-district-chat", window.location.href);
          socketUrl.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const socket = new WebSocket(socketUrl, [
            CHAT_PROTOCOL,
            `${TICKET_PROTOCOL_PREFIX}${ticket.ticket}`,
          ]);
          socketRef.current = socket;

          socket.onopen = () => {
            if (!active) return socket.close();
            hasConnected = true;
            hasReportedDrop = false;
            reconnectDelay = 1_000;
            setConnectionStatus("connected");
          };
          socket.onmessage = (messageEvent) => {
            if (typeof messageEvent.data !== "string" || messageEvent.data.length > 4_096) return;
            try {
              handleEvent(JSON.parse(messageEvent.data) as ServerEvent);
            } catch {
              addSystem("A malformed chat event was ignored.");
            }
          };
          socket.onerror = () => {
            setConnectionStatus("error");
            socket.close();
          };
          socket.onclose = () => {
            if (socketRef.current === socket) socketRef.current = null;
            if (active && hasConnected && !hasReportedDrop) {
              hasReportedDrop = true;
              addSystem("Chat connection interrupted. Reconnecting; server history is temporary.");
            }
            scheduleReconnect();
          };
        } catch (error) {
          setConnectionStatus("error");
          if (!hasReportedDrop) {
            hasReportedDrop = true;
            addSystem(error instanceof Error ? error.message : "Chat connection unavailable; retrying.");
          }
          scheduleReconnect();
        }
      }

      void connect();
      return () => {
        active = false;
        mountedRef.current = false;
        if (retryTimer !== undefined) window.clearTimeout(retryTimer);
        socketRef.current?.close(1000, "Leaving Vanta District");
        socketRef.current = null;
      };
    }, [appendMessage]);

    const sendText = useCallback((rawText: string) => {
      const parsed = parseDistrictChatInput(rawText, activeChannelRef.current, lastPrivatePeerRef.current);
      if (parsed.kind === "help") {
        appendMessage(makeLocalMessage(
          "system",
          "Commands: /world <message>, /party <message>, /private <player> <message>, /reply <message> or /r. Create or join a party using the party controls.",
        ));
        return;
      }
      if (parsed.kind === "error") {
        appendMessage(makeLocalMessage("system", parsed.text));
        return;
      }
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage(makeLocalMessage("system", "Not connected. Chat will retry when the server is available."));
        return;
      }
      if (parsed.channel === "private") setActiveChannel("private");
      socket.send(JSON.stringify({
        type: "send",
        channel: parsed.channel,
        text: parsed.text,
        ...(parsed.channel === "private" ? { recipient: parsed.recipient } : {}),
      }));
    }, [appendMessage]);

    const sendPartyAction = useCallback((action: PartyAction, details: { recipient?: string; invitationId?: string } = {}) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage(makeLocalMessage("system", "Not connected. Party changes will be available when chat reconnects."));
        return;
      }
      socket.send(JSON.stringify({ type: "party", action, ...details }));
    }, [appendMessage]);

    const toggleMuteChannel = useCallback((channel: DistrictChatChannel) => {
      setMutedChannels((current) => current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]);
    }, []);

    const setBlockedSender = useCallback((sender: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage(makeLocalMessage("system", "Not connected. Block changes will be available when chat reconnects."));
        return;
      }
      const alreadyBlocked = blockedSenders.some((name) => name.toLocaleLowerCase() === sender.toLocaleLowerCase());
      socket.send(JSON.stringify({ type: "block", sender, blocked: !alreadyBlocked }));
    }, [appendMessage, blockedSenders]);

    const reportMessage = useCallback((messageId: string, category: DistrictChatReportCategory) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage(makeLocalMessage("system", "Not connected. Reports will be available when chat reconnects."));
        return;
      }
      socket.send(JSON.stringify({ type: "report", messageId, category }));
    }, [appendMessage]);

    const selectChannel = useCallback((channel: DistrictChatChannel) => {
      setActiveChannel(channel);
      setUnreadCounts((counts) => ({ ...counts, [channel]: 0 }));
    }, []);

    return (
      <VantaDistrictChat
        messages={messages}
        activeChannel={activeChannel}
        unreadCounts={unreadCounts}
        mutedChannels={mutedChannels}
        blockedSenders={blockedSenders}
        onlineNames={onlineNames}
        connectionStatus={connectionStatus}
        identityLabel={identityLabel}
        partyAvailable={Boolean(party)}
        party={party}
        partyInvitations={partyInvitations}
        onCreateParty={() => sendPartyAction("create")}
        onLeaveParty={() => sendPartyAction("leave")}
        onInviteToParty={(recipient) => sendPartyAction("invite", { recipient })}
        onRemovePartyMember={(recipient) => sendPartyAction("remove", { recipient })}
        onAcceptPartyInvitation={(invitationId) => sendPartyAction("join", { invitationId })}
        open={open}
        onToggle={onToggle}
        onSelectChannel={selectChannel}
        onSendText={sendText}
        onFocus={() => onInputFocus(true)}
        onBlur={() => onInputFocus(false)}
        onMuteChannel={toggleMuteChannel}
        onBlockSender={setBlockedSender}
        onReportMessage={reportMessage}
        initiallyOpen={false}
        keyboardShortcutEnabled={keyboardShortcutEnabled}
      />
    );
  },
);

DistrictChat.displayName = "DistrictChat";
