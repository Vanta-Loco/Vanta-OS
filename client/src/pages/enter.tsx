import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVault } from "@/hooks/use-vault";
import {
  LockKeyhole, LockKeyholeOpen, Disc3, Globe,
  ShieldAlert, ArrowRight, ArrowLeft,
} from "lucide-react";

const SECONDARY_DESTINATIONS = [
  {
    href: "/releases",
    icon: Disc3,
    label: "Releases",
    descriptor: "Full discography — albums, singles, EPs",
  },
  {
    href: "/worlds",
    icon: Globe,
    label: "Worlds",
    descriptor: "Project universes and creative contexts",
  },
] as const;

export default function Enter() {
  const { isAuthorized, verify } = useVault();
  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    try {
      await verify.mutateAsync(code.trim());
      setCode("");
      setShowInput(false);
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
        @keyframes enter-granted-pulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.85; }
        }
      `}</style>

      {/* Ambient glow — brightens subtly on access granted */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: isAuthorized
            ? "radial-gradient(ellipse at 50% 35%, hsl(var(--primary)/0.10) 0%, transparent 62%)"
            : "radial-gradient(ellipse at 50% 35%, hsl(var(--primary)/0.06) 0%, transparent 62%)",
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

        {/* ── Header ── */}
        <div className="text-center mb-10">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full border bg-background/60 mb-7 transition-all duration-700 ${
              isAuthorized ? "border-primary/30" : "border-border/40"
            }`}
          >
            {isAuthorized
              ? <LockKeyholeOpen className="w-5 h-5 text-primary/60" />
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
              isAuthorized ? "text-primary/50" : "text-muted-foreground/40"
            }`}
            data-testid="text-enter-status"
          >
            {isAuthorized ? "System Online" : "System Interface"}
          </p>
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-8" />

        {/* ── Vault node — two states ── */}
        {isAuthorized ? (

          /* GRANTED — clickable, unlocked styling */
          <Link href="/vault" data-testid="link-enter-vault">
            <div className="group border border-primary/25 rounded-md p-4 mb-2 hover-elevate transition-all cursor-pointer">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LockKeyholeOpen className="w-3.5 h-3.5 text-primary/50 flex-shrink-0" />
                  <span
                    className="text-sm font-mono uppercase tracking-[0.22em] text-foreground"
                    data-testid="text-enter-vault-label"
                  >
                    Vault
                  </span>
                  <span
                    className="text-[9px] uppercase tracking-[0.25em] text-primary/55 font-mono"
                    style={{ animation: "enter-granted-pulse 3s ease-in-out infinite" }}
                    data-testid="text-enter-vault-status"
                  >
                    Access Granted
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground/50 font-mono mt-2 pl-[26px] leading-relaxed">
                Clearance confirmed — enter the restricted archive.
              </p>
            </div>
          </Link>

        ) : (

          /* LOCKED — passkey interaction inline */
          <div
            className="border border-border/60 rounded-md p-4 mb-2 transition-all"
            data-testid="vault-node-locked"
          >
            <div className="flex items-center gap-3">
              <LockKeyhole className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              <span
                className="text-sm font-mono uppercase tracking-[0.22em] text-foreground"
                data-testid="text-enter-vault-label"
              >
                Vault
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/35 font-mono">
                restricted
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/35 font-mono mt-2 pl-[26px] leading-relaxed">
              Unreleased sessions, raw demos, and transmissions that never surfaced.
            </p>

            {/* Passkey interaction */}
            {!showInput ? (
              <div className="mt-4 pl-[26px]">
                <button
                  type="button"
                  onClick={() => setShowInput(true)}
                  className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/30 font-mono hover:text-muted-foreground/65 transition-colors"
                  data-testid="button-initialize-access"
                >
                  — Initialize Access —
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-4 space-y-2"
                data-testid="form-enter-access"
              >
                <div className="h-px bg-border/25 mb-3" />
                <Input
                  type="password"
                  placeholder="— access key —"
                  value={code}
                  onChange={e => { setCode(e.target.value); setErrorMsg(""); }}
                  className="font-mono tracking-[0.2em] text-center text-sm bg-background/40 border-border/50 placeholder:text-muted-foreground/25 placeholder:tracking-[0.15em]"
                  autoFocus
                  autoComplete="off"
                  data-testid="input-enter-access-key"
                />
                {errorMsg && (
                  <p
                    className="text-[10px] text-destructive/70 font-mono tracking-[0.1em] text-center"
                    data-testid="text-enter-error"
                  >
                    {errorMsg}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="default"
                    className="flex-1 font-mono tracking-[0.1em] uppercase text-xs"
                    disabled={!code.trim() || verify.isPending}
                    data-testid="button-transmit-key"
                  >
                    {verify.isPending ? "Verifying…" : "Transmit Key"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setShowInput(false); setCode(""); setErrorMsg(""); }}
                    data-testid="button-cancel-access"
                  >
                    ×
                  </Button>
                </div>
              </form>
            )}
          </div>

        )}

        {/* ── Secondary destinations ── */}
        <div className="space-y-px">
          {SECONDARY_DESTINATIONS.map(({ href, icon: Icon, label, descriptor }) => (
            <Link
              key={href}
              href={href}
              data-testid={`link-enter-${label.toLowerCase()}`}
            >
              <div className="group flex items-center justify-between gap-3 py-3.5 px-4 rounded-md hover-elevate transition-all cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                  <div className="min-w-0">
                    <span
                      className="text-sm font-mono uppercase tracking-[0.2em] text-muted-foreground/70 group-hover:text-foreground transition-colors"
                      data-testid={`text-enter-${label.toLowerCase()}-label`}
                    >
                      {label}
                    </span>
                    <p className="text-[10px] text-muted-foreground/30 font-mono mt-0.5 truncate">
                      {descriptor}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-border/40 to-transparent mt-8 mb-6" />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors font-mono"
            data-testid="link-back-home"
          >
            <ArrowLeft className="w-3 h-3" />
            Surface
          </Link>

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
  );
}
