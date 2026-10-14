import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BellRing } from "lucide-react";
import { useState } from "react";
import { Button, Card, ErrorBox, Field, PageHeader, Spinner, useToast } from "../../components/ui";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import type { GymSettings } from "../../lib/types";

const schema = z.object({
  gym_name: z.string().trim().min(2).max(80),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  email: z.union([z.literal(""), z.string().email("Enter a valid email")]).optional(),
  gstin: z.string().max(20).optional(),
  reminder_days: z.coerce.number().int().min(1, "1-30").max(30, "1-30"),
});
type Form = z.infer<typeof schema>;

export default function SettingsPage() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(async () => {
    const [s, pending, failed] = await Promise.all([
      must<GymSettings>(supabase.from("gym_settings").select("*").eq("id", 1).single()),
      supabase.from("message_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("message_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
    ]);
    return { s, pending: pending.count ?? 0, failed: failed.count ?? 0 };
  }, []);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    values: data ? { gym_name: data.s.gym_name, address: data.s.address ?? "", phone: data.s.phone ?? "", email: data.s.email ?? "", gstin: data.s.gstin ?? "", reminder_days: data.s.reminder_days } : undefined,
  });

  const save = async (v: Form) => {
    const { error: e } = await supabase.from("gym_settings").update({ ...v, address: v.address || null, phone: v.phone || null, email: v.email || null, gstin: v.gstin || null }).eq("id", 1);
    if (e) toast(e.message, "err"); else { toast("Settings saved"); reload(); }
  };
  const runNow = async () => {
    setBusy(true);
    const { data: n, error: e } = await supabase.rpc("run_daily_automation");
    setBusy(false);
    if (e) return toast(e.message, "err");
    toast(`Expired old plans and queued reminders for ${n} member(s)`); reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Settings" sub="Gym details shown on receipts, and reminder rules." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form onSubmit={handleSubmit(save)} className="grid gap-3 sm:grid-cols-2" noValidate>
            <Field className="sm:col-span-2" label="Gym name" error={errors.gym_name?.message} {...register("gym_name")} />
            <Field className="sm:col-span-2" label="Address" {...register("address")} />
            <Field label="Phone" {...register("phone")} />
            <Field label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <Field label="GSTIN (optional)" {...register("gstin")} />
            <Field label="Remind before expiry (days)" type="number" error={errors.reminder_days?.message} {...register("reminder_days")} />
            <Button className="sm:col-span-2" type="submit" loading={isSubmitting}>Save settings</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-2 text-2xl font-bold uppercase">Reminders</h2>
          <p className="mb-4 text-sm text-slate-400">Reminders run automatically every morning once the daily job is scheduled (see README). Run them now to test.</p>
          <Button onClick={runNow} loading={busy}><BellRing className="h-4 w-4" />Run reminders now</Button>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-ink-900 p-3"><dt className="text-slate-400">Messages waiting</dt><dd className="font-display text-2xl text-white">{data!.pending}</dd></div>
            <div className="rounded-xl bg-ink-900 p-3"><dt className="text-slate-400">Failed to send</dt><dd className="font-display text-2xl text-white">{data!.failed}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Waiting messages are sent by the process-queue function (email and WhatsApp).</p>
        </Card>
      </div>
    </>
  );
}
