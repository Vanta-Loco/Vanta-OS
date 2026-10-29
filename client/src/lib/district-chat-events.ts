export const DISTRICT_CHAT_SYSTEM_QUEUE_KEY = "vanta.district-chat.system.v1";
export const DISTRICT_CHAT_SYSTEM_QUEUE_LIMIT = 24;

export interface DistrictChatSystemStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserSessionStorage(): DistrictChatSystemStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function queueDistrictChatSystemMessage(
  message: string,
  storage = browserSessionStorage(),
): void {
  const clean = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 500);
  if (!clean || !storage) return;
  try {
    const previous = JSON.parse(storage.getItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY) ?? "[]");
    const messages = Array.isArray(previous)
      ? previous.filter((item): item is string => typeof item === "string").slice(-DISTRICT_CHAT_SYSTEM_QUEUE_LIMIT + 1)
      : [];
    messages.push(clean);
    storage.setItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY, JSON.stringify(messages));
  } catch {
    try {
      storage.removeItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY);
      storage.setItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY, JSON.stringify([clean]));
    } catch {
      // Session storage can be disabled or full; game feedback remains in its own view.
    }
  }
}

export function drainDistrictChatSystemMessages(
  storage = browserSessionStorage(),
): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY);
    storage.removeItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().slice(0, 500))
          .filter(Boolean)
          .slice(-DISTRICT_CHAT_SYSTEM_QUEUE_LIMIT)
      : [];
  } catch {
    try { storage.removeItem(DISTRICT_CHAT_SYSTEM_QUEUE_KEY); } catch { /* ignore blocked storage */ }
    return [];
  }
}
