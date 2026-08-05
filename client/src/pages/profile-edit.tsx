// ─── Edit Profile ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/use-user";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

const INTERESTS = [
  "Music", "Games", "Fashion", "Writing", "Cannabis culture",
  "Art", "Film", "Technology", "FGH lore",
];

const CATEGORIES = [
  "", "Artist", "Producer", "Writer", "Photographer", "Filmmaker",
  "Developer", "Designer", "Curator", "Other",
];

export default function ProfileEdit() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading, updateProfile } = useUser();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    location: "",
    creator_category: "",
    avatar_url: "",
    banner_url: "",
    interests: [] as string[],
    social_links: { instagram: "", twitter: "", soundcloud: "", website: "" },
    theme_preference: "dark",
    skip_startup: false,
  });

  // Prefill from current user
  useEffect(() => {
    if (user) {
      setForm({
        display_name: user.display_name || "",
        bio: user.bio || "",
        location: user.location || "",
        creator_category: user.creator_category || "",
        avatar_url: user.avatar_url || "",
        banner_url: user.banner_url || "",
        interests: user.interests || [],
        social_links: {
          instagram: user.social_links?.instagram || "",
          twitter: user.social_links?.twitter || "",
          soundcloud: user.social_links?.soundcloud || "",
          website: user.social_links?.website || "",
        },
        theme_preference: user.theme_preference || "dark",
        skip_startup: user.skip_startup || false,
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-20 animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-6" />
          <div className="h-4 bg-muted rounded w-full mb-3" />
          <div className="h-4 bg-muted rounded w-5/6" />
        </div>
      </div>
    );
  }

  const toggleInterest = (interest: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest].slice(0, 10),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        ...form,
        social_links: form.social_links,
        skip_startup: form.skip_startup,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Back */}
        <Link href={`/profile/${user.username}`}>
          <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Profile
          </Button>
        </Link>

        <div className="mb-8">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
            @{user.username}
          </p>
          <h1 className="text-2xl font-display font-bold">Edit Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Identity */}
          <section>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">Identity</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Display Name</label>
                <Input
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  maxLength={100}
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Bio</label>
                <Textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  maxLength={500}
                  rows={3}
                  placeholder="Short bio…"
                  className="resize-none"
                />
                <p className="text-[10px] text-muted-foreground/40 mt-1 text-right">{form.bio.length}/500</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Location</label>
                <Input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  maxLength={100}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Creator Category</label>
                <select
                  value={form.creator_category}
                  onChange={e => setForm(f => ({ ...f, creator_category: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c || "— Select —"}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Media */}
          <section>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">Media</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Avatar URL</label>
                <Input
                  value={form.avatar_url}
                  onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))}
                  placeholder="https://…"
                  type="url"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Banner URL</label>
                <Input
                  value={form.banner_url}
                  onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))}
                  placeholder="https://…"
                  type="url"
                />
              </div>
            </div>
          </section>

          {/* Social links */}
          <section>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">Social Links</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["instagram", "twitter", "soundcloud", "website"] as const).map(platform => (
                <div key={platform}>
                  <label className="text-xs text-muted-foreground mb-1.5 block capitalize">{platform}</label>
                  <Input
                    value={form.social_links[platform]}
                    onChange={e => setForm(f => ({
                      ...f,
                      social_links: { ...f.social_links, [platform]: e.target.value },
                    }))}
                    placeholder={platform === "website" ? "https://…" : `@username`}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Interests */}
          <section>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">Interests</p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    form.interests.includes(interest)
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </section>

          {/* Preferences */}
          <section>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-4">Preferences</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Theme</label>
                <select
                  value={form.theme_preference}
                  onChange={e => setForm(f => ({ ...f, theme_preference: e.target.value }))}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="dark">Dark (default)</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.skip_startup}
                  onChange={e => setForm(f => ({ ...f, skip_startup: e.target.checked }))}
                />
                <div>
                  <p className="text-sm">Skip startup experience</p>
                  <p className="text-xs text-muted-foreground">Skip the boot sequence on future visits</p>
                </div>
              </label>
            </div>
          </section>

          {/* Error */}
          {updateProfile.error && (
            <p className="text-sm text-destructive">Failed to save. Please try again.</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Link href={`/profile/${user.username}`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {updateProfile.isPending ? "Saving…" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
