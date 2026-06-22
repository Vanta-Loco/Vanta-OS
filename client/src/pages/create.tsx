import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { insertPostSchema, type InsertPost } from "@shared/schema";
import { CoverImagePositionPicker } from "@/components/cover-image-position-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const categories = [
  "Music Production",
  "Behind the Scenes",
  "Lifestyle",
  "Studio Sessions",
  "Creative Process",
  "Release",
];

export default function CreatePost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/admin/login?from=/create");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const form = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      coverImage: "",
      coverImagePosition: "50% 50%",
      images: [],
      category: "",
      readTime: "5 min read",
      featured: "false",
      musicUrl: "",
    },
  });

  const createPost = useMutation({
    mutationFn: async (data: InsertPost) => {
      return await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success!",
        description: "Transmission published.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to publish transmission. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCoverImagePreview(dataUrl);
        form.setValue("coverImage", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const readers = files.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((dataUrls) => {
      setGalleryPreviews((prev) => [...prev, ...dataUrls]);
      form.setValue("images", [...(form.getValues("images") || []), ...dataUrls]);
    });
  };

  const removeGalleryImage = (index: number) => {
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    setGalleryPreviews(newPreviews);
    form.setValue("images", newPreviews);
  };

  const onSubmit = (data: InsertPost) => {
    createPost.mutate({ ...data, featured: isFeatured ? "true" : "false" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" data-testid="link-back">
              <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
            <h1
              className="text-4xl md:text-5xl font-display font-bold mb-4"
              data-testid="text-page-title"
            >
              New Transmission
            </h1>
            <p className="text-lg text-muted-foreground">
              Share your music journey, lifestyle moments, and creative process.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="p-6 md:p-8">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title" className="text-base font-medium mb-2">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter post title..."
                    {...form.register("title")}
                    className="text-lg"
                    data-testid="input-title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="excerpt" className="text-base font-medium mb-2">
                    Excerpt *
                  </Label>
                  <Textarea
                    id="excerpt"
                    placeholder="Brief summary of your post..."
                    {...form.register("excerpt")}
                    rows={3}
                    data-testid="input-excerpt"
                  />
                  {form.formState.errors.excerpt && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.excerpt.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category" className="text-base font-medium mb-2">
                      Category *
                    </Label>
                    <Select
                      onValueChange={(value) => form.setValue("category", value)}
                      defaultValue={form.getValues("category")}
                    >
                      <SelectTrigger id="category" data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat} data-testid={`option-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.category.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="readTime" className="text-base font-medium mb-2">
                      Read Time
                    </Label>
                    <Input
                      id="readTime"
                      placeholder="e.g., 5 min read"
                      {...form.register("readTime")}
                      data-testid="input-readtime"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="musicUrl" className="text-base font-medium mb-2">
                    Music URL <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="musicUrl"
                    placeholder="Spotify, YouTube, or SoundCloud link"
                    {...form.register("musicUrl")}
                    data-testid="input-music-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste a Spotify track/album, YouTube video, or SoundCloud URL to embed a player.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label htmlFor="featured" className="text-base font-medium">
                      Featured Transmission
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Display this transmission prominently on the homepage
                    </p>
                  </div>
                  <Switch
                    id="featured"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                    data-testid="switch-featured"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium mb-2">
                    Cover Image *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Main image for your post
                  </p>

                  {!coverImagePreview ? (
                    <label
                      htmlFor="coverImage"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover-elevate transition-colors"
                      data-testid="label-cover-upload"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-medium">Click to upload</span> cover
                          image
                        </p>
                      </div>
                      <input
                        id="coverImage"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        data-testid="input-cover-image"
                      />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          style={{ objectPosition: form.watch("coverImagePosition") || "50% 50%" }}
                          data-testid="img-cover-preview"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setCoverImagePreview("");
                            form.setValue("coverImage", "");
                            form.setValue("coverImagePosition", "50% 50%");
                          }}
                          data-testid="button-remove-cover"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <CoverImagePositionPicker
                        value={form.watch("coverImagePosition") || "50% 50%"}
                        onChange={(val) => form.setValue("coverImagePosition", val)}
                      />
                    </div>
                  )}
                  {form.formState.errors.coverImage && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.coverImage.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-medium mb-2">
                    Gallery Images (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Additional images to display in the post
                  </p>

                  <label
                    htmlFor="galleryImages"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover-elevate transition-colors mb-4"
                    data-testid="label-gallery-upload"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Click to add</span> gallery images
                      </p>
                    </div>
                    <input
                      id="galleryImages"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryImagesChange}
                      data-testid="input-gallery-images"
                    />
                  </label>

                  {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {galleryPreviews.map((preview, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-lg overflow-hidden"
                        >
                          <img
                            src={preview}
                            alt={`Gallery ${idx + 1}`}
                            className="w-full h-full object-cover"
                            data-testid={`img-gallery-preview-${idx}`}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => removeGalleryImage(idx)}
                            data-testid={`button-remove-gallery-${idx}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 md:p-8">
              <div>
                <Label htmlFor="content" className="text-base font-medium mb-2">
                  Content *
                </Label>
                <Textarea
                  id="content"
                  placeholder="Write your post content here..."
                  {...form.register("content")}
                  rows={12}
                  className="text-base leading-relaxed"
                  data-testid="input-content"
                />
                {form.formState.errors.content && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.content.message}
                  </p>
                )}
              </div>
            </Card>

            <div className="flex items-center justify-end gap-4">
              <Link href="/" data-testid="link-cancel">
                <Button type="button" variant="ghost" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createPost.isPending}
                data-testid="button-publish"
              >
                {createPost.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Transmission"
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
