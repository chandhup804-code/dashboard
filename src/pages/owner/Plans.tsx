import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, TextArea, useToast } from "../../components/ui";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { inr } from "../../lib/format";
import type { Plan } from "../../lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a plan name").max(60),
  duration_days: z.coerce.number().int().min(1, "At least 1 day").max(1825),
  price_inr: z.coerce.number().min(0, "Enter a price").max(1000000),
  description: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

export default function Plans() {
  const toast = useToast();
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const { data, loading, error, reload } = useAsync(() => must<Plan[]>(supabase.from("plans").select("*").order("price_inr")), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const open = (p: Plan | "new") => {
    setEditing(p);
    reset(p === "new" ? { name: "", duration_days: 30, price_inr: 0, description: "" } : { name: p.name, duration_days: p.duration_days, price_inr: Number(p.price_inr), description: p.description ?? "" });
  };
  const save = async (v: Form) => {
    const body = { ...v, description: v.description || null };
    const { error: e } = editing === "new" ? await supabase.from("plans").insert(body) : await supabase.from("plans").update(body).eq("id", (editing as Plan).id);
    if (e) return toast(e.message, "err");
    toast("Plan saved"); setEditing(null); reload();
  };
  const toggle = async (p: Plan) => {
    const { error: e } = await supabase.from("plans").update({ active: !p.active }).eq("id", p.id);
    if (e) toast(e.message, "err"); else reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Plans" sub="Members see active plans when they renew." action={<Button onClick={() => open("new")}><Plus className="h-4 w-4" />New plan</Button>} />
      {!data?.length ? <Empty title="No plans yet" sub="Create your first membership plan." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} className={p.active ? "" : "opacity-60"}>
              <div className="flex items-start justify-between"><p className="font-display text-2xl font-bold uppercase text-white">{p.name}</p><Badge tone={p.active ? "green" : "slate"}>{p.active ? "Active" : "Hidden"}</Badge></div>
              <p className="mt-1 font-display text-3xl font-bold text-lime-400">{inr(p.price_inr)}</p>
              <p className="text-sm text-slate-400">{p.duration_days} days</p>
              {p.description && <p className="mt-2 text-sm text-slate-400">{p.description}</p>}
              <div className="mt-4 flex gap-2"><Button variant="ghost" onClick={() => open(p)}><Pencil className="h-4 w-4" />Edit</Button><Button variant="ghost" onClick={() => toggle(p)}>{p.active ? "Hide" : "Show"}</Button></div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New plan" : "Edit plan"}>
        <form onSubmit={handleSubmit(save)} className="grid gap-3 sm:grid-cols-2" noValidate>
          <Field className="sm:col-span-2" label="Plan name" error={errors.name?.message} {...register("name")} />
          <Field label="Duration (days)" type="number" error={errors.duration_days?.message} {...register("duration_days")} />
          <Field label="Price (INR)" type="number" error={errors.price_inr?.message} {...register("price_inr")} />
          <TextArea className="sm:col-span-2" label="Description" error={errors.description?.message} {...register("description")} />
          <Button className="sm:col-span-2" type="submit" loading={isSubmitting}>Save plan</Button>
        </form>
      </Modal>
    </>
  );
}
