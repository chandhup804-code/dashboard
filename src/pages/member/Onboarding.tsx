import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Logo } from "../../components/Brand";
import { Button, Field, SelectField, useToast } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(100),
  gender: z.enum(["male", "female", "other"], { errorMap: () => ({ message: "Select one" }) }),
  dob: z.string().min(1, "Enter your date of birth"),
  height_cm: z.coerce.number().min(100, "Between 100 and 250").max(250, "Between 100 and 250"),
  goal: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

export default function Onboarding() {
  const { profile, session, refresh } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { full_name: profile?.full_name ?? "" },
  });

  const submit = async (v: Form) => {
    const uid = session!.user.id;
    const a = await supabase.from("profiles").update({ full_name: v.full_name }).eq("id", uid);
    const b = await supabase.from("members").update({ gender: v.gender, dob: v.dob, height_cm: v.height_cm, goal: v.goal || null }).eq("profile_id", uid);
    if (a.error || b.error) return toast((a.error ?? b.error)!.message, "err");
    await refresh();
    navigate("/member", { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-5">
      <Logo />
      <div>
        <h1 className="text-4xl font-bold uppercase">Welcome aboard</h1>
        <p className="mt-1 text-sm text-slate-400">Tell us a little about you so your trainer can build the right plan.</p>
      </div>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
        <Field label="Full name" error={errors.full_name?.message} {...register("full_name")} />
        <SelectField label="Gender" error={errors.gender?.message} defaultValue="" {...register("gender")}>
          <option value="" disabled>Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
        </SelectField>
        <Field label="Date of birth" type="date" error={errors.dob?.message} {...register("dob")} />
        <Field label="Height (cm)" type="number" inputMode="decimal" error={errors.height_cm?.message} {...register("height_cm")} />
        <Field label="Your goal" placeholder="Lose fat, build muscle, stay fit" error={errors.goal?.message} {...register("goal")} />
        <Button type="submit" loading={isSubmitting}>Start training</Button>
      </form>
    </main>
  );
}
