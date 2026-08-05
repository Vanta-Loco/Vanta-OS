// ─── User Login ───────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    login.mutate({ email: email.trim().toLowerCase(), password });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <style>{`
        @keyframes login-scan {
          0%   { transform: translateY(-8px); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/8 to-transparent pointer-events-none"
        style={{ animation: "login-scan 18s linear infinite" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_hsl(var(--primary)/0.05)_0%,_transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Back */}
        <Link href="/dashboard">
          <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors font-mono mb-8">
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
        </Link>

        <div className="text-center mb-8">
          <p className="text-[9px] uppercase tracking-[0.5em] text-muted-foreground/30 font-mono mb-4">
            VANTA OS
          </p>
          <h1 className="text-3xl font-display font-bold tracking-wide mb-1">Sign In</h1>
          <p className="text-sm text-muted-foreground">Access your Vanta profile</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />

          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {login.error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {(login.error as Error).message}
            </div>
          )}

          <Button
            type="submit"
            className="h-11 font-mono tracking-wide"
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="w-full h-px bg-border my-6" />

        <div className="flex flex-col gap-2 text-center text-sm">
          <p className="text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-foreground hover:underline font-medium">
              Create a profile
            </Link>
          </p>
          <Link href="/dashboard" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Continue as guest
          </Link>
        </div>
      </div>
    </div>
  );
}
