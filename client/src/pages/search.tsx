import { useQuery } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { SkeletonPostCard } from "@/components/skeleton-post-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Link } from "wouter";
import type { Post } from "@shared/schema";

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(rawSearch);
  const urlQ = params.get("q") ?? "";
  const urlCategory = params.get("category") ?? "";

  const [inputVal, setInputVal] = useState(urlQ);

  // Sync input when URL changes (e.g. header navigates here)
  useEffect(() => {
    setInputVal(urlQ);
  }, [urlQ]);

  // Fetch search results (with optional category filter from URL)
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

  // Fetch unfiltered results to derive available category pills
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
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">

          {/* Page headline */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
              Transmissions
            </p>
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-8"
              data-testid="text-page-title"
            >
              Search
            </h1>

            {/* Search bar */}
            <form onSubmit={handleSubmit} className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search transmissions…"
                className="pl-10 pr-10 h-12 text-base"
                autoFocus
                data-testid="input-search-page"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => { setInputVal(""); navigate("/search"); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                  data-testid="button-clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Prompt state — no query yet */}
          {!urlQ && (
            <div
              className="text-center py-28 border border-border rounded-md"
              data-testid="text-search-prompt"
            >
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-xl text-muted-foreground">
                Type something above to search transmissions.
              </p>
            </div>
          )}

          {/* Results section */}
          {urlQ && (
            <>
              {/* Category filter pills (derived from actual unfiltered results) */}
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
                          "px-4 py-1.5 text-xs rounded-sm border transition-colors font-medium tracking-wide",
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
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
                      className="px-4 py-1.5 text-xs rounded-sm border border-dashed border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" /> Clear filter
                    </button>
                  )}
                </div>
              )}

              {/* Result count */}
              {!isLoading && results && (
                <p className="text-sm text-muted-foreground mb-6" data-testid="text-results-count">
                  {results.length === 0
                    ? `No transmissions found for "${urlQ}"${urlCategory ? ` in ${urlCategory}` : ""}`
                    : `${results.length} transmission${results.length === 1 ? "" : "s"} for "${urlQ}"${urlCategory ? ` · ${urlCategory}` : ""}`}
                </p>
              )}

              {/* Loading skeletons */}
              {isLoading && (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
                  data-testid="search-loading"
                >
                  {[1, 2, 3].map((i) => (
                    <SkeletonPostCard key={i} />
                  ))}
                </div>
              )}

              {/* Results grid */}
              {!isLoading && results && results.length > 0 && (
                <div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
                  data-testid="search-results"
                >
                  {results.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {/* Empty results */}
              {!isLoading && results && results.length === 0 && (
                <div
                  className="text-center py-24 border border-border rounded-md"
                  data-testid="text-no-results"
                >
                  <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h2 className="text-2xl font-display font-bold mb-2">No Results Found</h2>
                  <p className="text-muted-foreground mb-6">
                    {urlCategory ? (
                      <>
                        Nothing in <strong>{urlCategory}</strong> matches that query.{" "}
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
                      "Try searching with different keywords."
                    )}
                  </p>
                  <Link href="/">
                    <Button variant="default" data-testid="button-browse-all">
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
