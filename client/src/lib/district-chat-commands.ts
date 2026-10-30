export const DISTRICT_CHAT_HISTORY_LIMIT = 120;
export const DISTRICT_CHAT_MAX_LENGTH = 500;
export const DISTRICT_CHAT_INPUT_LIMIT = DISTRICT_CHAT_MAX_LENGTH + 64;

export type DistrictChatChannel = "system" | "local" | "world" | "party" | "private";

export type DistrictChatParseResult =
  | { kind: "send"; channel: "world" | "party"; text: string }
  | { kind: "send"; channel: "private"; recipient: string; text: string }
  | { kind: "help" }
  | { kind: "error"; text: string };

const HELP_TEXT =
  "Commands: /world <message>, /party <message>, /private <player> <message>, /reply <message> (/r). Use the party controls to create, join, leave, or invite.";

function validateText(text: string): { value: string } | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Enter a message first." };
  if (trimmed.length > DISTRICT_CHAT_MAX_LENGTH) {
    return { error: `Messages are limited to ${DISTRICT_CHAT_MAX_LENGTH} characters.` };
  }
  return { value: trimmed };
}

export function parseDistrictChatInput(
  raw: string,
  activeChannel: DistrictChatChannel,
  lastPrivatePeer: string | null,
): DistrictChatParseResult {
  const input = raw.trim();
  if (!input) return { kind: "error", text: "Enter a message first." };
  if (input.length > DISTRICT_CHAT_INPUT_LIMIT) {
    return { kind: "error", text: `Messages and commands are limited to ${DISTRICT_CHAT_MAX_LENGTH} characters.` };
  }

  if (input.startsWith("/")) {
    const firstSpace = input.search(/\s/);
    const command = (firstSpace === -1 ? input.slice(1) : input.slice(1, firstSpace)).toLowerCase();
    const rest = firstSpace === -1 ? "" : input.slice(firstSpace).trim();

    if (command === "help" || command === "?") return { kind: "help" };
    if (command === "world" || command === "w") {
      const checked = validateText(rest);
      return "value" in checked
        ? { kind: "send", channel: "world", text: checked.value }
        : { kind: "error", text: checked.error === "Enter a message first." ? "Usage: /world <message>" : checked.error };
    }
    if (command === "party") {
      const checked = validateText(rest);
      return "value" in checked
        ? { kind: "send", channel: "party", text: checked.value }
        : { kind: "error", text: checked.error === "Enter a message first." ? "Usage: /party <message>" : checked.error };
    }
    if (command === "private" || command === "tell" || command === "whisper") {
      const recipientEnd = rest.search(/\s/);
      if (recipientEnd <= 0) {
        return { kind: "error", text: "Usage: /private <player> <message>" };
      }
      const recipient = rest.slice(0, recipientEnd).replace(/^@/, "").trim();
      const checked = validateText(rest.slice(recipientEnd));
      if (!recipient || recipient.length > 32 || /[\u0000-\u001F\u007F]/.test(recipient)) {
        return { kind: "error", text: "Enter a valid online player name." };
      }
      return "value" in checked
        ? { kind: "send", channel: "private", recipient, text: checked.value }
        : { kind: "error", text: checked.error === "Enter a message first." ? "Usage: /private <player> <message>" : checked.error };
    }
    if (command === "reply" || command === "r") {
      const checked = validateText(rest);
      if ("error" in checked) {
        return { kind: "error", text: checked.error === "Enter a message first." ? "Usage: /reply <message>" : checked.error };
      }
      if (!lastPrivatePeer) return { kind: "error", text: "There is no recent private conversation to reply to." };
      return { kind: "send", channel: "private", recipient: lastPrivatePeer, text: checked.value };
    }
    return { kind: "error", text: `Unknown command. ${HELP_TEXT}` };
  }

  const checked = validateText(input);
  if ("error" in checked) return { kind: "error", text: checked.error };
  if (activeChannel === "world") return { kind: "send", channel: "world", text: checked.value };
  if (activeChannel === "party") return { kind: "send", channel: "party", text: checked.value };
  if (activeChannel === "private") {
    if (!lastPrivatePeer) {
      return { kind: "error", text: "Use /private <player> <message> to start a private conversation." };
    }
    return { kind: "send", channel: "private", recipient: lastPrivatePeer, text: checked.value };
  }
  return { kind: "error", text: "System and Local channels are read-only. Use /world or /private to send." };
}

export function districtChatHelpText(): string {
  return HELP_TEXT;
}
