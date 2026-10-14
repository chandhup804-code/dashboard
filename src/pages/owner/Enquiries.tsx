import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageCircle, Phone, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate } from "../../lib/format";
import type { Enquiry } from "../../lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  interest: z.string().max(200).optional(),
  source: z.string().max(50).optional(),
});
type Form = z.infer<typeof schema>;
const STATUSES: Enquiry["status"][] = ["new", "contacted", "trial", "converted", "lost"];
const tone = (s: string) => (s === "new" ? "blue" : s === "converted" ? "green" : s === "lost" ? "red" : "amber") as "blue" | "green" | "red" | "amber";

export default function Enquiries() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useAsync(() => must<Enquiry[]>(supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(300)), []);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { source: "walk-in" } });

  const add = async (v: Form) => {
    const { error: e } = await supabase.from("enquiries").insert({ name: v.name, phone: "+91" + v.phone, interest: v.interest || null, source: v.source || "walk-in" });
    if (e) return toast(e.message, "err");
    toast("Enquiry added"); reset(); setOpen(false); reload();
  };
  const setStatus = async (id: string, status: string) => {
    const { error: e } = await supabase.from("enquiries").update({ status }).eq("id", id);
    if (e) toast(e.message, "err"); else reload();
  };
  const del = async (id: string) => {
    if (!confirm("Delete this enquiry?")) return;
    const { error: e } = await supabase.from("enquiries").delete().eq("id", id);
    if (e) toast(e.message, "err"); else reload();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Enquiries" sub="Leads from the website and walk-ins." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add enquiry</Button>} />
      {!data?.length ? <Empty title="No enquiries yet" sub="Website form submissions land here." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-medium text-white">{e.name}</p><p className="text-sm text-slate-400">{e.phone}{e.interest ? ` | ${e.interest}` : ""}</p><p className="text-xs text-slate-500">{e.source} | {fmtDate(e.created_at)}</p></div>
                <Badge tone={tone(e.status)}>{e.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a className="btn btn-ghost" href={`tel:${e.phone}`}><Phone className="h-4 w-4" />Call</a>
                <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/${e.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${e.name}, thanks for your interest in VivekFitness.`)}`}><MessageCircle className="h-4 w-4" />WhatsApp</a>
                <select className="input w-auto py-2" value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)} aria-label="Status">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                <button onClick={() => del(e.id)} aria-label="Delete enquiry" className="ml-auto text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Add enquiry">
        <form onSubmit={handleSubmit(add)} className="grid gap-3" noValidate>
          <Field label="Name" error={errors.name?.message} {...register("name")} />
          <Field label="Mobile number" inputMode="numeric" maxLength={10} error={errors.phone?.message} {...register("phone")} />
          <Field label="Interested in" {...register("interest")} />
          <Field label="Source" {...register("source")} />
          <Button type="submit" loading={isSubmitting}>Save enquiry</Button>
        </form>
      </Modal>
    </>
  );
}
