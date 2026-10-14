import { useState } from "react";
import { Receipt as ReceiptIcon } from "lucide-react";
import { Badge, Button, Card, DataTable, Empty, ErrorBox, PageHeader, Spinner, useToast } from "../../components/ui";
import { ReceiptModal } from "../../components/Receipt";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate, inr } from "../../lib/format";
import type { Payment, Plan } from "../../lib/types";

export default function Payments() {
  const { profile } = useAuth();
  const uid = profile!.id;
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [plans, pays] = await Promise.all([
      must<Plan[]>(supabase.from("plans").select("*").eq("active", true).order("price_inr")),
      must<Payment[]>(supabase.from("payments").select("*, plans(name)").eq("member_id", uid).order("created_at", { ascending: false })),
    ]);
    return { plans, pays };
  }, [uid]);

  const pay = async (plan: Plan) => {
    if (!window.Razorpay) return toast("Payment window could not load. Check your connection.", "err");
    setBusy(plan.id);
    const { data: order, error: e } = await supabase.functions.invoke("razorpay-order", { body: { plan_id: plan.id } });
    setBusy(null);
    if (e || order?.error) return toast(order?.error ?? e?.message ?? "Could not start payment", "err");
    const rzp = new window.Razorpay({
      key: order.key_id, amount: order.amount, currency: "INR", name: "VivekFitness", description: order.plan_name, order_id: order.order_id,
      prefill: { name: profile!.full_name, email: profile!.email ?? undefined, contact: profile!.phone ?? undefined },
      theme: { color: "#C6FF2E" },
      handler: () => {
        toast("Payment received. Activating your plan...");
        // the webhook activates the plan; refresh a few times while it lands
        [2500, 6000, 12000].forEach((t) => setTimeout(reload, t));
      },
    });
    rzp.open();
  };

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { plans, pays } = data!;

  return (
    <>
      <PageHeader title="Payments" sub="Renew your plan and download receipts." />
      <h2 className="mb-3 text-2xl font-bold uppercase">Plans</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <p className="font-display text-2xl font-bold uppercase text-white">{p.name}</p>
            <p className="mt-1 font-display text-3xl font-bold text-lime-400">{inr(p.price_inr)}</p>
            <p className="mt-1 flex-1 text-sm text-slate-400">{p.description}</p>
            <Button className="mt-4" onClick={() => pay(p)} loading={busy === p.id}>Pay online</Button>
          </Card>
        ))}
        {!plans.length && <Empty title="No plans available" sub="Please contact the front desk." />}
      </div>
      <h2 className="mb-3 text-2xl font-bold uppercase">History</h2>
      {!pays.length ? <Empty title="No payments yet" /> : (
        <DataTable head={["Date", "Plan", "Amount", "Mode", "Status", ""]}>
          {pays.map((p) => (
            <tr key={p.id}>
              <td className="td">{fmtDate(p.paid_at ?? p.created_at)}</td><td className="td">{p.plans?.name ?? "-"}</td><td className="td">{inr(p.amount_inr)}</td>
              <td className="td capitalize">{p.method}</td>
              <td className="td"><Badge tone={p.status === "paid" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Badge></td>
              <td className="td">{p.status === "paid" && <button onClick={() => setReceipt(p)} className="flex items-center gap-1 text-lime-400 hover:underline"><ReceiptIcon className="h-4 w-4" />Receipt</button>}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <ReceiptModal payment={receipt} memberName={profile!.full_name} onClose={() => setReceipt(null)} />
    </>
  );
}
