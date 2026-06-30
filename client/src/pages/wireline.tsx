import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReturnToCity } from "@/components/return-to-city";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Hash, Radio, Megaphone, Crosshair, Antenna, SendHorizonal } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  desc: string;
  Icon: React.ElementType;
  locked: boolean;
}

interface Message {
  author: string;
  stamp: string;
  text: string;
  system?: boolean;
}

const CHANNELS: Channel[] = [
  { id: "public", name: "Public Channel", desc: "Open frequency", Icon: Hash, locked: false },
  { id: "announcements", name: "Announcements", desc: "Label broadcasts", Icon: Megaphone, locked: false },
  { id: "dispatches", name: "Mission Dispatches", desc: "OS directives", Icon: Crosshair, locked: false },
  { id: "feed", name: "Transmission Feed", desc: "Auto-relay", Icon: Antenna, locked: false },
  { id: "operator", name: "Operator Direct", desc: "Encrypted 1:1", Icon: Lock, locked: true },
  { id: "board", name: "Board Comms", desc: "Clearance V", Icon: Lock, locked: true },
];

const MESSAGES: Record<string, Message[]> = {
  public: [
    { author: "SYSTEM", stamp: "VNT 22:01:00", text: "You are connected to the Wireline. Stay sharp.", system: true },
    { author: "node_07", stamp: "VNT 22:04:18", text: "anyone catch the new transmission drop? signal was clean." },
    { author: "palemask", stamp: "VNT 22:06:42", text: "the city map updated again. district 01 has new structures online." },
    { author: "babyboiloco", stamp: "VNT 22:09:55", text: "more coming. keep your receivers warm." },
  ],
  announcements: [
    { author: "VANTA OS", stamp: "VNT 19:00:00", text: "Wireline relay deployed in read-only mode. Two-way comms pending economy layer.", system: true },
    { author: "VANTA OS", stamp: "VNT 19:00:12", text: "Black Index search protocol expanded — now indexing releases, worlds, and vault fragments." },
    { author: "VANTA OS", stamp: "VNT 19:00:30", text: "Hidden Himalayas portal detected in District 01. Access patch not yet deployed." },
  ],
  dispatches: [
    { author: "HANDLER", stamp: "VNT 20:14:03", text: "DISPATCH #001 — Locate the Equinox Eye fragment. Reward: 100 FRACT.", system: true },
    { author: "HANDLER", stamp: "VNT 20:18:47", text: "DISPATCH #002 — Decode the Fractured Godhead timeline. Status: LOCKED." },
    { author: "HANDLER", stamp: "VNT 20:22:11", text: "Standby for clearance. Mission layer activates with Vanta OS full release." },
  ],
  feed: [
    { author: "RELAY", stamp: "VNT 21:30:00", text: "auto://transmission — new signal indexed to Black Index.", system: true },
    { author: "RELAY", stamp: "VNT 21:41:26", text: "auto://release — discography node refreshed." },
    { author: "RELAY", stamp: "VNT 21:55:09", text: "auto://world — Fractured Godhead archive came online." },
  ],
};

export default function Wireline() {
  const [active, setActive] = useState("public");
  const activeChannel = CHANNELS.find((c) => c.id === active)!;
  const messages = MESSAGES[active] ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <ReturnToCity />
      <Header />

      <main className="flex-1 bg-background pt-20">
        {/* ── Hero ── */}
        <section className="relative border-b border-border overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
            <p className="text-xs uppercase tracking-widest text-sky-500/70 mb-4 font-mono font-medium" data-testid="text-wireline-label">
              Vanta OS / Dispatch Relay
            </p>
            <div className="flex items-end gap-5 mb-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-none tracking-tight" data-testid="text-wireline-title">
                WIRELINE TERMINAL
              </h1>
              <div className="mb-2 hidden md:flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-sky-500/70" />
                <span className="text-xs font-mono text-muted-foreground tracking-widest">READ-ONLY</span>
              </div>
            </div>
            <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed" data-testid="text-wireline-lore">
              A terminal-style dispatch system for the Vanta network. Monitor public channels,
              announcements, and mission relays. Two-way transmission unlocks with the economy layer.
            </p>
          </div>
        </section>

        {/* ── Terminal layout ── */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 md:gap-6">

            {/* Channel list */}
            <aside className="space-y-1.5" data-testid="list-channels">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/40 px-2 mb-3">
                Channels
              </p>
              {CHANNELS.map((c) => {
                const isActive = c.id === active;
                if (c.locked) {
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-border/40 opacity-50 cursor-not-allowed"
                      data-testid={`channel-locked-${c.id}`}
                      title="Channel encrypted — clearance required"
                    >
                      <c.Icon className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono text-muted-foreground/60 truncate">{c.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/30 truncate">{c.desc}</p>
                      </div>
                      <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    </div>
                  );
                }
                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors text-left ${
                      isActive
                        ? "border-sky-500/30 bg-sky-500/10"
                        : "border-border/50 hover-elevate"
                    }`}
                    data-testid={`channel-${c.id}`}
                  >
                    <c.Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-sky-400" : "text-muted-foreground/50"}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-mono truncate ${isActive ? "text-foreground" : "text-muted-foreground/80"}`}>
                        {c.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground/40 truncate">{c.desc}</p>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Message feed */}
            <section className="border border-border/60 rounded-md bg-card/40 flex flex-col min-h-[460px]" data-testid="panel-feed">
              {/* Feed header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
                <activeChannel.Icon className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-mono text-foreground truncate" data-testid="text-active-channel">{activeChannel.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground/40 truncate">{activeChannel.desc}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 tracking-widest">LIVE</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-5 space-y-5 overflow-y-auto" data-testid="list-messages">
                {messages.map((m, i) => (
                  <div key={i} className="flex flex-col gap-1" data-testid={`message-${active}-${i}`}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`text-xs font-mono font-medium ${m.system ? "text-sky-400" : "text-foreground"}`}>
                        {m.author}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground/35 tracking-wider">{m.stamp}</span>
                      {m.system && (
                        <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0">SYS</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground/85 leading-relaxed font-mono pl-0.5">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* Disabled relay input */}
              <div className="border-t border-border/50 p-3.5">
                <div className="relative opacity-60">
                  <Input
                    disabled
                    placeholder="RELAY OFFLINE — transmission unlocks with economy layer"
                    className="pr-11 font-mono text-xs cursor-not-allowed"
                    data-testid="input-relay-disabled"
                  />
                  <SendHorizonal className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
