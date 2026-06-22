import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Clock, Link2, Check, ArrowLeft, Edit, Trash2, Twitter, Facebook, Linkedin } from "lucide-react";
import { Link } from "wouter";
import type { Post } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/use-admin";
import { MusicPlayer } from "@/components/music-player";

// ── Dynamic Open Graph meta helper ────────────────────────────────────────────
function useOpenGraph(post: Post | undefined) {
  useEffect(() => {
    if (!post) return;
    const url = window.location.href;
    const set = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setName = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    document.title = `${post.title} — Vanta Cold`;
    setName("description", post.excerpt);
    set("og:title", post.title);
    set("og:description", post.excerpt);
    set("og:type", "article");
    set("og:url", url);
    set("og:image", post.coverImage);
    set("twitter:card", "summary_large_image");
    set("twitter:title", post.title);
    set("twitter:description", post.excerpt);
    set("twitter:image", post.coverImage);
    return () => {
      document.title = "Vanta Cold - Music Journey & Lifestyle";
    };
  }, [post]);
}

// ── Share buttons component ────────────────────────────────────────────────────
function ShareButtons({ post }: { post: Post }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const text = encodeURIComponent(`${post.title} — Vanta Cold`);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    {
      label: "Share on X",
      Icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      testId: "button-share-twitter",
    },
    {
      label: "Share on Facebook",
      Icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      testId: "button-share-facebook",
    },
    {
      label: "Share on LinkedIn",
      Icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      testId: "button-share-linkedin",
    },
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="div-share-buttons">
      {links.map(({ label, Icon, href, testId }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          data-testid={testId}
        >
          <Button variant="outline" size="icon" title={label}>
            <Icon className="w-4 h-4" />
          </Button>
        </a>
      ))}
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopy}
        title="Copy link"
        data-testid="button-share-copy"
        aria-label="Copy link"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export default function PostPage() {
  const [, params] = useRoute("/post/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated: isAdmin } = useAdmin();

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/posts", params?.id],
    enabled: !!params?.id,
  });

  useOpenGraph(post);

  const deletePost = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/posts/${params?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success!",
        description: "Transmission deleted.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    },
  });

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
              Transmission Not Found
            </h1>
            <Link href="/" data-testid="link-back-home">
              <Button variant="default" data-testid="button-back-home">
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
            style={{ objectPosition: post.coverImagePosition || "50% 50%" }}
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
          <div className="flex items-center justify-between mb-12 gap-4 flex-wrap">
            <Link href="/" data-testid="link-back">
              <Button variant="ghost" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <>
                  <Link href={`/edit/${post.id}`} data-testid="link-edit">
                    <Button variant="ghost" size="icon" data-testid="button-edit" aria-label="Edit post">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="button-delete"
                        aria-label="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Transmission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this transmission? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deletePost.mutate()}
                          data-testid="button-delete-confirm"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              <ShareButtons post={post} />
            </div>
          </div>

          <div
            className="prose prose-lg max-w-none mb-12"
            data-testid="text-content"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
          />

          {post.musicUrl && (
            <div className="mb-12">
              <MusicPlayer url={post.musicUrl} />
            </div>
          )}

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
