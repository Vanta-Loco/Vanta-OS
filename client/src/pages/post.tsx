import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Share2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { Post } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function PostPage() {
  const [, params] = useRoute("/post/:id");
  const { toast } = useToast();

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/posts", params?.id],
    enabled: !!params?.id,
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Post link has been copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-12 w-48 bg-muted rounded mb-4" />
            <div className="h-6 w-32 bg-muted rounded" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold mb-4" data-testid="text-not-found">
              Post Not Found
            </h1>
            <Link href="/" data-testid="link-back-home">
              <Button variant="default">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <article className="flex-1 bg-background pt-20">
        <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            data-testid="img-post-cover"
          />
          <div className="absolute inset-0 hero-gradient-overlay" />

          <div className="absolute bottom-0 left-0 right-0">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-12 md:pb-16">
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <Badge
                  variant="outline"
                  className="uppercase tracking-wide font-medium"
                  data-testid="badge-category"
                >
                  {post.category}
                </Badge>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-date">
                    {format(new Date(post.createdAt), "MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span data-testid="text-readtime">{post.readTime}</span>
                </div>
              </div>

              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight max-w-4xl"
                data-testid="text-title"
              >
                {post.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 lg:px-8 mt-16">
          <div className="flex items-center justify-between mb-12">
            <Link href="/" data-testid="link-back">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              data-testid="button-share"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <div
            className="prose prose-lg max-w-none mb-16"
            data-testid="text-content"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />

          {post.images && post.images.length > 0 && (
            <div className="mb-16">
              <div
                className={`grid gap-4 ${
                  post.images.length === 1
                    ? "grid-cols-1"
                    : post.images.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2 md:grid-cols-3"
                }`}
              >
                {post.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square overflow-hidden rounded-lg"
                  >
                    <img
                      src={img}
                      alt={`Gallery image ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      data-testid={`img-gallery-${idx}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <Footer />
    </div>
  );
}
