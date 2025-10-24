import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { Link } from "wouter";
import type { Post } from "@shared/schema";
import { format } from "date-fns";

interface PostCardProps {
  post: Post;
  featured?: boolean;
}

export function PostCard({ post, featured = false }: PostCardProps) {
  return (
    <Link href={`/post/${post.id}`} data-testid={`link-post-${post.id}`}>
      <Card
        className={`group overflow-hidden cursor-pointer hover-elevate transition-all duration-300 ${
          featured ? "md:col-span-2 md:row-span-2" : ""
        }`}
      >
        <div className="relative overflow-hidden">
          <div className={`relative ${featured ? "aspect-[16/9]" : "aspect-[4/5]"} overflow-hidden`}>
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              data-testid={`img-post-${post.id}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            {post.featured === 'true' && (
              <Badge
                variant="secondary"
                className="mb-3 uppercase text-xs tracking-wide font-medium"
                data-testid={`badge-featured-${post.id}`}
              >
                Featured
              </Badge>
            )}

            <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className="uppercase tracking-wide font-medium"
                data-testid={`badge-category-${post.id}`}
              >
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

            <h3
              className={`font-display font-bold text-foreground mb-2 line-clamp-2 ${
                featured ? "text-3xl md:text-4xl" : "text-xl"
              }`}
              data-testid={`text-title-${post.id}`}
            >
              {post.title}
            </h3>

            <p
              className={`text-muted-foreground line-clamp-2 ${
                featured ? "text-lg" : "text-base"
              }`}
              data-testid={`text-excerpt-${post.id}`}
            >
              {post.excerpt}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
