import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { Badge, Button, Card, ErrorBox, Field, SelectField, Spinner, useToast } from "../../components/ui";
import MemberDetail from "../trainer/MemberDetail";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate, inr } from "../../lib/format";
import type { Member, Membership, Plan, Profile } from "../../lib/types";

const schema = z.object({
  plan_id: z.string().uuid("Select a plan"),
  amount: z.coerce.number().min(0, "Enter the amount received").max(1000000),
  method: z.enum(["cash", "upi", "card", "bank"]),
  notes: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

export default function MemberPage() {
  const id = useParams().id!;
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [p, m, plans, trainers, ships] = await Promise.all([
      must<Profile>(supabase.from("profiles").select("*").eq("id", id).single()),
      must<Member>(supabase.from("members").select("*").eq("profile_id", id).single()),
      must<Plan[]>(supabase.from("plans").select("*").eq("active", true).order("price_inr")),
      must<Profile[]>(supabase.from("profiles").select("*").eq("role", "trainer").eq("active", true)),
      must<Membership[]>(supabase.from("memberships").select("*, plans(name)").eq("member_id", id).order("end_date", { ascending: false }).limit(10)),
    ]);
    return { p, m, plans, trainers, ships };
  }, [id]);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { method: "cash" } });
  const planId = watch("plan_id");
  useEffect(() => {
    const pl = data?.plans.find((x) => x.id === planId);
    if (pl) setValue("amount", Number(pl.price_inr));
  }, [planId, data, setValue]);

  const assign = async (trainerId: string) => {
    const { error: e } = await supabase.from("members").update({ trainer_id: trainerId || null }).eq("profile_id", id);
    if (e) toast(e.message, "err"); else { toast("Trainer updated"); reload(); }
  };
  const toggleActive = async () => {
    const { error: e } = await supabase.from("profiles").update({ active: !data!.p.active }).eq("id", id);
    if (e) toast(e.message, "err"); else { toast(data!.p.active ? "Member disabled" : "Member enabled"); reload(); }
  };
  const record = async (v: Form) => {
    const { error: e } = await supabase.rpc("record_payment", { p_member: id, p_plan: v.plan_id, p_amount: v.amount, p_method: v.method, p_notes: v.notes || null });
    if (e) return toast(e.message, "err");
    toast("Payment recorded and plan activated"); reset({ method: "cash" } as Form); reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { p, m, plans, trainers, ships } = data!;

  return (
    <>
      <Link to="/owner/members" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Members</Link>
      <MemberDetail memberId={id} />
      <h2 className="mb-3 mt-8 text-3xl font-bold uppercase">Manage</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-2xl font-bold uppercase">Record payment</h3>
          <form onSubmit={handleSubmit(record)} className="grid gap-3 sm:grid-cols-2" noValidate>
            <SelectField className="sm:col-span-2" label="Plan" defaultValue="" error={errors.plan_id?.message} {...register("plan_id")}>
              <option value="" disabled>Select plan</option>{plans.map((x) => <option key={x.id} value={x.id}>{x.name} ({inr(x.price_inr)})</option>)}
            </SelectField>
            <Field label="Amount received (INR)" type="number" inputMode="decimal" error={errors.amount?.message} {...register("amount")} />
            <SelectField label="Mode" {...register("method")}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank">Bank transfer</option></SelectField>
            <Field className="sm:col-span-2" label="Notes" {...register("notes")} />
            <Button className="sm:col-span-2" type="submit" loading={isSubmitting}>Record and activate</Button>
          </form>
        </Card>
        <div className="grid content-start gap-4">
          <Card>
            <h3 className="mb-3 text-2xl font-bold uppercase">Trainer</h3>
            <select className="input" value={m.trainer_id ?? ""} onChange={(e) => assign(e.target.value)} aria-label="Assign trainer">
              <option value="">Unassigned</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
            </select>
            {!trainers.length && <p className="mt-2 text-xs text-slate-500">No trainers yet. Add one under Staff.</p>}
          </Card>
          <Card>
            <h3 className="mb-3 text-2xl font-bold uppercase">Membership history</h3>
            {!ships.length ? <p className="text-sm text-slate-400">No memberships yet.</p> : (
              <ul className="divide-y divide-ink-600/50 text-sm">{ships.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2"><span className="text-white">{s.plans?.name}</span><span className="text-slate-400">{fmtDate(s.start_date)} to {fmtDate(s.end_date)}</span><Badge tone={s.status === "active" ? "green" : "slate"}>{s.status}</Badge></li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <h3 className="mb-2 text-2xl font-bold uppercase">Account</h3>
            <p className="mb-3 text-sm text-slate-400">{p.active ? "Disabling blocks this member from signing in." : "This member is disabled."}</p>
            <Button variant={p.active ? "danger" : "primary"} onClick={toggleActive}>{p.active ? "Disable member" : "Enable member"}</Button>
          </Card>
        </div>
      </div>
    </>
  );
}
