import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { SkeletonPostCard } from "@/components/skeleton-post-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Database } from "lucide-react";
import { Link } from "wouter";
import type { Post } from "@shared/schema";

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(rawSearch);
  const urlQ = params.get("q") ?? "";
  const urlCategory = params.get("category") ?? "";

  const [inputVal, setInputVal] = useState(urlQ);

  useEffect(() => { setInputVal(urlQ); }, [urlQ]);

  const { data: results, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/search", urlQ, urlCategory],
    enabled: !!urlQ,
    queryFn: async () => {
      const p = new URLSearchParams({ q: urlQ });
      if (urlCategory) p.set("category", urlCategory);
      const res = await fetch(`/api/posts/search?${p}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const { data: allResults } = useQuery<Post[]>({
    queryKey: ["/api/posts/search", urlQ, ""],
    enabled: !!urlQ,
    queryFn: async () => {
      const res = await fetch(`/api/posts/search?q=${encodeURIComponent(urlQ)}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const categories = allResults
    ? Array.from(new Set(allResults.map((p) => p.category).filter(Boolean)))
    : [];

  function push(q: string, category: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    navigate(`/search?${p.toString()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    push(inputVal, "");
  }

  function toggleCategory(cat: string) {
    push(urlQ, urlCategory === cat ? "" : cat);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">

        {/* ── Black Index hero ── */}
        <section className="relative border-b border-border overflow-hidden">
          {/* Background grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 md:py-28">
            <p className="text-xs uppercase tracking-widest text-purple-500/70 mb-4 font-mono font-medium" data-testid="text-black-index-label">
              Vanta OS / Search Protocol
            </p>

            <div className="flex items-end gap-5 mb-4">
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-none tracking-tight"
                data-testid="text-page-title"
              >
                BLACK INDEX
              </h1>
              <div className="mb-2 hidden md:flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground tracking-widest">LIVE</span>
              </div>
            </div>

            <p className="text-muted-foreground font-mono text-sm max-w-xl leading-relaxed mb-10" data-testid="text-black-index-lore">
              The encrypted archive of all Vanta transmissions. Every signal indexed,
              cross-referenced, and retrievable. Query the record.
            </p>

            {/* Search bar */}
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

          {/* Idle state */}
          {!urlQ && (
            <div
              className="text-center py-28 border border-border/50 rounded-sm"
              data-testid="text-search-prompt"
            >
              <Database className="w-10 h-10 text-purple-500/20 mx-auto mb-5" />
              <p className="text-xs font-mono tracking-widest text-muted-foreground/50 uppercase mb-2">
                Archive ready
              </p>
              <p className="text-muted-foreground/60 text-sm font-mono">
                Enter a query above to search the transmission index.
              </p>
            </div>
          )}

          {urlQ && (
            <>
              {/* Category pills */}
              {!isLoading && categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-8" data-testid="search-category-filters">
                  {categories.map((cat) => {
                    const active = urlCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        data-testid={`filter-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                        className={[
                          "px-4 py-1.5 text-xs rounded-sm border transition-colors font-mono tracking-wide",
                          active
                            ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                            : "bg-transparent text-muted-foreground border-border hover:border-purple-500/25 hover:text-foreground",
                        ].join(" ")}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  {urlCategory && (
                    <button
                      type="button"
                      onClick={() => toggleCategory(urlCategory)}
                      data-testid="button-clear-category"
                      className="px-4 py-1.5 text-xs rounded-sm border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-mono"
                    >
                      <X className="w-3 h-3" /> Clear filter
                    </button>
                  )}
                </div>
              )}

              {/* Result count */}
              {!isLoading && results && (
                <p className="text-xs font-mono text-muted-foreground/60 mb-8 tracking-widest uppercase" data-testid="text-results-count">
                  {results.length === 0
                    ? `No records found for "${urlQ}"${urlCategory ? ` in ${urlCategory}` : ""}`
                    : `${results.length} record${results.length === 1 ? "" : "s"} retrieved for "${urlQ}"${urlCategory ? ` · ${urlCategory}` : ""}`}
                </p>
              )}

              {/* Loading */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" data-testid="search-loading">
                  {[1, 2, 3].map((i) => <SkeletonPostCard key={i} />)}
                </div>
              )}

              {/* Results grid */}
              {!isLoading && results && results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" data-testid="search-results">
                  {results.map((post) => <PostCard key={post.id} post={post} />)}
                </div>
              )}

              {/* No results */}
              {!isLoading && results && results.length === 0 && (
                <div
                  className="text-center py-24 border border-border/50 rounded-sm"
                  data-testid="text-no-results"
                >
                  <Database className="w-14 h-14 text-muted-foreground/20 mx-auto mb-5 opacity-40" />
                  <p className="text-xs font-mono tracking-widest text-muted-foreground/50 uppercase mb-3">
                    No records found
                  </p>
                  <p className="text-muted-foreground/60 text-sm font-mono mb-6">
                    {urlCategory ? (
                      <>
                        Nothing in <strong className="text-muted-foreground">{urlCategory}</strong> matches that query.{" "}
                        <button
                          onClick={() => toggleCategory(urlCategory)}
                          className="underline underline-offset-2 hover:text-foreground transition-colors"
                          data-testid="button-remove-category-filter"
                        >
                          Remove the filter
                        </button>{" "}
                        to search all categories.
                      </>
                    ) : (
                      "Try a different query string."
                    )}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
