import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trash2 } from "lucide-react";
import { Button, Card, DataTable, Empty, ErrorBox, Field, PageHeader, Spinner, useToast } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate, todayIST } from "../../lib/format";
import type { ProgressLog } from "../../lib/types";

const opt = z.union([z.literal(""), z.coerce.number().positive("Must be positive")]).optional();
const schema = z.object({
  logged_on: z.string().min(1),
  weight_kg: z.coerce.number().min(20, "Enter weight in kg").max(300),
  body_fat_pct: opt, chest_cm: opt, waist_cm: opt,
  notes: z.string().max(300).optional(),
});
type Form = z.infer<typeof schema>;
const n = (v: number | "" | undefined) => (v === "" || v === undefined ? null : v);

export default function Progress() {
  const uid = useAuth().profile!.id;
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(
    () => must<ProgressLog[]>(supabase.from("progress_logs").select("*").eq("member_id", uid).order("logged_on", { ascending: true })), [uid]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { logged_on: todayIST() } });

  const submit = async (v: Form) => {
    const { error: e } = await supabase.from("progress_logs").insert({
      member_id: uid, logged_by: uid, logged_on: v.logged_on, weight_kg: v.weight_kg,
      body_fat_pct: n(v.body_fat_pct), chest_cm: n(v.chest_cm), waist_cm: n(v.waist_cm), notes: v.notes || null,
    });
    if (e) return toast(e.message, "err");
    toast("Progress saved"); reset({ logged_on: todayIST() } as Form); reload();
  };
  const remove = async (id: string) => {
    const { error: e } = await supabase.from("progress_logs").delete().eq("id", id);
    if (e) toast(e.message, "err"); else reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const rows = data ?? [];
  const chart = rows.filter((r) => r.weight_kg).map((r) => ({ date: fmtDate(r.logged_on), weight: Number(r.weight_kg) }));

  return (
    <>
      <PageHeader title="Progress" sub="Log your measurements and watch the trend." />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-3 text-2xl font-bold uppercase">Weight (kg)</h2>
          {chart.length < 2 ? <Empty title="Add two entries to see your trend" /> : (
            <div className="h-64"><ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}><CartesianGrid stroke="#22304F" strokeDasharray="3 3" /><XAxis dataKey="date" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ background: "#0F182C", border: "1px solid #22304F", borderRadius: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#C6FF2E" strokeWidth={3} dot={{ r: 3, fill: "#C6FF2E" }} /></LineChart>
            </ResponsiveContainer></div>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 text-2xl font-bold uppercase">Add entry</h2>
          <form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-3" noValidate>
            <Field className="col-span-2" label="Date" type="date" max={todayIST()} error={errors.logged_on?.message} {...register("logged_on")} />
            <Field label="Weight (kg)" type="number" step="0.1" inputMode="decimal" error={errors.weight_kg?.message} {...register("weight_kg")} />
            <Field label="Body fat %" type="number" step="0.1" inputMode="decimal" error={errors.body_fat_pct?.message} {...register("body_fat_pct")} />
            <Field label="Chest (cm)" type="number" step="0.1" inputMode="decimal" error={errors.chest_cm?.message} {...register("chest_cm")} />
            <Field label="Waist (cm)" type="number" step="0.1" inputMode="decimal" error={errors.waist_cm?.message} {...register("waist_cm")} />
            <Field className="col-span-2" label="Notes" error={errors.notes?.message} {...register("notes")} />
            <Button className="col-span-2" type="submit" loading={isSubmitting}>Save entry</Button>
          </form>
        </Card>
      </div>
      {rows.length > 0 && (
        <div className="mt-4"><DataTable head={["Date", "Weight", "Body fat", "Chest", "Waist", ""]}>
          {[...rows].reverse().map((r) => (
            <tr key={r.id}><td className="td">{fmtDate(r.logged_on)}</td><td className="td">{r.weight_kg ?? "-"} kg</td><td className="td">{r.body_fat_pct ?? "-"}</td><td className="td">{r.chest_cm ?? "-"}</td><td className="td">{r.waist_cm ?? "-"}</td>
              <td className="td"><button onClick={() => remove(r.id)} aria-label="Delete entry" className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></td></tr>
          ))}
        </DataTable></div>
      )}
    </>
  );
}
