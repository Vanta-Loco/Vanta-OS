import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Lock, ArrowLeft } from "lucide-react";

export default function Enter() {
  const [code, setCode] = useState("");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.06)_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-border mb-8">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>

        <h1
          className="text-4xl md:text-5xl font-display font-bold mb-2 tracking-tight"
          data-testid="text-enter-title"
        >
          VANTA OS
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-10 font-medium">
          Restricted Access
        </p>

        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Enter invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-center tracking-widest font-mono"
            data-testid="input-invite-code"
          />
          <Button
            className="w-full"
            disabled={!code.trim()}
            data-testid="button-enter-system"
          >
            Request Entry
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          No code?{" "}
          <span className="text-foreground cursor-default">
            Access is by invitation only.
          </span>
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-10"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-3 h-3" /> Return to surface
        </Link>

        <div className="mt-16 pt-8 border-t border-border/40">
          <Link
            href="/admin/login"
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            data-testid="link-admin-access"
          >
            Admin access
          </Link>
        </div>
      </div>
    </div>
  );
}
