import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { insertReleaseSchema, type InsertRelease } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ReleasesNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertRelease>({
    resolver: zodResolver(insertReleaseSchema),
    defaultValues: {
      title: "",
      type: "single",
      coverImage: "",
      description: "",
      releaseDate: "",
      spotifyUrl: "",
      appleMusicUrl: "",
      soundcloudUrl: "",
      youtubeUrl: "",
      audioPreviewUrl: "",
      tracklist: [],
      featured: "false",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: InsertRelease) =>
      apiRequest("POST", "/api/releases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({ title: "Release added." });
      navigate("/releases");
    },
    onError: () => {
      toast({ title: "Failed to add release.", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertRelease) => {
    const tracklistRaw = (data as any)._tracklistRaw as string | undefined;
    const tracklist = tracklistRaw
      ? tracklistRaw.split("\n").map((t: string) => t.trim()).filter(Boolean)
      : [];
    mutate({ ...data, tracklist });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background pt-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-16 md:py-24">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
              Discography
            </p>
            <h1 className="text-4xl md:text-5xl font-display font-bold" data-testid="text-new-release-title">
              Add Release
            </h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Release title" {...field} data-testid="input-release-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-release-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="ep">EP</SelectItem>
                          <SelectItem value="album">Album</SelectItem>
                          <SelectItem value="mixtape">Mixtape</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="releaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Release Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-release-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Featured</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-release-featured">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-cover-image" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this release..."
                        className="min-h-[120px]"
                        {...field}
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <p className="text-sm font-medium">Streaming Links (optional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "spotifyUrl" as const, label: "Spotify URL", testId: "input-spotify" },
                    { name: "appleMusicUrl" as const, label: "Apple Music URL", testId: "input-apple" },
                    { name: "soundcloudUrl" as const, label: "SoundCloud URL", testId: "input-soundcloud" },
                    { name: "youtubeUrl" as const, label: "YouTube URL", testId: "input-youtube" },
                  ].map(({ name, label, testId }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} data-testid={testId} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="audioPreviewUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audio Preview URL (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://... (mp3 or audio file)" {...field} data-testid="input-audio-preview" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Tracklist (optional — one track per line)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={"01. Track Name\n02. Track Name\n03. Track Name"}
                    className="min-h-[120px] font-mono text-sm"
                    data-testid="textarea-tracklist"
                    {...form.register("_tracklistRaw" as any)}
                  />
                </FormControl>
              </FormItem>

              <div className="flex gap-4 pt-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-submit-release"
                >
                  {isPending ? "Saving..." : "Add Release"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/releases")}
                  data-testid="button-cancel-release"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
