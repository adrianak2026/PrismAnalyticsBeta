"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Check, Eye, EyeOff, ShieldCheck, Sparkles, Loader2, AlertCircle, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { api } from "../lib/api-client";

interface Props {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onSignup: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

interface EmailCheck { valid: boolean; message?: string; disposable?: boolean; records?: number; }

export function Login({ onLogin, onSignup }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailCheck, setEmailCheck] = useState<EmailCheck | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Debounced email validation via MX check (signup only)
  useEffect(() => {
    if (mode !== "signup" || !email.includes("@") || email.length < 5) { setEmailCheck(null); return; }
    const handle = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await api<EmailCheck>("/api/auth/check-email", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setEmailCheck(res);
      } catch { setEmailCheck(null); }
      finally { setCheckingEmail(false); }
    }, 600);
    return () => clearTimeout(handle);
  }, [email, mode]);

  const pwStrength = passwordStrength(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = mode === "signup"
        ? await onSignup(name.trim(), email.trim(), password)
        : await onLogin(email.trim(), password);
      if (!result.ok) setError(result.error || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  const showEmailStatus = mode === "signup" && email.includes("@") && email.length >= 5;

  return (
    <main className="min-h-screen bg-[color:var(--color-bg)] p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1180px] overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-bg-card)] shadow-2xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#161425] via-[#12111f] to-[#0d0c17] p-8 text-white lg:flex lg:flex-col lg:p-12">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#8d6cff]/25 blur-[100px]" />
          <div className="absolute -bottom-28 -left-12 h-80 w-80 rounded-full bg-[#ec7a70]/15 blur-[100px]" />
          <div className="relative flex items-center gap-2.5 text-lg font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#9d7dff] to-[#ef7d73] shadow-lg">
              <BarChart3 size={19} />
            </span>
            PrismAnalytics
          </div>
          <div className="relative my-auto max-w-md">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#d9d0ef]">
              <Sparkles size={13} className="text-[#8b6cf5]" />Privacy-first analytics
            </div>
            <h1 className="text-[42px] font-semibold leading-[1.05] tracking-[-0.04em]">
              Clarity without the <span className="bg-gradient-to-r from-[#8b6cf5] to-[#ec7d75] bg-clip-text text-transparent">creepy tracking</span>.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-[#9d97ad]">
              Cookie-free, GDPR-friendly analytics you can self-host on Cloudflare&apos;s free tier.
            </p>
            <ul className="mt-9 space-y-4 text-sm text-[#c5c1d0]">
              {["No cookies or fingerprinting", "MX-verified accounts, rate-limited APIs", "Full data ownership on your infra"].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white/5 text-[#8b6cf5]"><Check size={14} /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex items-center gap-2 text-xs text-[#6a6579]">
            <ShieldCheck size={14} />Encrypted, audited, self-hostable.
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 flex items-center gap-2 text-base font-semibold lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#8b6cf5] to-[#ec7d75] text-white"><BarChart3 size={16} /></span>
              PrismAnalytics
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em]">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
              {mode === "signup" ? "Free forever on the Cloudflare free tier." : "Sign in to your dashboard."}
            </p>

            <form onSubmit={submit} className="mt-7 space-y-3.5">
              {mode === "signup" && (
                <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
                  Full name
                  <Input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" className="mt-1.5" />
                </label>
              )}

              <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
                Email address
                <div className="relative mt-1.5">
                  <Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="pr-11" />
                  {showEmailStatus && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingEmail ? <Loader2 size={16} className="animate-spin text-[color:var(--color-text-dim)]" /> :
                       emailCheck?.valid ? <Check size={16} className="text-[color:var(--color-success)]" /> :
                       emailCheck ? <AlertCircle size={16} className="text-[color:var(--color-danger)]" /> : null}
                    </div>
                  )}
                </div>
                {showEmailStatus && emailCheck && !checkingEmail && (
                  <p className={`mt-1.5 flex items-center gap-1 text-[11px] ${emailCheck.valid ? "text-[color:var(--color-success)]" : "text-[color:var(--color-danger)]"}`}>
                    <Mail size={11} />{emailCheck.valid ? `Domain verified${emailCheck.records ? ` (${emailCheck.records} MX record${emailCheck.records > 1 ? "s" : ""})` : ""}` : emailCheck.message}
                  </p>
                )}
              </label>

              <label className="block text-xs font-medium text-[color:var(--color-text-muted)]">
                Password
                <div className="relative mt-1.5">
                  <Input required minLength={mode === "signup" ? 8 : 1} maxLength={128} autoComplete={mode === "signup" ? "new-password" : "current-password"} type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "Min 8 chars with numbers & symbols" : "Enter password"} className="pr-11" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {mode === "signup" && password.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {[0,1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition ${pwStrength.score > i ? pwStrength.score >= 4 ? "bg-[color:var(--color-success)]" : pwStrength.score >= 3 ? "bg-[color:var(--color-brand)]" : "bg-[color:var(--color-warn)]" : "bg-[color:var(--color-border)]"}`} />
                    ))}
                  </div>
                )}
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-[#5a2a2a] bg-[#2a1414] px-3 py-2.5 text-xs text-[color:var(--color-danger)]">
                  <AlertCircle size={14} className="mt-px shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" loading={busy} className="mt-4 w-full" size="lg">
                {mode === "signup" ? "Create account" : "Sign in"}<ArrowRight size={16} />
              </Button>
            </form>

            <p className="mt-7 text-center text-sm text-[color:var(--color-text-muted)]">
              {mode === "signup" ? "Already have an account?" : "New to PrismAnalytics?"}{" "}
              <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }} className="font-semibold text-[color:var(--color-brand)] hover:text-[color:var(--color-brand-hover)] hover:underline">
                {mode === "signup" ? "Sign in" : "Create free account"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return { score };
}
