import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
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
import { insertPostSchema, type InsertPost, type Post } from "@shared/schema";
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

export default function EditPost() {
  const [, params] = useRoute("/edit/:id");
  const postId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/posts", postId],
    enabled: !!postId,
  });

  const form = useForm<InsertPost>({
    resolver: zodResolver(insertPostSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      coverImage: "",
      images: [],
      category: "",
      readTime: "5 min read",
      featured: "false",
    },
  });

  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        images: post.images,
        category: post.category,
        readTime: post.readTime,
        featured: post.featured,
      });
      setCoverImagePreview(post.coverImage);
      setGalleryPreviews(post.images);
      setIsFeatured(post.featured === "true");
    }
  }, [post, form]);

  const updatePost = useMutation({
    mutationFn: async (data: InsertPost) => {
      return await apiRequest("PATCH", `/api/posts/${postId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", postId] });
      toast({
        title: "Success!",
        description: "Your post has been updated.",
      });
      navigate(`/post/${postId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update post. Please try again.",
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
    updatePost.mutate({ ...data, featured: isFeatured ? "true" : "false" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background pt-24">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-display font-bold mb-4" data-testid="text-not-found">
                Post Not Found
              </h1>
              <Link href="/" data-testid="link-back-home">
                <Button variant="default" data-testid="button-back-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="mb-8">
            <Link href={`/post/${postId}`} data-testid="link-back">
              <Button variant="ghost" className="gap-2 mb-4" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                Back to Post
              </Button>
            </Link>
            <h1
              className="text-4xl md:text-5xl font-display font-bold mb-4"
              data-testid="text-page-title"
            >
              Edit Post
            </h1>
            <p className="text-lg text-muted-foreground">
              Update your blog post with the latest content and images.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title" data-testid="label-title">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Enter post title"
                    className="mt-2"
                    data-testid="input-title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="excerpt" data-testid="label-excerpt">
                    Excerpt *
                  </Label>
                  <Textarea
                    id="excerpt"
                    {...form.register("excerpt")}
                    placeholder="Brief description of your post"
                    rows={3}
                    className="mt-2"
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
                    <Label htmlFor="category" data-testid="label-category">
                      Category *
                    </Label>
                    <Select
                      value={form.watch("category")}
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger id="category" className="mt-2" data-testid="select-category">
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
                    <Label htmlFor="readTime" data-testid="label-read-time">
                      Read Time
                    </Label>
                    <Input
                      id="readTime"
                      {...form.register("readTime")}
                      placeholder="e.g., 5 min read"
                      className="mt-2"
                      data-testid="input-read-time"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                  <div>
                    <Label htmlFor="featured" className="text-base" data-testid="label-featured">
                      Featured Post
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Display this post prominently on the homepage
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

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label data-testid="label-cover-image">
                    Cover Image *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a high-quality image for your post header
                  </p>

                  {coverImagePreview ? (
                    <div className="relative">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-64 object-cover rounded-md"
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
                        }}
                        data-testid="button-remove-cover"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-md hover-elevate cursor-pointer"
                      data-testid="label-cover-upload"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverImageChange}
                        data-testid="input-cover-upload"
                      />
                    </label>
                  )}
                  {form.formState.errors.coverImage && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.coverImage.message}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content" data-testid="label-content">
                    Content *
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Write your post content with full formatting support
                  </p>
                  <Textarea
                    id="content"
                    {...form.register("content")}
                    placeholder="Write your story..."
                    rows={20}
                    className="font-mono text-sm"
                    data-testid="input-content"
                  />
                  {form.formState.errors.content && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.content.message}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label data-testid="label-gallery">
                    Gallery Images (Optional)
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add additional images to create a gallery
                  </p>

                  {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {galleryPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                            data-testid={`img-gallery-${index}`}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeGalleryImage(index)}
                            data-testid={`button-remove-gallery-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-md hover-elevate cursor-pointer"
                    data-testid="label-gallery-upload"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Add images</span> to gallery
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryImagesChange}
                      data-testid="input-gallery-upload"
                    />
                  </label>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-end gap-4">
              <Link href={`/post/${postId}`} data-testid="link-cancel">
                <Button type="button" variant="ghost" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={updatePost.isPending}
                data-testid="button-update"
              >
                {updatePost.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Post"
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
