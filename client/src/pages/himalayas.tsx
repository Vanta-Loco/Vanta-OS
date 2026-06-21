import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Eye, Mountain, Snowflake, Lock, ShieldAlert } from "lucide-react";

interface LoreFragment {
  code: string;
  title: string;
  redacted: string;
}

const FRAGMENTS: LoreFragment[] = [
  { code: "FRG-001", title: "The Ascent", redacted: "Those who climb the cold steps do not return the same. The path rewrites the climber as it is walked, one frozen breath at a time." },
  { code: "FRG-002", title: "Equinox Doctrine", redacted: "When light and dark hold equal weight, the Eye opens. Only then can the shrine read what is written beneath the snow." },
  { code: "FRG-003", title: "The Silent Order", redacted: "Keepers of the mountain speak in frequencies the city cannot hear. Their vows are carved, never spoken aloud." },
  { code: "FRG-004", title: "Buried Signal", redacted: "A transmission older than the label sleeps under the ridge. It hums at a pitch that melts no ice." },
];

export default function Himalayas() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20" style={{ background: "radial-gradient(ellipse at 50% 0%, #0a1428 0%, hsl(var(--background)) 55%)" }}>
        {/* ── Hero ── */}
        <section className="relative border-b border-border/60 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#93c5fd 1px, transparent 1px), linear-gradient(90deg, #93c5fd 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-sky-400/25 bg-sky-400/5 mb-7">
              <Mountain className="w-6 h-6 text-sky-300/70" />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300/60 mb-4 font-mono font-medium" data-testid="text-himalayas-label">
              Vanta OS / Restricted Expansion Zone
            </p>
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-none tracking-tight mb-6" data-testid="text-himalayas-title">
              HIDDEN HIMALAYAS
            </h1>
            <p className="text-muted-foreground font-mono text-sm max-w-xl mx-auto leading-relaxed" data-testid="text-himalayas-lore">
              A spiritual expansion buried in the cold. Ancient terminals, the Equinox Eye shrine,
              and lore fragments encrypted beneath the snow. The mountain remembers what the city forgot.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 md:py-16 space-y-12">

          {/* Equinox Eye shrine */}
          <div
            className="relative border border-sky-400/20 rounded-md overflow-hidden p-10 md:p-14 text-center"
            style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(56,189,248,0.07) 0%, transparent 65%)" }}
            data-testid="panel-equinox-eye"
          >
            <Snowflake className="absolute top-5 left-5 w-4 h-4 text-sky-300/20" />
            <Snowflake className="absolute bottom-5 right-5 w-4 h-4 text-sky-300/20" />
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-sky-300/30 mb-6" style={{ boxShadow: "0 0 40px rgba(56,189,248,0.15)" }}>
              <Eye className="w-7 h-7 text-sky-300/80" />
            </div>
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-sky-300/50 mb-3">The Shrine</p>
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4" data-testid="text-shrine-title">Equinox Eye</h2>
            <p className="text-muted-foreground/70 font-mono text-sm max-w-md mx-auto leading-relaxed">
              The shrine sits dormant, waiting for the equinox alignment. Its terminals accept no
              input until the patch is deployed.
            </p>
          </div>

          {/* Locked lore fragments */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-xs font-mono text-muted-foreground/60 tracking-widest uppercase">Lore Fragments</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="list-fragments">
              {FRAGMENTS.map((f) => (
                <div
                  key={f.code}
                  className="relative border border-border/55 rounded-md bg-card/30 p-5 overflow-hidden"
                  data-testid={`fragment-${f.code.toLowerCase()}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono tracking-widest text-sky-300/50">{f.code}</span>
                    <Lock className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-display font-bold text-foreground/90 mb-2">{f.title}</p>
                  <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed select-none blur-[3px]" aria-hidden="true">
                    {f.redacted}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Access denied CTA */}
          <div className="text-center py-12 border border-red-500/20 rounded-md bg-red-500/[0.03]" data-testid="panel-access-denied">
            <ShieldAlert className="w-9 h-9 text-red-500/50 mx-auto mb-5" />
            <Badge
              variant="secondary"
              className="font-mono text-xs gap-1.5 border-red-500/30 text-red-400 bg-red-500/10"
              data-testid="badge-access-denied"
            >
              <Lock className="w-3 h-3" /> ACCESS DENIED — PATCH NOT DEPLOYED
            </Badge>
            <p className="text-muted-foreground/50 text-xs font-mono mt-5 max-w-sm mx-auto leading-relaxed">
              This zone is sealed. Return when the signal from the mountain grows stronger.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
