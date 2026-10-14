import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, ErrorBox, Field, PageHeader, SelectField, Spinner, useToast } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import type { Member } from "../../lib/types";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(100),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  dob: z.string().optional(),
  height_cm: z.union([z.literal(""), z.coerce.number().min(100).max(250)]).optional(),
  goal: z.string().max(200).optional(),
  emergency_contact: z.string().max(100).optional(),
});
type Form = z.infer<typeof schema>;

export default function Profile() {
  const { profile, refresh } = useAuth();
  const toast = useToast();
  const uid = profile!.id;
  const { data: m, loading, error, reload } = useAsync(() => must<Member>(supabase.from("members").select("*").eq("profile_id", uid).single()), [uid]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    values: m ? { full_name: profile!.full_name, gender: (m.gender as Form["gender"]) ?? "", dob: m.dob ?? "", height_cm: m.height_cm ?? "", goal: m.goal ?? "", emergency_contact: m.emergency_contact ?? "" } : undefined,
  });

  const submit = async (v: Form) => {
    const a = await supabase.from("profiles").update({ full_name: v.full_name }).eq("id", uid);
    const b = await supabase.from("members").update({
      gender: v.gender || null, dob: v.dob || null, height_cm: v.height_cm === "" || v.height_cm === undefined ? null : v.height_cm,
      goal: v.goal || null, emergency_contact: v.emergency_contact || null,
    }).eq("profile_id", uid);
    if (a.error || b.error) return toast((a.error ?? b.error)!.message, "err");
    toast("Profile updated"); await refresh(); reload();
  };

  if (loading && !m) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Profile" sub={m?.member_code ? `Member ID ${m.member_code}` : undefined} />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field className="sm:col-span-2" label="Full name" error={errors.full_name?.message} {...register("full_name")} />
          <Field label="Email" value={profile!.email ?? "Not added"} readOnly disabled />
          <Field label="Mobile" value={profile!.phone ?? "Not added"} readOnly disabled />
          <SelectField label="Gender" {...register("gender")}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></SelectField>
          <Field label="Date of birth" type="date" {...register("dob")} />
          <Field label="Height (cm)" type="number" error={errors.height_cm?.message} {...register("height_cm")} />
          <Field label="Emergency contact" placeholder="Name and number" {...register("emergency_contact")} />
          <Field className="sm:col-span-2" label="Goal" {...register("goal")} />
          <Button className="sm:col-span-2" type="submit" loading={isSubmitting}>Save changes</Button>
        </form>
      </Card>
    </>
  );
}
