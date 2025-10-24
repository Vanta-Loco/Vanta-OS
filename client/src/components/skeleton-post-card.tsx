import { Card } from "@/components/ui/card";

export function SkeletonPostCard({ featured = false }: { featured?: boolean }) {
  return (
    <Card
      className={`overflow-hidden ${
        featured ? "md:col-span-2 md:row-span-2" : ""
      }`}
    >
      <div className="relative">
        <div
          className={`relative ${
            featured ? "aspect-[16/9]" : "aspect-[4/5]"
          } bg-muted animate-pulse shimmer`}
        />

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="h-5 w-20 bg-muted rounded-full mb-3 animate-pulse" />

          <div className="flex items-center gap-4 mb-2">
            <div className="h-4 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>

          <div className={`space-y-2 mb-2`}>
            <div
              className={`h-6 bg-muted rounded animate-pulse ${
                featured ? "w-3/4" : "w-full"
              }`}
            />
            <div className="h-6 w-1/2 bg-muted rounded animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </Card>
  );
}
