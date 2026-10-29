import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import "./VantaDistrictChat.css";

export type DistrictChatChannel = "system" | "local" | "world" | "party" | "private";
export type DistrictChatConnectionStatus = "connected" | "connecting" | "disconnected" | "error" | (string & {});

export interface DistrictChatMessage {
  id: string | number;
  channel: DistrictChatChannel;
  timestamp: string | number | Date;
  sender: string;
  text: string;
  recipient?: string;
  direction?: "incoming" | "outgoing";
}

export type DistrictChatUnreadCounts = Partial<Record<DistrictChatChannel, number>>;

export interface VantaDistrictChatProps {
  messages: readonly DistrictChatMessage[];
  activeChannel: DistrictChatChannel;
  unreadCounts?: DistrictChatUnreadCounts;
  mutedChannels?: readonly DistrictChatChannel[];
  blockedSenders?: readonly string[];
  onlineNames?: readonly string[];
  connectionStatus: DistrictChatConnectionStatus;
  partyAvailable?: boolean;
  onToggle?: (open: boolean) => void;
  onSelectChannel: (channel: DistrictChatChannel) => void;
  onSendText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMuteChannel: (channel: DistrictChatChannel) => void;
  onBlockSender: (sender: string) => void;
  open?: boolean;
  identityLabel?: string;
  initiallyOpen?: boolean;
  className?: string;
}

const CHANNELS: Array<{ id: DistrictChatChannel; label: string }> = [
  { id: "system", label: "System" },
  { id: "local", label: "Local" },
  { id: "world", label: "World" },
  { id: "party", label: "Party" },
  { id: "private", label: "Private" },
];

function formatTimestamp(value: DistrictChatMessage["timestamp"]): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function timestampDateTime(value: DistrictChatMessage["timestamp"]): string | undefined {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function statusLabel(status: DistrictChatConnectionStatus): string {
  if (status === "connected") return "Signal live";
  if (status === "connecting") return "Linking";
  if (status === "disconnected") return "No signal";
  if (status === "error") return "Signal fault";
  return status.replace(/[-_]/g, " ");
}

function statusTone(status: DistrictChatConnectionStatus): string {
  if (status === "connected") return "is-connected";
  if (status === "connecting") return "is-connecting";
  return "is-offline";
}

export function VantaDistrictChat({
  messages,
  activeChannel,
  unreadCounts = {},
  mutedChannels = [],
  blockedSenders = [],
  onlineNames = [],
  connectionStatus,
  partyAvailable = true,
  onToggle,
  onSelectChannel,
  onSendText,
  onFocus,
  onBlur,
  onMuteChannel,
  onBlockSender,
  open: controlledOpen,
  identityLabel,
  initiallyOpen = true,
  className = "",
}: VantaDistrictChatProps) {
  const [internalOpen, setInternalOpen] = useState(initiallyOpen);
  const open = controlledOpen ?? internalOpen;
  const [draft, setDraft] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [size, setSize] = useState({ width: 354, height: 442 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeStart = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const channelMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel),
    [messages, activeChannel],
  );
  const blockedLookup = useMemo(
    () => new Set(blockedSenders.map((name) => name.toLocaleLowerCase())),
    [blockedSenders],
  );
  const isMuted = mutedChannels.includes(activeChannel);
  const visibleMessages = channelMessages.filter((message) =>
    !blockedLookup.has(message.sender.toLocaleLowerCase()) && !isMuted
  );
  const hiddenCount = channelMessages.length - visibleMessages.length;
  const onlineCount = onlineNames.length;
  const activeLabel = CHANNELS.find((channel) => channel.id === activeChannel)?.label ?? activeChannel;

  function setPanelOpen(nextOpen: boolean) {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onToggle?.(nextOpen);
    if (!nextOpen) setHelpOpen(false);
  }

  useEffect(() => {
    const viewport = scrollRef.current;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [activeChannel, visibleMessages.length]);

  function toggleOpen() {
    setPanelOpen(!open);
  }

  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
      const interactive = Boolean(target?.closest?.("button, a, [role='button']"));
      if (event.key === "Enter" && !open && !typing && !interactive) {
        event.preventDefault();
        setPanelOpen(true);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      } else if (event.key === "Escape" && open && !target?.closest?.("[data-vanta-district-chat]")) {
        setPanelOpen(false);
      } else if (event.key === "Escape" && open && target?.closest?.("[data-vanta-district-chat]")) {
        event.preventDefault();
        inputRef.current?.blur();
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [open, controlledOpen]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSendText(text);
    setDraft("");
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { x: event.clientX, y: event.clientY, ...size };
  }

  function moveResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = resizeStart.current;
    if (!start) return;
    setSize({
      width: Math.max(292, Math.min(560, start.width + start.x - event.clientX)),
      height: Math.max(300, Math.min(680, start.height + start.y - event.clientY)),
    });
  }

  function stopResize() {
    resizeStart.current = null;
  }

  function adjustSize(direction: "wider" | "narrower" | "taller" | "shorter") {
    setSize((current) => ({
      width: Math.max(292, Math.min(560, current.width + (direction === "wider" ? 20 : direction === "narrower" ? -20 : 0))),
      height: Math.max(300, Math.min(680, current.height + (direction === "taller" ? 20 : direction === "shorter" ? -20 : 0))),
    }));
  }

  return (
    <aside
      className={`vdc-chat ${open ? "is-open" : "is-collapsed"} ${className}`.trim()}
      style={open ? { width: `min(${size.width}px, calc(100vw - 20px))`, height: `min(${size.height}px, calc(100dvh - 28px))` } : undefined}
      aria-label="Vanta District chat"
      data-vanta-district-chat=""
      data-channel={activeChannel}
    >
      <header className="vdc-chat__header">
        <div className="vdc-chat__identity">
          <span className="vdc-chat__signal-mark" aria-hidden="true"><i /><i /><i /></span>
          <div className="vdc-chat__title-block">
            <span className="vdc-chat__eyebrow">DISTRICT // COMMS</span>
              <strong>{identityLabel ?? "Open channel"}</strong>
          </div>
          <span className={`vdc-chat__connection ${statusTone(connectionStatus)}`}>
            <i aria-hidden="true" />
            <span>{statusLabel(connectionStatus)}</span>
          </span>
        </div>
        <div className="vdc-chat__header-actions">
          <button
            className={`vdc-chat__icon-button ${helpOpen ? "is-active" : ""}`}
            type="button"
            aria-label={helpOpen ? "Close chat help" : "Open chat help"}
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen((value) => !value)}
          >?</button>
          <button
            className="vdc-chat__icon-button vdc-chat__collapse"
            type="button"
            aria-label={open ? "Collapse chat panel" : "Expand chat panel"}
            aria-expanded={open}
            onClick={toggleOpen}
          ><span aria-hidden="true">{open ? "−" : "+"}</span></button>
        </div>
      </header>

      {open && (
        <>
          <nav className="vdc-chat__channels" aria-label="Chat channels">
            {CHANNELS.map(({ id, label }) => {
              const unavailable = id === "party" && !partyAvailable;
              const count = unreadCounts[id] ?? 0;
              return (
                <button
                  type="button"
                  key={id}
                  className={`vdc-chat__channel vdc-chat__channel--${id} ${activeChannel === id ? "is-active" : ""} ${mutedChannels.includes(id) ? "is-muted" : ""}`}
                  aria-current={activeChannel === id ? "page" : undefined}
                  aria-label={`${label}${unavailable ? ", unavailable" : ""}${count > 0 ? `, ${count} unread` : ""}${mutedChannels.includes(id) ? ", muted" : ""}`}
                  aria-disabled={unavailable || undefined}
                  disabled={unavailable}
                  onClick={() => onSelectChannel(id)}
                >
                  <span className="vdc-chat__channel-name">{label}</span>
                  {unavailable ? <span className="vdc-chat__unavailable">OFFLINE</span> : count > 0 && (
                    <span className="vdc-chat__unread" aria-hidden="true">{count > 99 ? "99+" : count}</span>
                  )}
                  {mutedChannels.includes(id) && <span className="vdc-chat__mute-mark" aria-hidden="true">M</span>}
                </button>
              );
            })}
          </nav>

          <div className="vdc-chat__channel-meta">
            <div className="vdc-chat__active-location">
              <span className="vdc-chat__channel-dot" aria-hidden="true" />
              <strong>{activeLabel}</strong>
              <span className="vdc-chat__meta-separator">/</span>
              <span
                title={onlineNames.length ? `Online: ${onlineNames.join(", ")}` : "No names currently online"}
                aria-label={onlineNames.length ? `${onlineCount} online: ${onlineNames.join(", ")}` : "No names currently online"}
              >{onlineCount} {onlineCount === 1 ? "signal" : "signals"} nearby</span>
            </div>
            <button
              className={`vdc-chat__mute-button ${isMuted ? "is-muted" : ""}`}
              type="button"
              aria-label={isMuted ? `Unmute ${activeLabel} channel` : `Mute ${activeLabel} channel`}
              aria-pressed={isMuted}
              onClick={() => onMuteChannel(activeChannel)}
            >{isMuted ? "UNMUTE" : "MUTE"}</button>
          </div>

          {helpOpen && (
            <section className="vdc-chat__help" aria-label="Chat help">
              <strong>Chat commands</strong>
              <p><code>/world &lt;message&gt;</code> · <code>/party &lt;message&gt;</code></p>
              <p><code>/private &lt;player&gt; &lt;message&gt;</code></p>
              <p><code>/reply &lt;message&gt;</code> · alias <code>/r</code> · <code>/help</code></p>
              <span>Party is unavailable until a party system exists. Blocked senders are hidden on this device for this session.</span>
            </section>
          )}

          {blockedSenders.length > 0 && (
            <div className="vdc-chat__blocked-list" aria-label="Blocked senders for this session">
              <span>HIDDEN</span>
              {blockedSenders.map((sender) => (
                <button
                  key={sender.toLocaleLowerCase()}
                  type="button"
                  onClick={() => onBlockSender(sender)}
                  aria-label={`Unblock ${sender}`}
                >UNBLOCK {sender}</button>
              ))}
            </div>
          )}

          <div className="vdc-chat__scroll" ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions text" aria-label={`${activeLabel} channel messages`}>
            {visibleMessages.length === 0 ? (
              <div className="vdc-chat__empty">
                <span className="vdc-chat__empty-rule" aria-hidden="true" />
                <strong>{hiddenCount > 0 ? "Nothing on this frequency" : "No traffic in this channel"}</strong>
                <span>{hiddenCount > 0 ? `${hiddenCount} blocked ${hiddenCount === 1 ? "sender is" : "senders are"} hidden` : "Scrollback will appear here when available."}</span>
              </div>
            ) : (
              <ol className="vdc-chat__messages">
                {visibleMessages.map((message) => (
                  <li className={`vdc-chat__message vdc-chat__message--${message.channel}`} key={message.id}>
                    <div className="vdc-chat__message-topline">
                      <span className="vdc-chat__sender">
                        {message.sender}
                        {message.direction === "outgoing" && message.recipient ? ` → ${message.recipient}` : ""}
                      </span>
                      <time className="vdc-chat__timestamp" dateTime={timestampDateTime(message.timestamp)}>
                        {formatTimestamp(message.timestamp)}
                      </time>
                      {(message.channel === "world" || message.channel === "private") && (
                      <button
                        className="vdc-chat__block"
                        type="button"
                        aria-label={`Block ${message.sender}`}
                        onClick={() => onBlockSender(message.sender)}
                      >BLOCK</button>
                      )}
                    </div>
                    <p>{message.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <form className="vdc-chat__composer" onSubmit={submitMessage}>
            <label className="vdc-chat__input-label" htmlFor="vdc-chat-message">Transmit to {activeLabel}</label>
            <div className="vdc-chat__input-row">
              <input
                ref={inputRef}
                id="vdc-chat-message"
                data-vanta-chat-input=""
                value={draft}
                maxLength={500}
                autoComplete="off"
                placeholder="Type a message"
                aria-label={`Message for ${activeLabel} channel`}
                onChange={(event) => setDraft(event.target.value)}
                onFocus={() => onFocus?.()}
                onBlur={() => onBlur?.()}
              />
              <button type="submit" disabled={!draft.trim()} aria-label="Send message">
                <span>TRANSMIT</span><i aria-hidden="true">↗</i>
              </button>
            </div>
            <div className="vdc-chat__composer-foot">
              <span>ENTER TO SEND</span>
              <span>{draft.length}/500</span>
            </div>
          </form>
          <button
            className="vdc-chat__resize"
            type="button"
            aria-label="Resize chat panel. Use arrow keys to adjust size."
            title="Drag to resize; use arrow keys when focused"
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") { event.preventDefault(); adjustSize("wider"); }
              if (event.key === "ArrowRight") { event.preventDefault(); adjustSize("narrower"); }
              if (event.key === "ArrowUp") { event.preventDefault(); adjustSize("taller"); }
              if (event.key === "ArrowDown") { event.preventDefault(); adjustSize("shorter"); }
            }}
          ><span aria-hidden="true" /></button>
        </>
      )}
    </aside>
  );
}

export default VantaDistrictChat;
