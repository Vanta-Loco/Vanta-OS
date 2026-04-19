import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, ArrowLeft } from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { Link } from "wouter";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [, navigate] = useLocation();
  const rawSearch = useSearch();
  const { isAuthenticated, isLoading, login } = useAdmin();

  // Read optional redirect target sent by protected routes (e.g. ?from=/create)
  const from = new URLSearchParams(rawSearch).get("from") ?? "/admin";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(from);
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    try {
      await login.mutateAsync(password);
      navigate(from);
    } catch {
      setErrorMsg("Invalid password. Try again.");
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.05)_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-border mb-8">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>

        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-medium">
          Vanta Cold
        </p>
        <h1
          className="text-4xl md:text-5xl font-display font-bold mb-2 tracking-tight"
          data-testid="text-admin-login-title"
        >
          Admin
        </h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-10 font-medium">
          Restricted Access
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-center font-mono"
            autoComplete="current-password"
            data-testid="input-admin-password"
          />
          {errorMsg && (
            <p className="text-xs text-destructive" data-testid="text-login-error">
              {errorMsg}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!password.trim() || login.isPending}
            data-testid="button-admin-login"
          >
            {login.isPending ? "Authenticating…" : "Enter"}
          </Button>
        </form>

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-10"
          data-testid="link-back-home"
        >
          <ArrowLeft className="w-3 h-3" /> Return to site
        </Link>
      </div>
    </div>
  );
}
