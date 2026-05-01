import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVault } from "@/hooks/use-vault";
import {
  LockKeyhole, LockKeyholeOpen, Disc3, Globe,
  ShieldAlert, ArrowRight, ArrowLeft,
} from "lucide-react";

export default function Enter() {
  const { isAuthorized, isLoading, verify, logout } = useVault();
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    try {
      await verify.mutateAsync(code.trim());
      setCode("");
    } catch {
      setErrorMsg("Signal rejected — code unrecognised.");
      setCode("");
    }
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden"
      data-testid="enter-page"
    >
      <style>{`
        @keyframes enter-scan {
          0%   { transform: translateY(-12px); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes enter-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes enter-granted-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.95; }
        }
        .enter-nodes-appear {
          animation: enter-fade-up 0.55s ease both;
        }
        .enter-nodes-appear-delay-1 { animation-delay: 0.05s; }
        .enter-nodes-appear-delay-2 { animation-delay: 0.12s; }
        .enter-nodes-appear-delay-3 { animation-delay: 0.19s; }
      `}</style>

      {/* Ambient glow — brighter once authorized */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: isAuthorized
            ? "radial-gradient(ellipse at 50% 35%, hsl(var(--primary)/0.11) 0%, transparent 60%)"
            : "radial-gradient(ellipse at 50% 35%, hsl(var(--primary)/0.06) 0%, transparent 60%)",
        }}
      />

      {/* Slow scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/8 to-transparent pointer-events-none"
        style={{ animation: "enter-scan 20s linear infinite" }}
      />

      {/* Corner bracket marks */}
      <div className="absolute top-8 left-8 w-5 h-5 border-t border-l border-border/20 pointer-events-none" />
      <div className="absolute top-8 right-8 w-5 h-5 border-t border-r border-border/20 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-5 h-5 border-b border-l border-border/20 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-5 h-5 border-b border-r border-border/20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">

        {/* ── Header (always shown) ── */}
        <div className="text-center mb-10">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full border bg-background/60 mb-7 transition-all duration-700 ${
              isAuthorized ? "border-primary/40" : "border-border/40"
            }`}
          >
            {isAuthorized
              ? <LockKeyholeOpen className="w-5 h-5 text-primary/70" />
              : <LockKeyhole className="w-5 h-5 text-muted-foreground/50" />
            }
          </div>

          <h1
            className="text-4xl md:text-5xl font-display font-bold tracking-[0.12em]"
            data-testid="text-enter-title"
          >
            VANTA OS
          </h1>
          <p
            className={`text-[10px] uppercase tracking-[0.35em] font-mono mt-3 transition-colors duration-700 ${
              isAuthorized ? "text-primary/60" : "text-muted-foreground/40"
            }`}
            data-testid="text-enter-status"
          >
            {isLoading ? "Initializing…" : isAuthorized ? "System Online" : "System Interface"}
          </p>
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-8" />

        {/* ── Phase A: Passkey ritual (unauthorized) ── */}
        {!isAuthorized && !isLoading && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3"
            data-testid="form-enter-access"
          >
            <p className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground/40 font-mono text-center mb-1">
              Access Key
            </p>

            <Input
              type="password"
              placeholder="· · · · · · · ·"
              value={code}
              onChange={e => { setCode(e.target.value); setErrorMsg(""); }}
              className="font-mono tracking-[0.3em] text-center text-sm bg-background/60 border-border/60 placeholder:text-muted-foreground/25 placeholder:tracking-[0.25em] h-11"
              autoFocus
              autoComplete="off"
              data-testid="input-enter-access-key"
            />

            {errorMsg ? (
              <p
                className="text-[10px] text-destructive/80 font-mono tracking-[0.1em] text-center"
                data-testid="text-enter-error"
              >
                {errorMsg}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/25 font-mono tracking-[0.1em] text-center">
                &nbsp;
              </p>
            )}

            <Button
              type="submit"
              size="default"
              className="w-full font-mono tracking-[0.18em] uppercase text-xs"
              disabled={!code.trim() || verify.isPending}
              data-testid="button-initialize-access"
            >
              {verify.isPending ? "Verifying…" : "Initialize Access"}
            </Button>
          </form>
        )}

        {/* ── Phase B: Gateway open (authorized) ── */}
        {isAuthorized && (
          <div className="space-y-px">

            {/* Vault — primary restricted node */}
            <div className="enter-nodes-appear enter-nodes-appear-delay-1">
              <Link href="/vault" data-testid="link-enter-vault">
                <div className="group border border-primary/30 rounded-md p-4 mb-2 hover-elevate transition-all cursor-pointer">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <LockKeyholeOpen className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                      <span
                        className="text-sm font-mono uppercase tracking-[0.22em] text-foreground"
                        data-testid="text-enter-vault-label"
                      >
                        Vault
                      </span>
                      <span
                        className="text-[9px] uppercase tracking-[0.25em] text-primary/65 font-mono"
                        style={{ animation: "enter-granted-pulse 3s ease-in-out infinite" }}
                        data-testid="text-enter-vault-status"
                      >
                        Access Granted
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-primary/35 group-hover:text-primary/70 transition-colors flex-shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground/55 font-mono mt-2 pl-[26px] leading-relaxed">
                    Clearance confirmed — enter the restricted archive.
                  </p>
                </div>
              </Link>
            </div>

            {/* Releases */}
            <div className="enter-nodes-appear enter-nodes-appear-delay-2">
              <Link href="/releases" data-testid="link-enter-releases">
                <div className="group flex items-center justify-between gap-3 py-3.5 px-4 rounded-md hover-elevate transition-all cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <Disc3 className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                    <div className="min-w-0">
                      <span
                        className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-foreground transition-colors"
                        data-testid="text-enter-releases-label"
                      >
                        Releases
                      </span>
                      <p className="text-[10px] text-muted-foreground/30 font-mono mt-0.5 truncate">
                        Full discography — albums, singles, EPs
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
                </div>
              </Link>
            </div>

            {/* Worlds */}
            <div className="enter-nodes-appear enter-nodes-appear-delay-3">
              <Link href="/worlds" data-testid="link-enter-worlds">
                <div className="group flex items-center justify-between gap-3 py-3.5 px-4 rounded-md hover-elevate transition-all cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                    <div className="min-w-0">
                      <span
                        className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-foreground transition-colors"
                        data-testid="text-enter-worlds-label"
                      >
                        Worlds
                      </span>
                      <p className="text-[10px] text-muted-foreground/30 font-mono mt-0.5 truncate">
                        Project universes and creative contexts
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
                </div>
              </Link>
            </div>

          </div>
        )}

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mt-8 mb-6" />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors font-mono"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-3 h-3" />
            Surface
          </Link>

          <div className="flex items-center gap-4">
            {isAuthorized && (
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="text-[11px] text-muted-foreground/30 hover:text-muted-foreground/65 transition-colors font-mono"
                data-testid="button-lock-session"
              >
                Lock Session
              </button>
            )}
            <Link
              href="/admin/login"
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/25 hover:text-muted-foreground/55 transition-colors font-mono"
              data-testid="link-admin-access"
            >
              <ShieldAlert className="w-3 h-3" />
              Admin
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
