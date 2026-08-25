import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, ChevronLeft, ExternalLink, Sparkles, UserRound } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getUserToken, useUser } from "@/hooks/use-user";
import { CreatorWorkManager } from "@/components/creator-work";

export const CREATOR_DISCIPLINES = [
  "Artist", "Producer", "Engineer", "Photographer", "Filmmaker", "Model",
  "Designer", "Stylist", "Writer", "Journalist / Media", "Curator",
  "Developer", "Fashion", "Other",
] as const;

type CreatorProfile = {
  username: string;
  display_name: string;
  bio: string;
  city: string | null;
  country: string | null;
  profile_image_url: string | null;
  banner_image_url: string | null;
  creator_type: string;
  disciplines: string[];
  instagram_url: string | null;
  website_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  is_certified: boolean;
};

type FormState = {
  display_name: string; bio: string; city: string; country: string;
  creator_type: string; disciplines: string[];
  instagram_url: string; website_url: string; spotify_url: string; soundcloud_url: string;
};

const emptyForm: FormState = {
  display_name: "", bio: "", city: "", country: "", creator_type: "",
  disciplines: [], instagram_url: "", website_url: "", spotify_url: "", soundcloud_url: "",
};

function formFromProfile(profile: CreatorProfile): FormState {
  return {
    display_name: profile.display_name || "",
    bio: profile.bio || "",
    city: profile.city || "",
    country: profile.country || "",
    creator_type: profile.creator_type || "",
    disciplines: profile.disciplines || [],
    instagram_url: profile.instagram_url || "",
    website_url: profile.website_url || "",
    spotify_url: profile.spotify_url || "",
    soundcloud_url: profile.soundcloud_url || "",
  };
}

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  return token ? { "X-User-Token": token } : {};
}

export default function Creator() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useUser();
  const { toast } = useToast();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/creator/me", { headers: authHeaders() })
      .then(async response => {
        if (!response.ok) throw new Error("Could not load Creator Profile");
        return response.json();
      })
      .then(data => {
        const next = data.profile as CreatorProfile | null;
        setProfile(next);
        if (next) setForm(formFromProfile(next));
      })
      .catch(error => toast({ title: "Creator Profile unavailable", description: error.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const canSave = useMemo(() => form.display_name.trim().length > 0 && !saving, [form.display_name, saving]);
  const setField = (field: keyof FormState, value: string) => setForm(current => ({ ...current, [field]: value }));
  const toggleDiscipline = (discipline: string) => setForm(current => ({
    ...current,
    disciplines: current.disciplines.includes(discipline)
      ? current.disciplines.filter(item => item !== discipline)
      : [...current.disciplines, discipline],
  }));

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const response = await fetch("/api/creator", {
        method: profile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save Creator Profile");
      setProfile(data);
      setForm(formFromProfile(data));
      setEditing(false);
      toast({ title: profile ? "Profile updated" : "Creator Profile activated", description: "Your public creative identity is live." });
    } catch (error: any) {
      toast({ title: "Could not save profile", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (isAuthenticated && loading)) {
    return <div className="min-h-screen bg-background pt-32 text-center text-sm text-muted-foreground">Loading your Creator Profile…</div>;
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-20">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(113,82,155,.24),transparent_38%),linear-gradient(115deg,transparent_35%,rgba(255,255,255,.025))]" />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-16 md:py-24">
            <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-primary/75 mb-5">VANTA IDENTITY / CREATOR SYSTEM</p>
            <div className="flex flex-wrap items-end justify-between gap-8">
              <div>
                <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
                  {profile ? "Your creative identity" : "Activate your creator profile"}<span className="text-primary">.</span>
                </h1>
                <p className="mt-5 max-w-xl text-muted-foreground leading-relaxed">
                  {profile ? "A public home for the work, rooms and opportunities moving through your Vanta identity." : "Connect your Member identity to your work, Rooms and Marketplace presence across Vanta."}
                </p>
              </div>
              {profile && !editing && <Button onClick={() => setEditing(true)} variant="outline" className="gap-2">Edit Profile <ArrowRight className="w-4 h-4" /></Button>}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 md:py-14">
          {profile && !editing ? (
            <div className="grid lg:grid-cols-[1fr_280px] gap-6">
              <section className="border border-border rounded-2xl bg-card/40 overflow-hidden">
                <div className="h-28 sm:h-40 bg-[linear-gradient(120deg,hsl(var(--muted)),transparent_55%),repeating-linear-gradient(135deg,transparent_0_18px,rgba(255,255,255,.035)_18px_19px)]" />
                <div className="p-6 md:p-8 -mt-12">
                  <div className="w-24 h-24 rounded-2xl border-4 border-background bg-muted flex items-center justify-center overflow-hidden">
                    {profile.profile_image_url ? <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" /> : <UserRound className="w-8 h-8 text-muted-foreground/50" />}
                  </div>
                  <div className="mt-5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-primary/70">Creator Profile active</p>
                    <h2 className="font-display text-3xl font-semibold mt-2">{profile.display_name}</h2>
                    <p className="text-sm text-muted-foreground font-mono mt-1">@{profile.username}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-6 max-w-2xl">{profile.bio || "Add a bio to tell the Vanta network what you make."}</p>
                  </div>
                </div>
              </section>
              <aside className="border border-border rounded-2xl p-6 bg-card/30 h-fit">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/55">Public profile</p>
                <p className="text-sm text-muted-foreground mt-3">Your profile is ready to become a home for your work and listings.</p>
                <Button variant="outline" className="w-full mt-6 gap-2" onClick={() => navigate(`/creators/${profile.username}`)}>View public profile <ExternalLink className="w-3.5 h-3.5" /></Button>
                </aside>
                <div className="lg:col-span-2"><CreatorWorkManager /></div>
            </div>
          ) : (
            <ProfileForm form={form} setField={setField} toggleDiscipline={toggleDiscipline} onSave={save} saving={saving} canSave={canSave} onCancel={profile ? () => { setForm(formFromProfile(profile)); setEditing(false); } : undefined} userName={user?.username} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ProfileForm({ form, setField, toggleDiscipline, onSave, saving, canSave, onCancel, userName }: {
  form: FormState; setField: (field: keyof FormState, value: string) => void;
  toggleDiscipline: (discipline: string) => void; onSave: () => void; saving: boolean;
  canSave: boolean; onCancel?: () => void; userName?: string;
}) {
  return (
    <div className="max-w-4xl">
      {onCancel && <button onClick={onCancel} className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-2 mb-8"><ChevronLeft className="w-3.5 h-3.5" /> Back to profile</button>}
      <div className="border border-border rounded-2xl p-6 md:p-9 bg-card/30">
        <div className="flex items-start gap-4 border-b border-border pb-7 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Sparkles className="w-5 h-5" /></div>
          <div><h2 className="font-display text-2xl font-semibold">{onCancel ? "Edit your profile" : "Claim your creative identity"}</h2><p className="text-sm text-muted-foreground mt-1">Public fields only. Certification is reviewed separately by Vanta.</p>{userName && <p className="text-[11px] font-mono text-muted-foreground/50 mt-2">IDENTITY LOCKED TO @{userName}</p>}</div>
        </div>
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Display name" required><Input value={form.display_name} onChange={e => setField("display_name", e.target.value)} placeholder="How the network knows you" maxLength={100} /></Field>
            <Field label="Primary discipline"><Input value={form.creator_type} onChange={e => setField("creator_type", e.target.value)} placeholder="Artist, producer, designer…" maxLength={100} /></Field>
          </div>
          <Field label="Bio"><Textarea value={form.bio} onChange={e => setField("bio", e.target.value)} placeholder="What do you make? What are you building?" maxLength={5000} className="min-h-32 resize-y" /><p className="text-[10px] text-muted-foreground/45 text-right mt-1">{form.bio.length}/5000</p></Field>
          <div><FieldLabel>Additional disciplines</FieldLabel><p className="text-xs text-muted-foreground mb-3">Select every lane you move through.</p><div className="flex flex-wrap gap-2">{CREATOR_DISCIPLINES.map(item => <button key={item} type="button" onClick={() => toggleDiscipline(item)} className={`px-3 py-2 rounded-md border text-xs transition-colors ${form.disciplines.includes(item) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>{form.disciplines.includes(item) && <Check className="inline w-3 h-3 mr-1" />}{item}</button>)}</div></div>
          <div className="grid sm:grid-cols-2 gap-5"><Field label="City"><Input value={form.city} onChange={e => setField("city", e.target.value)} placeholder="Johannesburg" maxLength={100} /></Field><Field label="Country"><Input value={form.country} onChange={e => setField("country", e.target.value)} placeholder="South Africa" maxLength={100} /></Field></div>
          <div><FieldLabel>Open channels</FieldLabel><p className="text-xs text-muted-foreground mb-4">Optional links to the places your work already lives.</p><div className="grid sm:grid-cols-2 gap-5"><Field label="Instagram"><Input type="url" value={form.instagram_url} onChange={e => setField("instagram_url", e.target.value)} placeholder="https://instagram.com/…" /></Field><Field label="Website"><Input type="url" value={form.website_url} onChange={e => setField("website_url", e.target.value)} placeholder="https://…" /></Field><Field label="Spotify"><Input type="url" value={form.spotify_url} onChange={e => setField("spotify_url", e.target.value)} placeholder="https://open.spotify.com/…" /></Field><Field label="SoundCloud"><Input type="url" value={form.soundcloud_url} onChange={e => setField("soundcloud_url", e.target.value)} placeholder="https://soundcloud.com/…" /></Field></div></div>
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-border mt-9 pt-6">{onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}<Button onClick={onSave} disabled={!canSave}>{saving ? "Saving…" : onCancel ? "Save changes" : "Activate Creator Profile"}</Button></div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) { return <label className="text-xs text-muted-foreground mb-2 block">{children}</label>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div><FieldLabel>{label}{required && <span className="text-primary ml-1">*</span>}</FieldLabel>{children}</div>; }