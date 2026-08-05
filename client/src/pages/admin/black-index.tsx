import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Save, Loader2, ShieldAlert } from "lucide-react";

type Config = {
  index_blog: string; index_music: string; index_releases: string;
  index_stonerism: string; index_profiles: string; index_devlogs: string;
  index_teasers: string;
};

const TOGGLES: { key: keyof Config; label: string; desc: string; safe: boolean }[] = [
  { key: "index_blog",      label: "Blog Posts",         desc: "Published blog posts appear in Black Index search.",           safe: true  },
  { key: "index_music",     label: "Music / Vault",      desc: "Public vault tracks and music metadata appear in search.",     safe: true  },
  { key: "index_releases",  label: "Releases",           desc: "Release catalogue appears in search.",                         safe: true  },
  { key: "index_stonerism", label: "Stonerism",          desc: "Published Stonerism articles and content appear in search.",   safe: true  },
  { key: "index_devlogs",   label: "Developer Logs",     desc: "Published developer logs appear in search.",                   safe: true  },
  { key: "index_teasers",   label: "App Teasers",        desc: "Published upcoming app teasers appear in search.",             safe: true  },
  { key: "index_profiles",  label: "User Profiles",      desc: "Public profile pages appear in search. Never indexes passwords, emails, or private data.", safe: false },
];

export default function AdminBlackIndex() {
  return <AdminGuard><BlackIndexContent /></AdminGuard>;
}

function BlackIndexContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();
  const [config, setConfig] = useState<Config>({
    index_blog: "true", index_music: "true", index_releases: "true",
    index_stonerism: "true", index_profiles: "false", index_devlogs: "true", index_teasers: "false",
  });

  const { data, isLoading } = useQuery<Config>({
    queryKey: ["/api/admin/black-index"],
    enabled: isAuthenticated,
  });

  useEffect(() => { if (data) setConfig(c => ({ ...c, ...data })); }, [data]);

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/admin/black-index", config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/black-index"] });
      toast({ title: "Black Index configuration saved." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  function toggle(key: keyof Config) {
    setConfig(c => ({ ...c, [key]: c[key] === "true" ? "false" : "true" }));
  }

  if (isLoading) return (
    <AdminLayout title="Black Index">
      <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-muted rounded-md" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Black Index" action={
      <Button size="sm" className="gap-2 text-xs" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save
      </Button>
    }>
      <p className="text-sm text-muted-foreground mb-6 max-w-xl">
        Control which public content types Black Index is allowed to surface. Private records — passwords, emails, waitlist data, admin notes, and draft content — are never indexed regardless of these settings.
      </p>

      <div className="border border-border rounded-lg divide-y divide-border max-w-xl">
        {TOGGLES.map(({ key, label, desc, safe }) => (
          <div key={key} className="flex items-start gap-4 px-5 py-4">
            <button
              onClick={() => toggle(key)}
              className={`mt-0.5 w-10 h-5 rounded-full shrink-0 relative transition-colors ${
                config[key] === "true" ? "bg-primary" : "bg-muted"
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                config[key] === "true" ? "translate-x-5" : "translate-x-0.5"
              }`} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{label}</p>
                {!safe && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                    <ShieldAlert className="w-3 h-3" /> sensitive
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <span className={`text-xs font-mono shrink-0 ${config[key] === "true" ? "text-primary" : "text-muted-foreground"}`}>
              {config[key] === "true" ? "ON" : "OFF"}
            </span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
