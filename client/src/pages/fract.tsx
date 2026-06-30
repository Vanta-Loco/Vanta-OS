import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Coins, BookOpen, Target, BadgeCheck, Lock, Activity } from "lucide-react";
import { ReturnToCity } from "@/components/return-to-city";

interface EarnMethod {
  amount: string;
  label: string;
  desc: string;
  Icon: React.ElementType;
}

const EARN: EarnMethod[] = [
  { amount: "+5", label: "Read transmission", desc: "Absorb a signal from the index.", Icon: BookOpen },
  { amount: "+20", label: "Complete mission", desc: "Fulfill an OS dispatch directive.", Icon: Target },
  { amount: "+100", label: "Verified worldbuilder", desc: "Contribute accepted canon to the universe.", Icon: BadgeCheck },
];

export default function Fract() {
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
                "linear-gradient(#a3e635 1px, transparent 1px), linear-gradient(90deg, #a3e635 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-20">
            <p className="text-xs uppercase tracking-widest text-lime-500/70 mb-4 font-mono font-medium" data-testid="text-fract-label">
              Vanta OS / Reputation Economy
            </p>
            <div className="flex items-end gap-5 mb-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-none tracking-tight" data-testid="text-fract-title">
                FRACT TERMINAL
              </h1>
            </div>
            <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed" data-testid="text-fract-lore">
              FRACT is the reputation layer of the Vanta universe — earned through participation,
              not purchased. Not crypto. Not currency. A measure of standing inside the system.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 md:py-16 space-y-10">

          {/* Balance */}
          <div className="border border-border/60 rounded-md bg-card/40 p-8 md:p-10 text-center" data-testid="panel-balance">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-lime-500/30 bg-lime-500/5 mb-5">
              <Coins className="w-5 h-5 text-lime-500/70" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/50 mb-3">
              Current Balance
            </p>
            <p className="text-6xl md:text-7xl font-display font-bold leading-none tracking-tight" data-testid="text-balance">
              0 <span className="text-lime-500/80 text-3xl md:text-4xl align-top">FRACT</span>
            </p>
            <div className="mt-6 inline-flex">
              <Badge variant="secondary" className="font-mono text-xs gap-1.5" data-testid="badge-economy-locked">
                <Lock className="w-3 h-3" /> Economy layer not yet active
              </Badge>
            </div>
          </div>

          {/* Ways to earn */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-xs font-mono text-muted-foreground/60 tracking-widest uppercase">Ways to Earn</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-testid="list-earn">
              {EARN.map((e) => (
                <div
                  key={e.label}
                  className="border border-border/55 rounded-md bg-card/30 p-5 flex flex-col gap-3"
                  data-testid={`earn-${e.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <e.Icon className="w-4 h-4 text-muted-foreground/50" />
                    <span className="font-mono text-lg font-bold text-lime-500/80">{e.amount}</span>
                  </div>
                  <div>
                    <p className="text-sm font-display font-bold text-foreground">{e.label}</p>
                    <p className="text-xs text-muted-foreground/60 font-mono mt-1 leading-relaxed">{e.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ledger empty state */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-xs font-mono text-muted-foreground/60 tracking-widest uppercase">Ledger</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <div className="text-center py-16 border border-border/50 rounded-sm" data-testid="ledger-empty">
              <Activity className="w-10 h-10 text-muted-foreground/15 mx-auto mb-5" />
              <p className="text-xs font-mono tracking-widest text-muted-foreground/50 uppercase mb-2">
                No ledger activity
              </p>
              <p className="text-muted-foreground/50 text-sm font-mono">
                Transactions will appear here once the economy layer comes online.
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
