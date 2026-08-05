import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Save, Loader2 } from "lucide-react";

type WorldSettings = {
  status: string; alpha_availability: string; description: string;
  current_version: string; maintenance_message: string; radio_enabled: string;
  known_issues: string; developer_notes: string; featured_image: string;
};

const DEFAULTS: WorldSettings = {
  status: "active", alpha_availability: "closed", description: "",
  current_version: "0.1.0", maintenance_message: "", radio_enabled: "false",
  known_issues: "", developer_notes: "", featured_image: "",
};

export default function AdminWorld() {
  return <AdminGuard><WorldContent /></AdminGuard>;
}

function WorldContent() {
  const { toast } = useToast();
  const { isAuthenticated } = useAdmin();
  const [form, setForm] = useState<WorldSettings>(DEFAULTS);

  const { data, isLoading } = useQuery<WorldSettings>({
    queryKey: ["/api/admin/world"],
    enabled: isAuthenticated,
  });

  useEffect(() => { if (data) setForm(f => ({ ...DEFAULTS, ...data, ...f.description ? f : {} })); }, [data]);
  useEffect(() => { if (data) setForm({ ...DEFAULTS, ...data }); }, [data]);

  const save = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/admin/world", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/world"] });
      toast({ title: "World Alpha settings saved." });
    },
    onError: () => toast({ title: "Save failed.", variant: "destructive" }),
  });

  function field(k: keyof WorldSettings) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1.5">{children}</p>
  );

  if (isLoading) return (
    <AdminLayout title="World Alpha">
      <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded-md" />)}</div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="World Alpha" action={
      <Button size="sm" className="gap-2 text-xs" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save Settings
      </Button>
    }>
      <p className="text-sm text-muted-foreground mb-6">
        Manage World Alpha's public-facing settings and status. The game itself is not editable here.
      </p>

      <div className="border border-border rounded-lg p-6 space-y-5 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label>Status</Label>
            <select value={form.status} onChange={field("status")}
              className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
              {["active","maintenance","offline","coming-soon"].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Alpha Availability</Label>
            <select value={form.alpha_availability} onChange={field("alpha_availability")}
              className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
              {["open","closed","invite-only","coming-soon"].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <Label>Current Version</Label>
            <Input value={form.current_version} onChange={field("current_version")} placeholder="0.1.0" />
          </div>
          <div>
            <Label>Radio Enabled</Label>
            <select value={form.radio_enabled} onChange={field("radio_enabled")}
              className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 text-foreground">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={field("description")} rows={3} className="resize-none" placeholder="Public description of the World Alpha experience" />
        </div>

        <div>
          <Label>Maintenance Message</Label>
          <Textarea value={form.maintenance_message} onChange={field("maintenance_message")} rows={2} className="resize-none" placeholder="Shown when status is 'maintenance'" />
        </div>

        <div>
          <Label>Featured Image URL</Label>
          <Input value={form.featured_image} onChange={field("featured_image")} placeholder="https://... or /uploads/..." />
        </div>

        <div>
          <Label>Known Issues</Label>
          <Textarea value={form.known_issues} onChange={field("known_issues")} rows={3} className="resize-none" placeholder="List known issues visible to players" />
        </div>

        <div>
          <Label>Developer Notes (internal)</Label>
          <Textarea value={form.developer_notes} onChange={field("developer_notes")} rows={3} className="resize-none" placeholder="Internal notes — not shown publicly" />
        </div>
      </div>
    </AdminLayout>
  );
}
