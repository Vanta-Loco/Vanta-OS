import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Save, Loader2, Upload, ImageIcon, X } from "lucide-react";
import type { SiteContent } from "@shared/schema";
import { ABOUT_DEFAULTS } from "@shared/schema";

export default function AdminSettings() {
  return <AdminGuard><SettingsContent /></AdminGuard>;
}

function SettingsContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();

  const { data, isLoading } = useQuery<SiteContent>({
    queryKey: ["/api/site-content/about"],
    enabled: isAuthenticated,
  });

  const [form, setForm] = useState<Omit<SiteContent, "key" | "updatedAt">>({
    title: ABOUT_DEFAULTS.title,
    heroP1: ABOUT_DEFAULTS.heroP1,
    heroP2: ABOUT_DEFAULTS.heroP2,
    heroP3: ABOUT_DEFAULTS.heroP3,
    heroImageUrl: ABOUT_DEFAULTS.heroImageUrl,
    journeyTitle: ABOUT_DEFAULTS.journeyTitle,
    creativeTitle: ABOUT_DEFAULTS.creativeTitle,
    creativeBody: ABOUT_DEFAULTS.creativeBody,
    studioImageUrl: ABOUT_DEFAULTS.studioImageUrl,
    visionTitle: ABOUT_DEFAULTS.visionTitle,
    visionBody: ABOUT_DEFAULTS.visionBody,
    cityImageUrl: ABOUT_DEFAULTS.cityImageUrl,
    missionTitle: ABOUT_DEFAULTS.missionTitle,
    missionBody: ABOUT_DEFAULTS.missionBody,
  });

  useEffect(() => {
    if (data) setForm({ title: data.title, heroP1: data.heroP1, heroP2: data.heroP2, heroP3: data.heroP3, heroImageUrl: data.heroImageUrl, journeyTitle: data.journeyTitle, creativeTitle: data.creativeTitle, creativeBody: data.creativeBody, studioImageUrl: data.studioImageUrl, visionTitle: data.visionTitle, visionBody: data.visionBody, cityImageUrl: data.cityImageUrl, missionTitle: data.missionTitle, missionBody: data.missionBody });
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/site-content/about", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-content/about"] });
      toast({ title: "Site settings saved." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1.5">{children}</p>
  );

  function Div({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><Label>{label}</Label>{children}</div>;
  }

  if (isLoading) return (
    <AdminLayout title="Site Settings">
      <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded-md" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Site Settings" action={
      <Button size="sm" className="gap-2 text-xs" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save Changes
      </Button>
    }>
      <div className="max-w-2xl space-y-8">
        {/* About page */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">About Page</h2>
          <div className="space-y-4">
            <Div label="Page Title"><Input value={form.title} onChange={field("title")} placeholder="About Vanta Cold" /></Div>
            <Div label="Paragraph 1"><Textarea value={form.heroP1} onChange={field("heroP1")} rows={3} className="resize-none" /></Div>
            <Div label="Paragraph 2"><Textarea value={form.heroP2} onChange={field("heroP2")} rows={3} className="resize-none" /></Div>
            <Div label="Paragraph 3"><Textarea value={form.heroP3} onChange={field("heroP3")} rows={3} className="resize-none" /></Div>
            <Div label="Hero Image URL"><Input value={form.heroImageUrl} onChange={field("heroImageUrl")} placeholder="https://..." /></Div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">Journey Section</h2>
          <div className="space-y-4">
            <Div label="Section Heading"><Input value={form.journeyTitle} onChange={field("journeyTitle")} /></Div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Div label="Creative Process — Image URL"><Input value={form.studioImageUrl} onChange={field("studioImageUrl")} /></Div>
                <Div label="Creative Process — Title"><Input value={form.creativeTitle} onChange={field("creativeTitle")} /></Div>
                <Div label="Creative Process — Body"><Textarea value={form.creativeBody} onChange={field("creativeBody")} rows={4} className="resize-none" /></Div>
              </div>
              <div className="space-y-3">
                <Div label="Vision — Image URL"><Input value={form.cityImageUrl} onChange={field("cityImageUrl")} /></Div>
                <Div label="Vision — Title"><Input value={form.visionTitle} onChange={field("visionTitle")} /></Div>
                <Div label="Vision — Body"><Textarea value={form.visionBody} onChange={field("visionBody")} rows={4} className="resize-none" /></Div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">Mission Section</h2>
          <div className="space-y-4">
            <Div label="Mission Title"><Input value={form.missionTitle} onChange={field("missionTitle")} /></Div>
            <Div label="Mission Body"><Textarea value={form.missionBody} onChange={field("missionBody")} rows={4} className="resize-none" /></Div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
