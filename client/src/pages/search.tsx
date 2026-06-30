import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation, Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ReturnToCity } from "@/components/return-to-city";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, X, Database, ArrowRight, FileText, Disc3, Globe, LockKeyhole, ScrollText, ShieldAlert,
} from "lucide-react";
import { useVault } from "@/hooks/use-vault";
import { worlds } from "@/data/worlds";
import type { Post, Release, VaultItem } from "@shared/schema";

type Kind = "TRANSMISSION" | "RELEASE" | "WORLD" | "VAULT" | "LORE";

interface ArchiveResult {
  kind: Kind;
  id: string;
  title: string;
  snippet: string;
  meta?: string;
  href: string;
}

const KIND_ORDER: Kind[] = ["TRANSMISSION", "RELEASE", "WORLD", "VAULT", "LORE"];

const KIND_META: Record<Kind, { Icon: React.ElementType; badge: string }> = {
  TRANSMISSION: { Icon: FileText, badge: "border-purple-500/30 text-purple-300 bg-purple-500/10" },
  RELEASE: { Icon: Disc3, badge: "border-sky-500/30 text-sky-300 bg-sky-500/10" },
  WORLD: { Icon: Globe, badge: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" },
  VAULT: { Icon: LockKeyhole, badge: "border-red-500/30 text-red-300 bg-red-500/10" },
  LORE: { Icon: ScrollText, badge: "border-amber-500/30 text-amber-300 bg-amber-500/10" },
};

// Placeholder lore fragments — surfaced from the wider Vanta mythology.
const LORE_FRAGMENTS: { id: string; title: string; snippet: string; href: string }[] = [
  { id: "lore-equinox-eye", title: "Equinox Eye", snippet: "An ancient lens that reads the seams between worlds. Dormant in the mountain shrine.", href: "/himalayas" },
  { id: "lore-fractured-godhead", title: "Fractured Godhead", snippet: "A godhead split across timelines — the mythology archive of the Vanta universe.", href: "/fgh" },
  { id: "lore-hidden-himalayas", title: "Hidden Himalayas", snippet: "A spiritual expansion buried in the cold. Access patch not yet deployed.", href: "/himalayas" },
  { id: "lore-the-board", title: "The Board", snippet: "The unseen architects behind Vanta OS. They decide what comes online and what stays buried.", href: "/fgh" },
  { id: "lore-fract", title: "FRACT Economy", snippet: "The reputation layer of the Vanta universe. Earned through participation, never bought.", href: "/fract" },
  { id: "lore-wireline", title: "Wireline Relay", snippet: "A terminal dispatch system relaying public channels, announcements, and missions.", href: "/wireline" },
];

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const { isAuthorized, isLoading: authLoading } = useVault();

  const params = new URLSearchParams(rawSearch);
  const urlQ = params.get("q") ?? "";

  const [inputVal, setInputVal] = useState(urlQ);
  const [kindFilter, setKindFilter] = useState<Kind | "ALL">("ALL");

  useEffect(() => { setInputVal(urlQ); }, [urlQ]);
  useEffect(() => { setKindFilter("ALL"); }, [urlQ]);

  // ── Sources ──────────────────────────────────────────────────────────────
  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/search", urlQ],
    enabled: !!urlQ,
    queryFn: async () => {
      const res = await fetch(`/api/posts/search?q=${encodeURIComponent(urlQ)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const { data: releases, isLoading: releasesLoading } = useQuery<Release[]>({
    queryKey: ["/api/releases"],
    enabled: !!urlQ,
  });

  const { data: vaultItems, isLoading: vaultLoading } = useQuery<VaultItem[]>({
    queryKey: ["/api/vault/items"],
    enabled: !!urlQ && isAuthorized,
  });

  const isLoading = !!urlQ && (authLoading || postsLoading || releasesLoading || (isAuthorized && vaultLoading));

  // ── Aggregate results ──────────────────────────────────────────────────────
  const allResults = useMemo<ArchiveResult[]>(() => {
    if (!urlQ) return [];
    const q = urlQ.toLowerCase();
    const hit = (...vals: (string | null | undefined)[]) =>
      vals.some((v) => v != null && v.toLowerCase().includes(q));

    const out: ArchiveResult[] = [];

    for (const p of posts ?? []) {
      out.push({ kind: "TRANSMISSION", id: p.id, title: p.title, snippet: p.excerpt, meta: p.category, href: `/post/${p.id}` });
    }
    for (const r of releases ?? []) {
      if (hit(r.title, r.description, r.type)) {
        out.push({ kind: "RELEASE", id: r.id, title: r.title, snippet: r.description, meta: r.type, href: "/releases" });
      }
    }
    for (const w of worlds) {
      if (hit(w.name, w.tagline, w.description, w.detail)) {
        out.push({ kind: "WORLD", id: w.id, title: w.name, snippet: w.description, meta: w.tagline, href: w.href });
      }
    }
    if (isAuthorized) {
      for (const v of vaultItems ?? []) {
        if (hit(v.title, v.description, v.category, v.type)) {
          out.push({ kind: "VAULT", id: v.id, title: v.title, snippet: v.description || "Restricted vault artifact.", meta: v.category || v.type, href: "/vault" });
        }
      }
    }
    for (const l of LORE_FRAGMENTS) {
      if (hit(l.title, l.snippet)) {
        out.push({ kind: "LORE", id: l.id, title: l.title, snippet: l.snippet, meta: "Encrypted fragment", href: l.href });
      }
    }
    return out;
  }, [urlQ, posts, releases, vaultItems, isAuthorized]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of allResults) c[r.kind] = (c[r.kind] ?? 0) + 1;
    return c;
  }, [allResults]);

  const visibleResults = kindFilter === "ALL" ? allResults : allResults.filter((r) => r.kind === kindFilter);

  function push(q: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    navigate(`/search?${p.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push(inputVal);
  }

  const activeKinds = KIND_ORDER.filter((k) => (counts[k] ?? 0) > 0);

  return (
    <div className="min-h-screen flex flex-col">
      <ReturnToCity />
      <Header />

      <main className="flex-1 bg-background pt-20">

        {/* ── Black Index hero ── */}
        <section className="relative border-b border-border overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
            <p className="text-xs uppercase tracking-widest text-purple-500/70 mb-4 font-mono font-medium" data-testid="text-black-index-label">
              Vanta OS / Archive Search
            </p>

            <div className="flex items-end gap-5 mb-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-none tracking-tight" data-testid="text-page-title">
                BLACK INDEX
              </h1>
              <div className="mb-2 hidden md:flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground tracking-widest">LIVE</span>
              </div>
            </div>

            <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed mb-10" data-testid="text-black-index-lore">
              The encrypted archive of the entire Vanta system. Transmissions, releases, worlds,
              vault artifacts, and lore — cross-referenced and retrievable. Query the record.
            </p>

            <form onSubmit={handleSubmit} className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500/60 pointer-events-none" />
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Query the index…"
                className="pl-11 pr-11 h-13 text-base font-mono bg-background/80 border-border/60 focus-visible:border-purple-500/40 focus-visible:ring-purple-500/10 placeholder:text-muted-foreground/40"
                autoFocus
                data-testid="input-search-page"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => { setInputVal(""); navigate("/search"); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
        </section>

        {/* ── Results area ── */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">

          {/* Idle */}
          {!urlQ && (
            <div className="text-center py-28 border border-border/50 rounded-sm" data-testid="text-search-prompt">
              <Database className="w-10 h-10 text-purple-500/20 mx-auto mb-5" />
              <p className="text-xs font-mono tracking-widest text-muted-foreground/50 uppercase mb-2">Archive ready</p>
              <p className="text-muted-foreground/60 text-sm font-mono">
                Enter a query above to search every layer of the index.
              </p>
            </div>
          )}

          {urlQ && (
            <>
              {/* Terminal loading */}
              {isLoading && (
                <div className="border border-purple-500/20 rounded-sm bg-card/30 p-6 font-mono" data-testid="search-loading">
                  <div className="flex items-center gap-2 text-purple-400/80 mb-5">
                    <Database className="w-4 h-4 animate-pulse" />
                    <span className="tracking-widest text-xs uppercase">Querying Black Index…</span>
                  </div>
                  <div className="space-y-2.5">
                    {["Indexing transmissions", "Cross-referencing releases", "Scanning world registry", "Decrypting vault layer", "Recovering lore fragments"].map((l) => (
                      <div key={l} className="flex items-center gap-3 text-xs text-muted-foreground/50">
                        <span className="text-purple-500/60">›</span>
                        <span>{l}</span>
                        <span className="flex-1 border-b border-dashed border-border/40 mx-1" />
                        <span className="text-purple-400/60 animate-pulse">···</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground/40">
                    <span>vanta@blackindex:~$</span>
                    <span className="inline-block w-2 h-3.5 bg-purple-500/70 animate-pulse" />
                  </div>
                </div>
              )}

              {!isLoading && (
                <>
                  {/* Type filter pills */}
                  {allResults.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8" data-testid="search-type-filters">
                      <button
                        type="button"
                        onClick={() => setKindFilter("ALL")}
                        data-testid="filter-type-all"
                        className={[
                          "px-4 py-1.5 text-xs rounded-sm border transition-colors font-mono tracking-wide",
                          kindFilter === "ALL"
                            ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                            : "bg-transparent text-muted-foreground border-border hover:border-purple-500/25 hover:text-foreground",
                        ].join(" ")}
                      >
                        All · {allResults.length}
                      </button>
                      {activeKinds.map((k) => {
                        const active = kindFilter === k;
                        const { Icon } = KIND_META[k];
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setKindFilter(active ? "ALL" : k)}
                            data-testid={`filter-type-${k.toLowerCase()}`}
                            className={[
                              "px-4 py-1.5 text-xs rounded-sm border transition-colors font-mono tracking-wide inline-flex items-center gap-1.5",
                              active
                                ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                : "bg-transparent text-muted-foreground border-border hover:border-purple-500/25 hover:text-foreground",
                            ].join(" ")}
                          >
                            <Icon className="w-3 h-3" /> {k} · {counts[k]}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Result count */}
                  <p className="text-xs font-mono text-muted-foreground/60 mb-6 tracking-widest uppercase" data-testid="text-results-count">
                    {allResults.length === 0
                      ? `No signal found for "${urlQ}"`
                      : `${visibleResults.length} signal${visibleResults.length === 1 ? "" : "s"} retrieved for "${urlQ}"`}
                  </p>

                  {/* Vault clearance hint */}
                  {!isAuthorized && !authLoading && (
                    <Link href="/enter" data-testid="link-vault-clearance">
                      <div className="flex items-center gap-2.5 mb-8 px-4 py-3 rounded-sm border border-red-500/20 bg-red-500/[0.03] hover-elevate cursor-pointer">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0" />
                        <span className="text-xs font-mono text-muted-foreground/70">
                          Vault layer hidden — clearance required to index restricted artifacts.
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-red-400/50 ml-auto flex-shrink-0" />
                      </div>
                    </Link>
                  )}

                  {/* Results list */}
                  {visibleResults.length > 0 && (
                    <div className="space-y-3" data-testid="search-results">
                      {visibleResults.map((r) => {
                        const { Icon, badge } = KIND_META[r.kind];
                        return (
                          <Link key={`${r.kind}-${r.id}`} href={r.href} data-testid={`result-${r.kind.toLowerCase()}-${r.id}`}>
                            <div className="group flex items-start gap-4 p-4 md:p-5 rounded-md border border-border/55 bg-card/30 hover-elevate cursor-pointer">
                              <div className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[9px] font-mono tracking-widest ${badge}`}>
                                <Icon className="w-3 h-3" />
                                <span className="hidden sm:inline">{r.kind}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="text-base font-display font-bold text-foreground truncate">{r.title}</h3>
                                  {r.meta && (
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">{r.meta}</span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground/70 font-mono leading-relaxed mt-1.5 line-clamp-2">
                                  {r.snippet}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground/25 group-hover:text-purple-400/70 transition-colors flex-shrink-0 mt-1" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* No signal found */}
                  {allResults.length === 0 && (
                    <div className="text-center py-24 border border-border/50 rounded-sm" data-testid="text-no-results">
                      <Database className="w-14 h-14 text-muted-foreground/20 mx-auto mb-5 opacity-40" />
                      <p className="text-sm font-mono tracking-[0.3em] text-red-400/70 uppercase mb-3">
                        No Signal Found
                      </p>
                      <p className="text-muted-foreground/60 text-sm font-mono mb-6">
                        The index returned nothing for "{urlQ}". Try a different query string.
                      </p>
                      <Link href="/">
                        <Button variant="outline" className="font-mono text-xs tracking-widest" data-testid="button-browse-all">
                          Browse All Transmissions
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
