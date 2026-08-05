import { AdminLayout, AdminGuard } from "@/components/admin/admin-layout";
import { Users, Construction } from "lucide-react";

export default function AdminUsers() {
  return <AdminGuard><UsersContent /></AdminGuard>;
}

function UsersContent() {
  return (
    <AdminLayout title="Users">
      <div className="max-w-lg py-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">User Management</h2>
            <p className="text-xs text-muted-foreground font-mono">Not yet available</p>
          </div>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Construction className="w-4 h-4 shrink-0" />
            <p>The Vanta user and profile system does not exist yet.</p>
          </div>
          <p>
            When user accounts and public profiles are implemented, this section will support:
            searching users, viewing account status, assigning roles, suspending accounts, and
            moderating public profile content.
          </p>
          <p className="text-xs font-mono text-muted-foreground/60">
            No passwords or sensitive auth data will ever be displayed here.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
