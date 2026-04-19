import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
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
import { insertReleaseSchema, type InsertRelease, type Release } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Music, Play, Square, CheckCircle, Loader2, X, ArrowLeft, Trash2,
} from "lucide-react";
import { Link } from "wouter";

type UploadState = "idle" | "uploading" | "done" | "error";

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

export default function ReleasesEdit() {
  const [, params] = useRoute("/releases/edit/:id");
  const releaseId = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [coverUploadState, setCoverUploadState] = useState<UploadState>("idle");
  const [coverFileName, setCoverFileName] = useState("");
  const [audioUploadState, setAudioUploadState] = useState<UploadState>("idle");
  const [audioFileName, setAudioFileName] = useState("");
  const audioTestRef = useRef<HTMLAudioElement | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: release, isLoading } = useQuery<Release>({
    queryKey: ["/api/releases", releaseId],
    enabled: !!releaseId,
  });

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
      audioFileUrl: "",
      previewStartSeconds: 0,
      previewDurationSeconds: 30,
      tracklist: [],
      featured: "false",
    },
  });

  useEffect(() => {
    if (release) {
      form.reset({
        title: release.title,
        type: release.type as InsertRelease["type"],
        coverImage: release.coverImage,
        description: release.description,
        releaseDate: release.releaseDate,
        spotifyUrl: release.spotifyUrl,
        appleMusicUrl: release.appleMusicUrl,
        soundcloudUrl: release.soundcloudUrl,
        youtubeUrl: release.youtubeUrl,
        audioPreviewUrl: release.audioPreviewUrl,
        audioFileUrl: release.audioFileUrl,
        previewStartSeconds: release.previewStartSeconds,
        previewDurationSeconds: release.previewDurationSeconds,
        featured: release.featured,
        tracklist: release.tracklist,
      });

      if (release.coverImage?.startsWith("/uploads/")) {
        setCoverUploadState("done");
        setCoverFileName(release.coverImage.split("/").pop() || "uploaded file");
      }
      if (release.audioFileUrl?.startsWith("/uploads/")) {
        setAudioUploadState("done");
        setAudioFileName(release.audioFileUrl.split("/").pop() || "uploaded file");
      }
    }
  }, [release, form]);

  async function handleCoverFile(file: File) {
    setCoverUploadState("uploading");
    setCoverFileName(file.name);
    try {
      const url = await uploadFile(file);
      form.setValue("coverImage", url, { shouldValidate: true });
      setCoverUploadState("done");
    } catch {
      setCoverUploadState("error");
      toast({ title: "Image upload failed.", variant: "destructive" });
    }
  }

  async function handleAudioFile(file: File) {
    setAudioUploadState("uploading");
    setAudioFileName(file.name);
    try {
      const url = await uploadFile(file);
      form.setValue("audioFileUrl", url, { shouldValidate: true });
      setAudioUploadState("done");
    } catch {
      setAudioUploadState("error");
      toast({ title: "Audio upload failed.", variant: "destructive" });
    }
  }

  function testSnippet() {
    if (isTesting) {
      audioTestRef.current?.pause();
      setIsTesting(false);
      return;
    }
    const audioSrc = form.getValues("audioFileUrl") || form.getValues("audioPreviewUrl");
    if (!audioSrc) return;
    const startSec = form.getValues("previewStartSeconds") ?? 0;
    const durationSec = form.getValues("previewDurationSeconds") ?? 30;
    const audio = new Audio(audioSrc);
    audioTestRef.current = audio;
    audio.currentTime = startSec;
    audio.play();
    setIsTesting(true);
    const timer = setTimeout(() => { audio.pause(); setIsTesting(false); }, durationSec * 1000);
    audio.addEventListener("ended", () => { clearTimeout(timer); setIsTesting(false); });
  }

  const updateMutation = useMutation({
    mutationFn: (data: InsertRelease) =>
      apiRequest("PATCH", `/api/releases/${releaseId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId] });
      toast({ title: "Release updated." });
      navigate("/admin");
    },
    onError: () => toast({ title: "Update failed.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/releases/${releaseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({ title: "Release deleted." });
      navigate("/admin");
    },
    onError: () => toast({ title: "Delete failed.", variant: "destructive" }),
  });

  const onSubmit = (data: InsertRelease) => {
    const raw = (data as any)._tracklistRaw as string | undefined;
    const tracklist = raw
      ? raw.split("\n").map((t: string) => t.trim()).filter(Boolean)
      : data.tracklist ?? [];
    updateMutation.mutate({ ...data, tracklist });
  };

  const coverImageValue = form.watch("coverImage");
  const hasAudioSource = !!(form.watch("audioFileUrl") || form.watch("audioPreviewUrl"));

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background pt-24 text-center">
          <p className="text-muted-foreground" data-testid="text-release-not-found">Release not found.</p>
          <Link href="/admin"><Button variant="outline" className="mt-4">Back to Admin</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-background pt-20">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 py-16 md:py-24">
          <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link href="/admin" data-testid="link-back-admin">
                <Button variant="ghost" size="default" className="gap-2 mb-4 -ml-3">
                  <ArrowLeft className="w-4 h-4" /> Admin
                </Button>
              </Link>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">
                Discography
              </p>
              <h1 className="text-4xl md:text-5xl font-display font-bold" data-testid="text-edit-release-title">
                Edit Release
              </h1>
            </div>
            <Button
              variant="ghost"
              size="default"
              className="gap-2 text-destructive mt-14"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(`Delete "${release.title}"? This cannot be undone.`)) {
                  deleteMutation.mutate();
                }
              }}
              data-testid="button-delete-release"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Release title" {...field} data-testid="input-release-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                )} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="releaseDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Date</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-release-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="featured" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                )} />
              </div>

              {/* Cover Art */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Cover Art</p>
                <div className="flex items-start gap-4 flex-wrap">
                  {coverImageValue && (
                    <div className="relative w-24 h-24 rounded-md overflow-hidden border border-border shrink-0">
                      <img src={coverImageValue} alt="Cover preview" className="w-full h-full object-cover" data-testid="img-cover-preview" />
                      <button type="button" className="absolute top-1 right-1 bg-background/80 rounded-sm p-0.5"
                        onClick={() => { form.setValue("coverImage", "", { shouldValidate: true }); setCoverUploadState("idle"); setCoverFileName(""); }}
                        data-testid="button-clear-cover">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input ref={coverInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" data-testid="input-cover-file"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }} />
                    <Button type="button" variant="outline" className="gap-2" disabled={coverUploadState === "uploading"} onClick={() => coverInputRef.current?.click()} data-testid="button-upload-cover">
                      {coverUploadState === "uploading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        : coverUploadState === "done" ? <><CheckCircle className="w-4 h-4 text-green-500" /> {coverFileName}</>
                          : <><Upload className="w-4 h-4" /> Upload New Image</>}
                    </Button>
                    {coverUploadState === "error" && <p className="text-xs text-destructive">Upload failed. Try again.</p>}
                  </div>
                </div>
                <FormField control={form.control} name="coverImage" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs font-normal">or paste image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field}
                        onChange={(e) => { field.onChange(e); if (e.target.value) { setCoverUploadState("idle"); setCoverFileName(""); } }}
                        data-testid="input-cover-image" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe this release..." className="min-h-[120px]" {...field} data-testid="textarea-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Audio */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Audio</p>
                <div className="flex flex-col gap-2">
                  <input ref={audioInputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/x-m4a,audio/mp4,audio/aac" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); }} />
                  <Button type="button" variant="outline" className="gap-2 self-start" disabled={audioUploadState === "uploading"} onClick={() => audioInputRef.current?.click()} data-testid="button-upload-audio">
                    {audioUploadState === "uploading" ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                      : audioUploadState === "done" ? <><CheckCircle className="w-4 h-4 text-green-500" /> {audioFileName}</>
                        : <><Music className="w-4 h-4" /> Upload New Audio</>}
                  </Button>
                </div>

                <div className="border border-border rounded-md p-4 space-y-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview Snippet</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="previewStartSeconds" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start (seconds)</FormLabel>
                        <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-preview-start" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="previewDurationSeconds" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (seconds)</FormLabel>
                        <FormControl><Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} data-testid="input-preview-duration" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="button" variant={isTesting ? "default" : "outline"} size="default" className="gap-2" disabled={!hasAudioSource} onClick={testSnippet} data-testid="button-test-snippet">
                    {isTesting ? <><Square className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Test Snippet</>}
                  </Button>
                </div>

                <FormField control={form.control} name="audioPreviewUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground text-xs font-normal">or paste audio preview URL</FormLabel>
                    <FormControl><Input placeholder="https://…" {...field} data-testid="input-audio-preview" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Streaming Links */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Streaming Links (optional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "spotifyUrl" as const, label: "Spotify URL", testId: "input-spotify" },
                    { name: "appleMusicUrl" as const, label: "Apple Music URL", testId: "input-apple" },
                    { name: "soundcloudUrl" as const, label: "SoundCloud URL", testId: "input-soundcloud" },
                    { name: "youtubeUrl" as const, label: "YouTube URL", testId: "input-youtube" },
                  ].map(({ name, label, testId }) => (
                    <FormField key={name} control={form.control} name={name} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl><Input placeholder="https://..." {...field} data-testid={testId} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>

              {/* Tracklist */}
              <FormItem>
                <FormLabel>Tracklist (one per line)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={"01. Track Name\n02. Track Name"}
                    className="min-h-[100px] font-mono text-sm"
                    data-testid="textarea-tracklist"
                    defaultValue={release.tracklist.join("\n")}
                    {...form.register("_tracklistRaw" as any)}
                  />
                </FormControl>
              </FormItem>

              <div className="flex gap-4 pt-2">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-release">
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/admin")} data-testid="button-cancel-edit">
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
