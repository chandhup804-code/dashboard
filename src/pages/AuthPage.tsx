import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, ArrowLeft } from "lucide-react";
import { Logo } from "../components/Brand";
import { HeroArt } from "../components/GymArt";
import { Button, Field } from "../components/ui";
import { supabase } from "../lib/supabase";
import { toPhone } from "../lib/format";
import { useAuth } from "../auth/AuthProvider";
import type { Role } from "../lib/types";

const COPY: Record<Role, { title: string; sub: string }> = {
  member: { title: "Member login", sub: "Your workouts, diet and progress in one place." },
  trainer: { title: "Trainer login", sub: "Manage your members and plans." },
  owner: { title: "Owner login", sub: "Run your gym with live numbers." },
};

const friendly = (m: string) => {
  const s = m.toLowerCase();
  if (s.includes("invalid login")) return "Email or password is incorrect.";
  if (s.includes("already registered")) return "This email already has an account. Sign in instead.";
  if (s.includes("email not confirmed")) return "Confirm your email first. Check your inbox.";
  if (s.includes("token has expired") || s.includes("invalid")) return "That code is wrong or expired. Request a new one.";
  if (s.includes("rate") || s.includes("seconds")) return "Too many attempts. Wait a minute and try again.";
  if (s.includes("signups not allowed")) return "No account found for this login. Members can create one from Sign up.";
  return m;
};

const emailSchema = z.object({
  full_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type EmailForm = z.infer<typeof emailSchema>;
const phoneSchema = z.object({ phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number") });
const otpSchema = z.object({ otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

export default function AuthPage({ forceSignup = false }: { forceSignup?: boolean }) {
  const params = useParams();
  const portal: Role = forceSignup ? "member" : (params.portal as Role);
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [mode, setMode] = useState<"signin" | "signup">(forceSignup ? "signup" : "signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [otpPhone, setOtpPhone] = useState<string | null>(null);

  // After any successful auth: send the person to the portal that matches their role.
  useEffect(() => {
    if (!session || !profile) return;
    if (profile.active && profile.role === portal) { navigate(`/${portal}`, { replace: true }); return; }
    setError(profile.active
      ? `This is a ${profile.role} account. Please use the ${profile.role} login.`
      : "This account is disabled. Please contact the gym.");
    supabase.auth.signOut();
  }, [session, profile, portal, navigate]);

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const phoneForm = useForm<{ phone: string }>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<{ otp: string }>({ resolver: zodResolver(otpSchema) });

  if (!["member", "trainer", "owner"].includes(portal)) return <Navigate to="/" replace />;
  const canSignup = portal === "member";
  const origin = window.location.origin;

  const submitEmail = async (v: EmailForm) => {
    setError(null); setNotice(null);
    if (mode === "signup") {
      if (v.password.length < 8) return emailForm.setError("password", { message: "Use at least 8 characters" });
      if (!v.full_name || v.full_name.length < 2) return emailForm.setError("full_name", { message: "Enter your name" });
      const { data, error: e } = await supabase.auth.signUp({
        email: v.email, password: v.password,
        options: { data: { full_name: v.full_name }, emailRedirectTo: `${origin}/login/member` },
      });
      if (e) return setError(friendly(e.message));
      if (!data.session) setNotice("Account created. Check your email and tap the confirmation link to continue.");
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
      if (e) setError(friendly(e.message));
    }
  };

  const magicLink = async () => {
    setError(null); setNotice(null);
    const ok = await emailForm.trigger("email");
    if (!ok) return;
    const { error: e } = await supabase.auth.signInWithOtp({
      email: emailForm.getValues("email"),
      options: { shouldCreateUser: canSignup, emailRedirectTo: `${origin}/login/${portal}` },
    });
    if (e) setError(friendly(e.message)); else setNotice("Sign-in link sent. Open it on this device.");
  };

  const sendOtp = async (v: { phone: string }) => {
    setError(null); setNotice(null);
    const phone = toPhone(v.phone);
    const { error: e } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: canSignup } });
    if (e) return setError(friendly(e.message));
    setOtpPhone(phone); setNotice(`Code sent to ${phone}.`);
  };

  const verifyOtp = async (v: { otp: string }) => {
    if (!otpPhone) return;
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ phone: otpPhone, token: v.otp, type: "sms" });
    if (e) setError(friendly(e.message));
  };

  const copy = mode === "signup" ? { title: "Create your account", sub: "New member? It takes a minute." } : COPY[portal];

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <HeroArt className={`${portal === "member" ? "h-52" : "h-32"} lg:h-auto lg:min-h-dvh`} />
      <main className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Home</Link>
        </div>
        <div>
          <h1 className="text-4xl font-bold uppercase">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{copy.sub}</p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-800 p-1" role="tablist">
          {(["email", "phone"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={method === m} onClick={() => { setMethod(m); setError(null); setNotice(null); }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold ${method === m ? "bg-lime-400 text-ink-950" : "text-slate-300"}`}>
              {m === "email" ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}{m === "email" ? "Email" : "Phone OTP"}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-sm text-lime-200">{notice}</div>}

        {method === "email" ? (
          <form onSubmit={emailForm.handleSubmit(submitEmail)} className="grid gap-4" noValidate>
            {mode === "signup" && <Field label="Full name" autoComplete="name" error={emailForm.formState.errors.full_name?.message} {...emailForm.register("full_name")} />}
            <Field label="Email" type="email" autoComplete="email" error={emailForm.formState.errors.email?.message} {...emailForm.register("email")} />
            <Field label="Password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} error={emailForm.formState.errors.password?.message} hint={mode === "signup" ? "At least 8 characters" : undefined} {...emailForm.register("password")} />
            <Button type="submit" loading={emailForm.formState.isSubmitting || loading}>{mode === "signup" ? "Create account" : "Sign in"}</Button>
            <Button type="button" variant="ghost" onClick={magicLink}>Email me a sign-in link instead</Button>
          </form>
        ) : !otpPhone ? (
          <form onSubmit={phoneForm.handleSubmit(sendOtp)} className="grid gap-4" noValidate>
            <div>
              <label htmlFor="phone" className="label">Mobile number</label>
              <div className="flex gap-2">
                <span className="input w-16 shrink-0 text-center">+91</span>
                <input id="phone" inputMode="numeric" maxLength={10} autoComplete="tel-national" className="input" placeholder="98765 43210" {...phoneForm.register("phone")} />
              </div>
              {phoneForm.formState.errors.phone && <p className="mt-1 text-xs text-red-400">{phoneForm.formState.errors.phone.message}</p>}
            </div>
            <Button type="submit" loading={phoneForm.formState.isSubmitting}>Send OTP</Button>
            {canSignup && <p className="text-xs text-slate-500">New number? An account is created automatically after you verify.</p>}
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(verifyOtp)} className="grid gap-4" noValidate>
            <Field label="6-digit code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" error={otpForm.formState.errors.otp?.message} {...otpForm.register("otp")} />
            <Button type="submit" loading={otpForm.formState.isSubmitting}>Verify and continue</Button>
            <Button type="button" variant="ghost" onClick={() => { setOtpPhone(null); setNotice(null); }}>Use a different number</Button>
          </form>
        )}

        {canSignup ? (
          <p className="text-center text-sm text-slate-400">
            {mode === "signin" ? "New here?" : "Already a member?"}{" "}
            <button className="font-semibold text-lime-400 hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}>
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        ) : (
          <p className="text-center text-xs text-slate-500">
            {portal === "trainer" ? "New trainer? Sign up as a member first, then ask the gym owner to enable trainer access." : "Owner access is granted by the person who set up this system."}
          </p>
        )}
        <p className="text-center text-xs text-slate-500">
          {(["member", "trainer", "owner"] as Role[]).filter((r) => r !== portal).map((r, i) => (
            <span key={r}>{i > 0 && " · "}<Link className="hover:text-white" to={`/login/${r}`}>{COPY[r].title}</Link></span>
          ))}
        </p>
      </main>
    </div>
  );
}
