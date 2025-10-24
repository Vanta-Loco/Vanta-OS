import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/post-card";
import { SkeletonPostCard } from "@/components/skeleton-post-card";
import type { Post } from "@shared/schema";
import heroImage from "@assets/generated_images/Music_studio_lifestyle_hero_cf7ae2f2.png";

export default function Home() {
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const featuredPost = posts?.find((p) => p.featured === 'true');
  const regularPosts = posts?.filter((p) => p.featured !== 'true') || [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="relative h-[85vh] min-h-[600px] flex items-end overflow-hidden">
        <img
          src={heroImage}
          alt="Vanta Cold Studio"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient-overlay" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pb-16 md:pb-24 z-10">
          <div className="max-w-4xl">
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-6 leading-tight"
              data-testid="text-hero-title"
            >
              The Music Journey
            </h1>
            <p
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              Documenting the creative process, lifestyle moments, and the path
              of building Vanta Cold from the ground up.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 md:py-24">
          {featuredPost && (
            <section className="mb-16">
              <h2
                className="text-3xl md:text-4xl font-display font-bold mb-8"
                data-testid="text-featured-heading"
              >
                Featured
              </h2>
              <PostCard post={featuredPost} featured />
            </section>
          )}

          <section>
            <h2
              className="text-3xl md:text-4xl font-display font-bold mb-8"
              data-testid="text-latest-heading"
            >
              {featuredPost ? "Latest Posts" : "All Posts"}
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonPostCard key={i} />
                ))}
              </div>
            ) : regularPosts.length === 0 ? (
              <div className="text-center py-24">
                <p
                  className="text-xl text-muted-foreground"
                  data-testid="text-no-posts"
                >
                  No posts yet. Start creating your music journey.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {regularPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
