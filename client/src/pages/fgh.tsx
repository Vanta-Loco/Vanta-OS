import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Users, Swords, MapPin, Clock, Gem, Zap, Skull } from "lucide-react";

type SectionId = "characters" | "factions" | "locations" | "timeline" | "artifacts" | "powers";

interface ArchiveEntry {
  name: string;
  label: string;
  blurb: string;
  status: "ACTIVE" | "CLASSIFIED" | "PENDING";
}

interface Section {
  id: SectionId;
  name: string;
  Icon: React.ElementType;
  entries: ArchiveEntry[];
}

const SECTIONS: Section[] = [
  {
    id: "characters",
    name: "Characters",
    Icon: Users,
    entries: [
      { name: "Amon", label: "The Fractured", blurb: "A godhead split across timelines, searching for the pieces of himself scattered through the city.", status: "ACTIVE" },
      { name: "Vanessa", label: "The Witness", blurb: "She sees the seams in reality others can't. Loyalty unknown, motives encrypted.", status: "ACTIVE" },
      { name: "Neon Fangz", label: "The Wildcard", blurb: "Street prophet wired to the frequency. Loud, dangerous, impossible to ignore.", status: "ACTIVE" },
    ],
  },
  {
    id: "factions",
    name: "Factions",
    Icon: Swords,
    entries: [
      { name: "Block Saints", label: "Street Order", blurb: "Guardians of the lower districts. They keep the peace by their own brutal code.", status: "ACTIVE" },
      { name: "Pale Masks", label: "The Hidden", blurb: "Faceless operatives moving between worlds. No one knows who wears the mask.", status: "CLASSIFIED" },
      { name: "The Board", label: "The Architects", blurb: "The unseen hand behind Vanta OS. They decide what comes online and what stays buried.", status: "CLASSIFIED" },
    ],
  },
  {
    id: "locations",
    name: "Locations",
    Icon: MapPin,
    entries: [
      { name: "Vanta City", label: "District 01", blurb: "The neon-soaked capital of the system. Every road routes back to the core.", status: "ACTIVE" },
      { name: "Hidden Himalayas", label: "Cold Expansion", blurb: "A spiritual zone buried in the snow. Sealed until the patch deploys.", status: "PENDING" },
      { name: "The Core", label: "System Heart", blurb: "Where the godhead first fractured. Coordinates redacted.", status: "CLASSIFIED" },
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    Icon: Clock,
    entries: [
      { name: "The Fracture", label: "Year Zero", blurb: "The moment the godhead shattered and the city was born from the debris.", status: "ACTIVE" },
      { name: "The Quiet War", label: "Era II", blurb: "Factions rose in the silence. Records of this era remain incomplete.", status: "CLASSIFIED" },
      { name: "The Realignment", label: "Era III", blurb: "Prophesied convergence at the next equinox. Date pending.", status: "PENDING" },
    ],
  },
  {
    id: "artifacts",
    name: "Artifacts",
    Icon: Gem,
    entries: [
      { name: "Equinox Eye", label: "The Relic", blurb: "An ancient lens that reads the seams between worlds. Dormant in the mountain shrine.", status: "ACTIVE" },
      { name: "The Black Index", label: "The Record", blurb: "An archive that indexes every signal ever transmitted. Always listening.", status: "ACTIVE" },
      { name: "Shattered Crown", label: "Lost Relic", blurb: "Fragments of the godhead's crown, scattered and hunted across the timeline.", status: "PENDING" },
    ],
  },
  {
    id: "powers",
    name: "Powers",
    Icon: Zap,
    entries: [
      { name: "Frequency Sight", label: "Perception", blurb: "The ability to perceive the underlying signal of reality.", status: "CLASSIFIED" },
      { name: "Seam Walking", label: "Movement", blurb: "Stepping between fractured timelines through the gaps in the world.", status: "CLASSIFIED" },
      { name: "Echo Binding", label: "Manipulation", blurb: "Reweaving scattered fragments into a single coherent form.", status: "PENDING" },
    ],
  },
];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "border-red-500/30 text-red-400 bg-red-500/10",
  CLASSIFIED: "border-border text-muted-foreground bg-muted/40",
  PENDING: "border-yellow-500/20 text-yellow-400 bg-yellow-500/10",
};

export default function FracturedGodhead() {
  const [active, setActive] = useState<SectionId | "all">("all");
  const visible = active === "all" ? SECTIONS : SECTIONS.filter((s) => s.id === active);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">
        {/* ── Hero ── */}
        <section className="relative border-b border-border overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(#f87171 1px, transparent 1px), linear-gradient(90deg, #f87171 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-red-500/25 bg-red-500/5 mb-6">
              <Skull className="w-5 h-5 text-red-500/70" />
            </div>
            <p className="text-xs uppercase tracking-widest text-red-500/70 mb-4 font-mono font-medium" data-testid="text-fgh-label">
              Vanta OS / Lore Archive
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-none tracking-tight mb-5" data-testid="text-fgh-title">
              FRACTURED GODHEAD
            </h1>
            <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed" data-testid="text-fgh-lore">
              The mythology archive. Characters, factions, locations, and artifacts of a universe
              told across sound and story. Fragments surface here as they are recovered.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 md:py-14">

          {/* Section filter */}
          <div className="flex flex-wrap gap-2 mb-10" data-testid="section-filters">
            <button
              onClick={() => setActive("all")}
              className={`px-4 py-1.5 text-xs rounded-sm border transition-colors font-mono tracking-wide ${
                active === "all"
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : "bg-transparent text-muted-foreground border-border hover:border-red-500/25 hover:text-foreground"
              }`}
              data-testid="filter-all"
            >
              All
            </button>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`px-4 py-1.5 text-xs rounded-sm border transition-colors font-mono tracking-wide inline-flex items-center gap-1.5 ${
                  active === s.id
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : "bg-transparent text-muted-foreground border-border hover:border-red-500/25 hover:text-foreground"
                }`}
                data-testid={`filter-${s.id}`}
              >
                <s.Icon className="w-3 h-3" /> {s.name}
              </button>
            ))}
          </div>

          {/* Sections */}
          <div className="space-y-14">
            {visible.map((section) => (
              <section key={section.id} data-testid={`section-${section.id}`}>
                <div className="flex items-center gap-3 mb-6">
                  <section.Icon className="w-4 h-4 text-red-500/70" />
                  <h2 className="text-lg font-display font-bold tracking-tight">{section.name}</h2>
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs font-mono text-muted-foreground/40">{section.entries.length}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid={`grid-${section.id}`}>
                  {section.entries.map((e) => (
                    <div
                      key={e.name}
                      className="border border-border/55 rounded-md bg-card/30 p-5 hover-elevate transition-all"
                      data-testid={`entry-${e.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-display font-bold text-foreground truncate">{e.name}</h3>
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/45 mt-1">{e.label}</p>
                        </div>
                        <span className={`text-[9px] font-mono px-2 py-1 rounded-sm border flex-shrink-0 ${STATUS_STYLE[e.status]}`}>
                          {e.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed">{e.blurb}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-16 text-center">
            <Badge variant="secondary" className="font-mono text-xs gap-1.5" data-testid="badge-archive-status">
              Archive incomplete — fragments recovered over time
            </Badge>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
