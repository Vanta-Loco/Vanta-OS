import { useState, useEffect, useRef } from "react";
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
import { CoverImagePositionPicker } from "@/components/cover-image-position-picker";
import { ImageLayoutPicker, type ImageLayout, getImageLayout } from "@/components/image-layout-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAdminToken, queryClient } from "@/lib/queryClient";
import { useAdmin } from "@/hooks/use-admin";

const categories = [
  "Music Production",
  "Behind the Scenes",
  "Lifestyle",
  "Studio Sessions",
  "Creative Process",
  "Release",
];

const MAX_GALLERY_IMAGES = 4;

async function uploadFile(file: File, materialize = false): Promise<string> {
  let fileForUpload = file;
  if (materialize) {
    if (import.meta.env.DEV) {
      console.debug("[gallery-upload] selected file", {
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }
    try {
      const bytes = await file.arrayBuffer();
      fileForUpload = new File([bytes], file.name || "photo-upload", {
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now(),
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.debug("[gallery-upload] file materialization failed", error);
      }
      throw new Error("The selected photo could not be read from your photo library.");
    }
  }

  const formData = new FormData();
  formData.append("file", fileForUpload);
  const token = getAdminToken();
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: token ? { "X-Admin-Token": token } : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const responseBody = result.error || result.message || "Upload failed.";
    if (materialize) {
      throw new Error(
        `${responseBody} (original size: ${file.size} bytes; materialized size: ${fileForUpload.size} bytes; MIME: ${fileForUpload.type || "(empty)"}; status: ${response.status})`,
      );
    }
    throw new Error(responseBody);
  }
  if (typeof result.url !== "string") throw new Error("Upload did not return an image URL.");
  return result.url as string;
}

export default function EditPost() {
  const [, params] = useRoute("/edit/:id");
  const postId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAdmin();
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [galleryLayouts, setGalleryLayouts] = useState<ImageLayout[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const originalCoverImage = useRef("");
  const originalImages = useRef<string[]>([]);
  const originalImageLayouts = useRef<ImageLayout[]>([]);

  // Guard: redirect to login, preserving the edit URL so the user lands back here
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/admin/login?from=/edit/${postId ?? ""}`);
    }
  }, [isAuthenticated, authLoading, navigate, postId]);

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
      coverImagePosition: "50% 50%",
      images: [],
      category: "",
      readTime: "5 min read",
      featured: "false",
      musicUrl: "",
      imageLayout: "original",
    },
  });

  useEffect(() => {
    if (post) {
      const imageLayouts = post.images.map((_, index) => getImageLayout(post.imageLayouts?.[index]).value);
      form.reset({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        coverImagePosition: post.coverImagePosition || "50% 50%",
        images: post.images,
        imageLayouts,
        category: post.category,
        readTime: post.readTime,
        featured: post.featured,
        musicUrl: post.musicUrl ?? "",
        imageLayout: getImageLayout(post.imageLayout).value,
      });
      setCoverImagePreview(post.coverImage);
      setGalleryPreviews(post.images);
      setGalleryLayouts(imageLayouts);
      originalCoverImage.current = post.coverImage;
      originalImages.current = post.images;
      originalImageLayouts.current = imageLayouts;
      setIsFeatured(post.featured === "true");
    }
  }, [post, form]);

  const updatePost = useMutation({
    mutationFn: async (data: Partial<InsertPost>) => {
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

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    try {
      const url = await uploadFile(file);
      setCoverImagePreview(url);
      form.setValue("coverImage", url, { shouldValidate: true });
    } catch (error) {
      toast({
        title: "Image upload failed.",
        description: error instanceof Error ? error.message : "Try exporting it as JPEG, PNG, or WebP.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingMedia(false);
      e.target.value = "";
    }
  };

  const handleGalleryImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.currentTarget.files ?? []);
    if (selectedFiles.length === 0) return;

    const existingImages = form.getValues("images") || [];
    const remainingSlots = MAX_GALLERY_IMAGES - existingImages.length;
    if (remainingSlots <= 0) {
      toast({ title: "Gallery limit reached.", description: "A post can contain up to 4 gallery images." });
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);
    if (filesToUpload.length < selectedFiles.length) {
      toast({
        title: "Gallery limited to 4 images.",
        description: `Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} will be added.`,
      });
    }

    setIsUploadingMedia(true);
    try {
      let nextImages = [...existingImages];
      let nextLayouts = [...(form.getValues("imageLayouts") || [])];
      for (const file of filesToUpload) {
        const url = await uploadFile(file, true);
        nextImages = [...nextImages, url];
        nextLayouts = [...nextLayouts, "original"];
        setGalleryPreviews(nextImages);
        setGalleryLayouts(nextLayouts);
        form.setValue("images", nextImages);
        form.setValue("imageLayouts", nextLayouts);
      }
    } catch (error) {
      toast({
        title: "Gallery image upload failed.",
        description: error instanceof Error ? error.message : "Try exporting it as JPEG, PNG, or WebP.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingMedia(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const removeGalleryImage = (index: number) => {
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    const newLayouts = galleryLayouts.filter((_, i) => i !== index);
    setGalleryPreviews(newPreviews);
    setGalleryLayouts(newLayouts);
    form.setValue("images", newPreviews);
    form.setValue("imageLayouts", newLayouts);
  };

  const setGalleryImageLayout = (index: number, layout: ImageLayout) => {
    const nextLayouts = [...galleryLayouts];
    nextLayouts[index] = layout;
    setGalleryLayouts(nextLayouts);
    form.setValue("imageLayouts", nextLayouts);
  };

  const onSubmit = (data: InsertPost) => {
    const payload: Partial<InsertPost> = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      coverImagePosition: data.coverImagePosition,
      category: data.category,
      readTime: data.readTime,
      featured: isFeatured ? "true" : "false",
      musicUrl: data.musicUrl,
      imageLayout: data.imageLayout,
    };
    if (data.coverImage !== originalCoverImage.current) payload.coverImage = data.coverImage;
    const imagesChanged = JSON.stringify(data.images || []) !== JSON.stringify(originalImages.current);
    const imageLayoutsChanged = JSON.stringify(data.imageLayouts || []) !== JSON.stringify(originalImageLayouts.current);
    if (imagesChanged) {
      payload.images = data.images || [];
      payload.imageLayouts = data.imageLayouts || [];
    } else if (imageLayoutsChanged) {
      payload.imageLayouts = data.imageLayouts || [];
    }
    updatePost.mutate(payload);
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

                <div>
                  <Label htmlFor="musicUrl" data-testid="label-music-url">
                    Music URL <span className="text-muted-foreground font-normal text-sm">(optional)</span>
                  </Label>
                  <Input
                    id="musicUrl"
                    {...form.register("musicUrl")}
                    placeholder="Spotify, YouTube, or SoundCloud link"
                    className="mt-2"
                    data-testid="input-music-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste a Spotify track/album, YouTube video, or SoundCloud URL to embed a player.
                  </p>
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
                    <div className="space-y-4">
                      <div className="relative">
                        <div className={`overflow-hidden rounded-md ${getImageLayout(form.watch("imageLayout")).value === "original" ? "max-h-[28rem]" : getImageLayout(form.watch("imageLayout")).className}`}>
                        <img
                          src={coverImagePreview}
                          alt="Cover preview"
                          className={`w-full ${getImageLayout(form.watch("imageLayout")).value === "original" ? "h-auto max-h-[28rem] object-contain" : "h-full object-cover"}`}
                          style={{ objectPosition: form.watch("coverImagePosition") || "50% 50%" }}
                          data-testid="img-cover-preview"
                        />
                        </div>
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
                      <ImageLayoutPicker
                        value={form.watch("imageLayout") || "original"}
                        onChange={(value: ImageLayout) => form.setValue("imageLayout", value)}
                      />
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
                        accept="image/*,.heic,.heif,.avif"
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
                  <div className="flex items-center justify-between gap-4">
                    <Label data-testid="label-gallery">
                      Gallery Images (Optional)
                    </Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-gallery-count">
                      {galleryPreviews.length} / {MAX_GALLERY_IMAGES} images
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add additional images to create a gallery
                  </p>

                  {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {galleryPreviews.map((preview, index) => {
                        const layout = getImageLayout(galleryLayouts[index]);
                        return (
                        <div key={index} className="relative group overflow-visible">
                          <div className={`relative overflow-hidden rounded-md ${layout.value === "original" ? "max-h-40" : layout.className}`}>
                            <img
                              src={preview}
                              alt={`Gallery ${index + 1}`}
                              className={`w-full ${layout.value === "original" ? "h-auto max-h-40 object-contain" : "h-full object-cover"}`}
                              data-testid={`img-gallery-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 z-20 opacity-100 shadow-md"
                            onClick={() => removeGalleryImage(index)}
                            data-testid={`button-remove-gallery-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <div className="mt-3">
                            <ImageLayoutPicker
                              value={layout.value}
                              onChange={(value) => setGalleryImageLayout(index, value)}
                            />
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                  {galleryPreviews.length < MAX_GALLERY_IMAGES && (
                    <label
                      className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-md hover-elevate cursor-pointer ${isUploadingMedia ? "opacity-60 pointer-events-none" : ""}`}
                      aria-disabled={isUploadingMedia}
                      data-testid="label-gallery-upload"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold">Add images</span> to gallery
                        </p>
                      </div>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        disabled={isUploadingMedia}
                        onChange={handleGalleryImagesChange}
                        data-testid="input-gallery-upload"
                      />
                    </label>
                  )}
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
                disabled={updatePost.isPending || isUploadingMedia}
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
