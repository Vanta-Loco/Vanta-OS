// ─── Create Vanta Profile ─────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/hooks/use-user";
import { AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const INTERESTS = [
  "Music", "Games", "Fashion", "Writing", "Cannabis culture",
  "Art", "Film", "Technology", "FGH lore",
];

export default function Register() {
  const [, navigate] = useLocation();
  const { isAuthenticated, register } = useUser();

  const [step, setStep] = useState<"required" | "optional">("required");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    username: "", display_name: "", email: "", password: "", confirm_password: "",
    bio: "", location: "", creator_category: "",
    interests: [] as string[],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const handleField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const toggleInterest = (i: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter(x => x !== i)
        : [...f.interests, i].slice(0, 10),
    }));
  };

  const handleRequiredNext = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.username.trim() || !/^[a-z0-9_]{3,20}$/.test(form.username))
      errors.username = "3–20 characters: letters, numbers, underscores only";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Valid email required";
    if (!form.password || form.password.length < 8)
      errors.password = "At least 8 characters";
    if (form.password !== form.confirm_password)
      errors.confirm_password = "Passwords do not match";
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setStep("optional");
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({
      ...form,
      username: form.username.toLowerCase().trim(),
      email: form.email.trim().toLowerCase(),
    });
  };

  if (register.isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="w-10 h-10 text-primary/60 mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">Profile Created</h2>
          <p className="text-sm text-muted-foreground mb-6">Welcome to Vanta.</p>
          <Link href="/dashboard">
            <Button className="w-full">Enter Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const serverErrors = (register.error as any)?.errors || {};

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,_hsl(var(--primary)/0.05)_0%,_transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <button
          onClick={() => step === "optional" ? setStep("required") : navigate("/dashboard")}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors font-mono mb-8"
        >
          <ArrowLeft className="w-3 h-3" />
          {step === "optional" ? "Back" : "Return"}
        </button>

        <div className="text-center mb-8">
          <p className="text-[9px] uppercase tracking-[0.5em] text-muted-foreground/30 font-mono mb-4">VANTA OS</p>
          <h1 className="text-3xl font-display font-bold tracking-wide mb-1">Create Profile</h1>
          <p className="text-sm text-muted-foreground">
            {step === "required" ? "Required information" : "Optional details (you can skip)"}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${step === "required" ? "bg-foreground" : "bg-muted-foreground"}`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${step === "optional" ? "bg-foreground" : "bg-border"}`} />
        </div>

        {step === "required" && (
          <form onSubmit={handleRequiredNext} className="flex flex-col gap-3">
            {/* Username */}
            <div>
              <Input
                placeholder="Username *"
                value={form.username}
                onChange={e => handleField("username")({ ...e, target: { ...e.target, value: e.target.value.toLowerCase() } })}
                autoComplete="username"
                className="h-11"
                maxLength={20}
              />
              {(fieldErrors.username || serverErrors.username) && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.username || serverErrors.username}</p>
              )}
            </div>

            {/* Display name */}
            <Input
              placeholder="Display name (optional)"
              value={form.display_name}
              onChange={handleField("display_name")}
              className="h-11"
            />

            {/* Email */}
            <div>
              <Input
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={handleField("email")}
                autoComplete="email"
                className="h-11"
              />
              {(fieldErrors.email || serverErrors.email) && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email || serverErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Password * (min 8 chars)"
                  value={form.password}
                  onChange={handleField("password")}
                  autoComplete="new-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide" : "Show"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <Input
                type={showPw ? "text" : "password"}
                placeholder="Confirm password *"
                value={form.confirm_password}
                onChange={handleField("confirm_password")}
                autoComplete="new-password"
                className="h-11"
              />
              {fieldErrors.confirm_password && <p className="text-xs text-destructive mt-1">{fieldErrors.confirm_password}</p>}
            </div>

            {register.error && !serverErrors && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {(register.error as Error).message || "Registration failed"}
              </div>
            )}

            <Button type="submit" className="h-11 font-mono tracking-wide mt-1">
              Continue
            </Button>

            <p className="text-xs text-center text-muted-foreground/50 mt-1">
              Already have a profile?{" "}
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            </p>
          </form>
        )}

        {step === "optional" && (
          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-4">
            <Textarea
              placeholder="Short bio…"
              value={form.bio}
              onChange={handleField("bio")}
              rows={2}
              className="resize-none"
              maxLength={500}
            />
            <Input
              placeholder="Location (optional)"
              value={form.location}
              onChange={handleField("location")}
            />
            <select
              value={form.creator_category}
              onChange={handleField("creator_category")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground"
            >
              <option value="">Creator category (optional)</option>
              {["Artist", "Producer", "Writer", "Photographer", "Filmmaker", "Developer", "Designer", "Curator", "Other"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Interests (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {INTERESTS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      form.interests.includes(i)
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground/40"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {register.error && (
              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {(register.error as Error).message || "Registration failed"}
              </div>
            )}

            <Button
              type="submit"
              disabled={register.isPending}
              className="h-11 font-mono tracking-wide"
            >
              {register.isPending ? "Creating profile…" : "Create Profile"}
            </Button>

            <button
              type="submit"
              className="text-xs text-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              onClick={handleFinalSubmit}
            >
              Skip optional fields
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
