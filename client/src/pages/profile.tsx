// ─── Public Profile ────────────────────────────────────────────────────────────
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserToken, useUser } from "@/hooks/use-user";
import { FollowButton } from "@/components/social/FollowButton";
import {
  User, MapPin, Calendar, Settings, Link as LinkIcon,
  Music, BookOpen, Leaf, Star,
} from "lucide-react";

const INTEREST_ICONS: Record<string, React.ElementType> = {
  "Music": Music, "Games": Star, "Writing": BookOpen,
  "Cannabis culture": Leaf, "Art": Star, "Film": Star,
  "Technology": Star, "FGH lore": Star, "Fashion": Star,
};

interface ProfileData {
  username: string;
  display_name: string;
  role: string;
  created_at: string;
  avatar_url: string;
  banner_url: string;
  bio: string;
  location: string;
  creator_category: string;
  interests: string[];
  social_links: Record<string, string>;
}

interface MemberTransmission {
  id: string;
  body: string;
  created_at: string;
  comment_count: number;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated } = useUser();
  const isOwnProfile = isAuthenticated && currentUser?.username === username;

  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ["/api/profile", username],
    queryFn: () =>
      fetch(`/api/profile/${username}`).then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
  });
  const { data: socialState } = useQuery<{ follower_count: number; following_count: number; is_following: boolean }>({
    queryKey: ["/api/social/follow-state", username],
    enabled: Boolean(username),
    queryFn: async () => {
      const token = getUserToken();
      const response = await fetch(`/api/social/follow-state/${encodeURIComponent(username || "")}`, {
        headers: token ? { "X-User-Token": token } : {},
      });
      if (!response.ok) throw new Error("Could not load member connections");
      return response.json();
    },
  });
  const { data: memberTransmissions } = useQuery<{ transmissions: MemberTransmission[] }>({
    queryKey: ["/api/social/users", username, "transmissions"],
    enabled: Boolean(username && profile),
    queryFn: async () => {
      const response = await fetch(`/api/social/users/${encodeURIComponent(username || "")}/transmissions`);
      if (!response.ok) throw new Error("Could not load Member Transmissions");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20 animate-pulse">
          <div className="h-32 bg-muted rounded-xl mb-4" />
          <div className="h-16 w-16 rounded-full bg-muted mb-4" />
          <div className="h-5 bg-muted rounded w-48 mb-2" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          <User className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Profile not found.</p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20">
        {/* Banner */}
        <div
          className="w-full h-36 sm:h-48 rounded-xl overflow-hidden mb-0 border border-border"
          style={{
            background: profile.banner_url
              ? `url(${profile.banner_url}) center/cover`
              : "linear-gradient(135deg, #0a1a0a 0%, #0d2010 50%, #0a1408 100%)",
          }}
        />

        {/* Avatar + actions row */}
        <div className="flex items-end justify-between gap-4 px-1 -mt-8 mb-6">
          <div
            className="w-20 h-20 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden flex-shrink-0"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground/50" />
            )}
          </div>
          {isOwnProfile && (
            <Link href="/profile/edit">
              <Button variant="outline" size="sm" className="gap-2 text-xs mb-1">
                <Settings className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            </Link>
          )}
        </div>

        {/* Identity */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-display font-bold tracking-wide">
              {profile.display_name || profile.username}
            </h1>
            {profile.role && profile.role !== "user" && (
              <Badge variant="outline" className="text-[10px] font-mono uppercase">
                {profile.role}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono mb-3">@{profile.username}</p>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground"><strong className="text-foreground">{socialState?.follower_count ?? 0}</strong> followers</span>
            <span className="text-xs text-muted-foreground"><strong className="text-foreground">{socialState?.following_count ?? 0}</strong> following</span>
            {!isOwnProfile && <FollowButton username={profile.username} initialFollowing={socialState?.is_following ?? false} />}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {profile.location}
              </span>
            )}
            {profile.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Member since {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </span>
            )}
            {profile.creator_category && (
              <span className="text-muted-foreground/60">{profile.creator_category}</span>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
          )}

          {/* Social links */}
          {profile.social_links && Object.keys(profile.social_links).length > 0 && (
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {Object.entries(profile.social_links).map(([platform, url]) =>
                url ? (
                  <a
                    key={platform}
                    href={url.startsWith("http") ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {platform}
                  </a>
                ) : null
              )}
            </div>
          )}

          {/* Interests */}
          {(profile.interests || []).length > 0 && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {profile.interests.map(interest => (
                <Badge key={interest} variant="outline" className="text-[11px] gap-1">
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Tabs */}
        <Tabs defaultValue="activity" className="mt-6">
          <TabsList className="h-9">
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="music" className="text-xs">Saved Music</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs">Saved Posts</TabsTrigger>
            <TabsTrigger value="interests" className="text-xs">App Interests</TabsTrigger>
            <TabsTrigger value="transmissions" className="text-xs">Transmissions</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-6">
            <div className="border border-border/50 rounded-xl p-8 text-center">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/30 mb-2">Activity</p>
              <p className="text-sm text-muted-foreground/60">Activity tracking coming in a future update.</p>
            </div>
          </TabsContent>

          <TabsContent value="music" className="mt-6">
            <div className="border border-border/50 rounded-xl p-8 text-center">
              <Music className="w-6 h-6 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/60">Saved music coming in a future update.</p>
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <div className="border border-border/50 rounded-xl p-8 text-center">
              <BookOpen className="w-6 h-6 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/60">Saved posts coming in a future update.</p>
            </div>
          </TabsContent>

          <TabsContent value="interests" className="mt-6">
            {(profile.interests || []).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.interests.map(interest => {
                  const Icon = INTEREST_ICONS[interest] || Star;
                  return (
                    <div key={interest} className="border border-border rounded-lg p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                      <span className="text-sm font-medium">{interest}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-border/50 rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground/60">No interests selected yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="transmissions" className="mt-6">
            {(memberTransmissions?.transmissions.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {memberTransmissions!.transmissions.map(transmission => (
                  <article key={transmission.id} className="rounded-xl border border-border/70 bg-card/30 p-5">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{transmission.body}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[10px] font-mono text-muted-foreground/55">
                      <time>{new Date(transmission.created_at).toLocaleString()}</time>
                      <Link href="/community" className="text-primary/80 hover:text-primary">Open Community Feed</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 p-8 text-center">
                <p className="text-sm text-muted-foreground/60">No public Member Transmissions yet.</p>
                {isOwnProfile && <Link href="/community" className="mt-3 inline-block text-xs text-primary hover:underline">Publish a Transmission</Link>}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
