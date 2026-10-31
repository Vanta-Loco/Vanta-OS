export type SocialModerationState = "published" | "pending" | "hidden" | "removed";
export type SocialReportTarget = "transmission" | "comment" | "project";

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
