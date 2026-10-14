import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Crown, Dumbbell, UserCheck } from "lucide-react";
import { useState } from "react";
import { Logo } from "../components/Brand";
import { HeroArt } from "../components/GymArt";
import { Button, Field, useToast } from "../components/ui";
import { supabase } from "../lib/supabase";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  interest: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

export default function Landing() {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const submit = async (v: Form) => {
    const { error } = await supabase.from("enquiries").insert({ name: v.name, phone: "+91" + v.phone, interest: v.interest || null, source: "website" });
    if (error) return toast("Could not send. Please try again.", "err");
    reset(); setDone(true);
  };

  const portals = [
    { to: "/login/member", title: "Member", sub: "Workouts, diet, attendance, payments", icon: <Dumbbell className="h-6 w-6" /> },
    { to: "/login/trainer", title: "Trainer", sub: "Assign plans and verify attendance", icon: <UserCheck className="h-6 w-6" /> },
    { to: "/login/owner", title: "Owner", sub: "Business dashboard and staff", icon: <Crown className="h-6 w-6" /> },
  ];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-4 sm:p-6"><Logo /><Link to="/signup" className="btn btn-primary">Join now</Link></header>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">Train hard.<br />Track everything.</h1>
          <p className="mt-4 max-w-md text-slate-300">Check in, follow your trainer's plan, log progress and pay your membership, all from your phone.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {portals.map((p) => (
              <Link key={p.to} to={p.to} className="card group transition hover:border-lime-400/60 hover:shadow-glow">
                <div className="mb-3 text-lime-400">{p.icon}</div>
                <p className="font-display text-2xl font-bold uppercase text-white">{p.title}</p>
                <p className="mt-1 text-xs text-slate-400">{p.sub}</p>
              </Link>
            ))}
          </div>
        </div>
        <HeroArt className="h-72 rounded-3xl border border-ink-600/60 sm:h-96" />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="card max-w-xl">
          <h2 className="text-3xl font-bold uppercase">Visiting the gym?</h2>
          <p className="mb-4 mt-1 text-sm text-slate-400">Leave your number and we will call you to book a free trial.</p>
          {done ? <p className="text-lime-300">Thanks, we will call you soon.</p> : (
            <form onSubmit={handleSubmit(submit)} className="grid gap-3 sm:grid-cols-2" noValidate>
              <Field label="Name" error={errors.name?.message} {...register("name")} />
              <Field label="Mobile number" inputMode="numeric" maxLength={10} error={errors.phone?.message} {...register("phone")} />
              <Field className="sm:col-span-2" label="What are you looking for?" error={errors.interest?.message} {...register("interest")} />
              <Button type="submit" loading={isSubmitting} className="sm:col-span-2">Request a call</Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
