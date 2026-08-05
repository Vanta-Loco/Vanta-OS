// ─── Early Access — Landing ────────────────────────────────────────────────────
import { Link } from "wouter";
import { Header } from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import { Lock, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const APPS = [
  {
    slug: "wireline",
    label: "Wireline",
    desc: "Private communication and community system connecting Vanta members, creators and Rooms.",
    status: "Coming Soon",
    features: ["Direct messaging", "Group communication", "Creator communities", "Cross-app identity"],
  },
  {
    slug: "rooms",
    label: "Rooms",
    desc: "Persistent digital spaces for communities, artists, listening parties, discussions and events.",
    status: "Concept / In Development",
    features: ["Community spaces", "Listening parties", "Live discussions", "Artist rooms"],
  },
  {
    slug: "vanta-deck",
    label: "Vanta Deck",
    desc: "A customizable physical cyberdeck and access device for the Vanta ecosystem.",
    status: "Hardware Concept",
    features: ["Custom physical design", "Vanta OS access", "Modular controls"],
    concept: true,
  },
  {
    slug: "vanta-os",
    label: "Full Vanta OS",
    desc: "The complete culture operating environment connecting identity, music, communication, worlds, and creative tools.",
    status: "In Development",
    features: ["One Vanta identity", "Connected applications", "Music & creative tools", "Publishing"],
  },
  {
    slug: "voice",
    label: "Voice",
    desc: "Voice communication and live conversation tools for the Vanta ecosystem.",
    status: "Concept",
    features: ["Live audio", "Conversation tools"],
  },
  {
    slug: "studio",
    label: "Studio",
    desc: "Connected tools for music, art and creator workflows.",
    status: "Concept",
    features: ["Music tools", "Art tools", "Creator workflows"],
  },
];

export default function EarlyAccess() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-3">
            VANTA OS · EARLY ACCESS
          </p>
          <h1 className="text-3xl font-display font-bold tracking-wide mb-3">Upcoming Apps</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Join waitlists for upcoming Vanta applications. You'll be contacted when access opens.
          </p>
        </div>

        {/* App cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {APPS.map(app => (
            <div key={app.slug} className="border border-border rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center relative flex-shrink-0">
                  <Lock className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <span className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wide text-right leading-tight">
                  {app.status}
                  {app.concept && <><br /><span className="text-[8px] text-amber-500/60">(concept only)</span></>}
                </span>
              </div>

              <div>
                <h2 className="text-base font-semibold mb-1">{app.label}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{app.desc}</p>
              </div>

              {app.features && (
                <ul className="flex flex-col gap-1 flex-1">
                  {app.features.slice(0, 3).map(f => (
                    <li key={f} className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <Link href={`/early-access/${app.slug}`}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                  <Clock className="w-3 h-3" />
                  Join Early Access
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-2">
              <ArrowRight className="w-3 h-3 rotate-180" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
