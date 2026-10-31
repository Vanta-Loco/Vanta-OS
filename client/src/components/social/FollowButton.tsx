import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";

export function FollowButton({
  username,
  initialFollowing = false,
  className,
}: {
  username: string;
  initialFollowing?: boolean;
  className?: string;
}) {
  const { user, isAuthenticated, isLoading } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  useEffect(() => setFollowing(initialFollowing), [initialFollowing]);

  if (user?.username?.toLowerCase() === username.toLowerCase()) return null;

  async function toggle() {
    if (!isAuthenticated) {
      window.location.assign("/login");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/social/follows/${encodeURIComponent(username)}`, {
        method: following ? "DELETE" : "POST",
        headers: getUserToken() ? { "X-User-Token": getUserToken()! } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update follow");
      setFollowing(Boolean(data.following));
      queryClient.invalidateQueries({ queryKey: ["/api/social/follow-state", username] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/feed"] });
    } catch (error) {
      toast({
        title: "Follow update failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={following ? "outline" : "default"}
      className={className}
      aria-pressed={following}
      disabled={busy || isLoading}
      onClick={toggle}
    >
      {busy ? "Saving…" : following ? "Following" : "Follow"}
    </Button>
  );
}
