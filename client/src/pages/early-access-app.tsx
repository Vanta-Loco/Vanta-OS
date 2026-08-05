// ─── Early Access — Per-App Waitlist ──────────────────────────────────────────
import { useState } from "react";
import { useParams, Link } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { getUserToken } from "@/hooks/use-user";

const APP_META: Record<string, {
  label: string;
  desc: string;
  status: string;
  longDesc: string;
  features: string[];
  concept?: boolean;
}> = {
  wireline: {
    label: "Wireline",
    status: "Coming Soon",
    desc: "Private communication and community connecting Vanta members, creators and Rooms.",
    longDesc: "Wireline is a private communication and community system built exclusively for the Vanta ecosystem. Connect with creators, join communities, and communicate across Rooms and apps using a single Vanta identity.",
    features: ["Direct messaging", "Group communication", "Creator communities", "Cross-app identity", "Media sharing", "Room connections"],
  },
  rooms: {
    label: "Rooms",
    status: "Concept / In Development",
    desc: "Persistent digital spaces for communities, artists, listening parties, discussions and events.",
    longDesc: "Rooms are persistent digital spaces where communities gather — for listening parties, live discussions, artist broadcasts, event spaces, and shared experiences across the Vanta ecosystem.",
    features: ["Community spaces", "Listening parties", "Live discussions", "Artist rooms", "Event spaces", "Shared media"],
  },
  "vanta-deck": {
    label: "Vanta Deck",
    status: "Hardware Concept",
    desc: "A customizable physical cyberdeck and access device for the Vanta ecosystem.",
    longDesc: "The Vanta Deck is a concept for a physical cyberdeck — a modular access device designed around the Vanta OS ecosystem. This is a concept only and is not currently manufactured or available for purchase.",
    features: ["Custom physical design", "Vanta OS access", "Modular controls", "Music and communication access", "Creator-focused tools"],
    concept: true,
  },
  "vanta-os": {
    label: "Full Vanta OS",
    status: "In Development",
    desc: "The complete culture operating environment connecting identity, music, communication, worlds, publishing, commerce and creative tools.",
    longDesc: "Full Vanta OS is the complete culture operating system — one identity connecting every application, creative tool, world, and community in the Vanta ecosystem.",
    features: ["One Vanta identity", "Connected applications", "Music and creative tools", "Communication", "Publishing", "Worlds", "Discovery", "Commerce"],
  },
  voice: {
    label: "Voice",
    status: "Concept",
    desc: "Voice communication and live conversation tools for the Vanta ecosystem.",
    longDesc: "Vanta Voice will bring real-time voice communication and live conversation tools to the ecosystem — connecting creators, communities, and rooms through audio.",
    features: ["Live audio", "Conversation tools", "Room integration"],
  },
  studio: {
    label: "Studio",
    status: "Concept",
    desc: "Connected tools for music, art and creator workflows.",
    longDesc: "Vanta Studio is a concept for connected creative tools — supporting music production, art creation, and creator workflows built into the Vanta ecosystem.",
    features: ["Music tools", "Art tools", "Creator workflows", "Ecosystem integration"],
  },
};

interface WaitlistPayload {
  email: string;
  name: string;
  app_name: string;
  marketing_consent: boolean;
  referral_source: string;
}

export default function EarlyAccessApp() {
  const { slug } = useParams<{ slug: string }>();
  const meta = APP_META[slug || ""];
  const { user, isAuthenticated } = useUser();

  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.display_name || "");
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState("");

  const signupMutation = useMutation({
    mutationFn: async (payload: WaitlistPayload) => {
      const token = getUserToken();
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-User-Token": token } : {}),
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.duplicate) throw new Error("duplicate");
        throw new Error(json.error || "Signup failed");
      }
      return json;
    },
  });

  if (!meta) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          <p className="text-muted-foreground mb-4">App not found.</p>
          <Link href="/early-access">
            <Button variant="outline" size="sm">Back to Early Access</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setFormError("Please confirm you agree to receive updates.");
      return;
    }
    signupMutation.mutate({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      app_name: meta.label,
      marketing_consent: true,
      referral_source: document.referrer || "",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Back */}
        <Link href="/early-access">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Early Access
          </Button>
        </Link>

        {/* App identity */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">
                {meta.status}
                {meta.concept && <span className="ml-2 text-amber-500/60">(concept)</span>}
              </p>
              <h1 className="text-2xl font-display font-bold tracking-wide">{meta.label}</h1>
            </div>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed mb-6">{meta.longDesc}</p>

          {meta.concept && (
            <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-4 mb-6">
              <p className="text-xs text-amber-500/80 font-mono">
                ⚠ This is a concept only. It is not manufactured, available for purchase, or technically finalized.
              </p>
            </div>
          )}

          {/* Planned capabilities */}
          <div className="border border-border rounded-xl p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">
              Planned Capabilities
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {meta.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Waitlist form */}
        <div className="border border-border rounded-xl p-6">
          {signupMutation.isSuccess ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-primary/60 mx-auto mb-4" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-2">
                ACCESS REQUEST RECEIVED
              </p>
              <p className="text-base font-semibold mb-2">You're on the list.</p>
              <p className="text-sm text-muted-foreground">
                YOU WILL BE CONTACTED WHEN THE SYSTEM OPENS
              </p>
            </div>
          ) : signupMutation.error && (signupMutation.error as Error).message === "duplicate" ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-base font-semibold mb-2">Already registered</p>
              <p className="text-sm text-muted-foreground">
                This email is already on the {meta.label} waitlist.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">
                  Request Early Access
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Join the waitlist for {meta.label}. We'll contact you when access opens.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="Display name (optional)"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="text-sm"
                />
                <Input
                  type="email"
                  placeholder="Email address *"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="text-sm"
                />
              </div>

              {/* Consent */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Send me development updates and early-access announcements for this Vanta project.
                </span>
              </label>

              {(formError || (signupMutation.error && (signupMutation.error as Error).message !== "duplicate")) && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {formError || (signupMutation.error as Error).message}
                </div>
              )}

              <Button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full"
              >
                {signupMutation.isPending ? "Submitting…" : "Request Access"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
