export type SocialModerationState = "published" | "pending" | "hidden" | "removed";
export type SocialReportTarget = "transmission" | "comment" | "project";
export type SocialFeedCursor = { createdAt: string; id: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSocialText(value: unknown, maxLength: number): { value?: string; error?: string } {
  if (typeof value !== "string") return { error: "Text is required" };
  const normalized = value.trim();
  if (!normalized) return { error: "Text cannot be empty" };
  if (normalized.length > maxLength) return { error: `Text must be ${maxLength} characters or fewer` };
  return { value: normalized };
}

export function canFollowUser(followerId: string, followedId: string): boolean {
  return !!followerId && !!followedId && followerId !== followedId;
}

export function encodeSocialFeedCursor(cursor: SocialFeedCursor): string {
  if (!UUID_PATTERN.test(cursor.id) || Number.isNaN(Date.parse(cursor.createdAt))) {
    throw new Error("Cannot encode an invalid social feed cursor");
  }
  return Buffer.from(JSON.stringify([cursor.createdAt, cursor.id]), "utf8").toString("base64url");
}

export function parseSocialFeedCursor(value: unknown): SocialFeedCursor | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value || value.length > 256) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(decoded) || decoded.length !== 2) return null;
    const [createdAt, id] = decoded;
    if (
      typeof createdAt !== "string" ||
      Number.isNaN(Date.parse(createdAt)) ||
      typeof id !== "string" ||
      !UUID_PATTERN.test(id)
    ) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function isPublicSocialContent(
  moderationState: string,
  accountStatus: string | null | undefined,
  visibilityStatus: string = "published",
): boolean {
  return moderationState === "published" &&
    visibilityStatus === "published" &&
    accountStatus !== "suspended";
}

export function parseReportTarget(value: unknown): SocialReportTarget | null {
  return value === "transmission" || value === "comment" || value === "project" ? value : null;
}

export function parseModerationState(value: unknown): SocialModerationState | null {
  return value === "published" || value === "pending" || value === "hidden" || value === "removed"
    ? value
    : null;
}
