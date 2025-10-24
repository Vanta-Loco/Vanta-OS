import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Search as SearchIcon } from "lucide-react";
import { Link } from "wouter";
import type { Post } from "@shared/schema";
import { format } from "date-fns";
import { useState, useEffect } from "react";

const categories = [
  "All Categories",
  "Music Production",
  "Behind the Scenes",
  "Lifestyle",
  "Studio Sessions",
  "Creative Process",
  "Release",
];

export default function SearchPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchStr, setSearchStr] = useState(window.location.search);
  
  useEffect(() => {
    const handleLocationChange = () => {
      setSearchStr(window.location.search);
      setSelectedCategory("All Categories");
    };
    
    handleLocationChange();
    
    window.addEventListener("popstate", handleLocationChange);
    
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };
    
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.history.pushState = originalPushState;
    };
  }, []);
  
  const searchParams = new URLSearchParams(searchStr);
  const query = searchParams.get("q") || "";

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts/search", query, selectedCategory !== "All Categories" ? selectedCategory : undefined],
    queryFn: async () => {
      if (!query) return [];
      const params = new URLSearchParams({ q: query });
      if (selectedCategory !== "All Categories") {
        params.set("category", selectedCategory);
      }
      const response = await fetch(`/api/posts/search?${params}`);
      if (!response.ok) throw new Error("Failed to search posts");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <SearchIcon className="w-8 h-8 text-muted-foreground" />
              <h1 className="text-4xl font-display font-bold" data-testid="text-page-title">
                Search Results
              </h1>
            </div>
            <p className="text-lg text-muted-foreground mb-6">
              {query && (
                <>
                  Showing results for <span className="font-semibold text-foreground" data-testid="text-search-query">"{query}"</span>
                </>
              )}
            </p>

            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64" data-testid="select-category-filter">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} data-testid={`option-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-lg mb-4" />
                  <div className="h-6 bg-muted rounded mb-2 w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6" data-testid="text-results-count">
                Found {posts.length} {posts.length === 1 ? "post" : "posts"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link key={post.id} href={`/post/${post.id}`} data-testid={`link-post-${post.id}`}>
                    <article className="group hover-elevate rounded-lg overflow-hidden transition-all duration-300 border border-border h-full flex flex-col">
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          data-testid={`img-cover-${post.id}`}
                        />
                        {post.featured === "true" && (
                          <Badge
                            variant="default"
                            className="absolute top-4 left-4"
                            data-testid={`badge-featured-${post.id}`}
                          >
                            Featured
                          </Badge>
                        )}
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <Badge variant="secondary" data-testid={`badge-category-${post.id}`}>
                            {post.category}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span data-testid={`text-date-${post.id}`}>
                              {format(new Date(post.createdAt), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span data-testid={`text-readtime-${post.id}`}>{post.readTime}</span>
                          </div>
                        </div>

                        <h2
                          className="text-xl font-display font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2"
                          data-testid={`text-title-${post.id}`}
                        >
                          {post.title}
                        </h2>

                        <p
                          className="text-muted-foreground text-sm line-clamp-3 flex-1"
                          data-testid={`text-excerpt-${post.id}`}
                        >
                          {post.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16" data-testid="text-no-results">
              <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-display font-bold mb-2">No Results Found</h2>
              <p className="text-muted-foreground mb-6">
                Try searching with different keywords or browse all posts
              </p>
              <Link href="/">
                <Button variant="default" data-testid="button-browse-all">
                  Browse All Posts
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
