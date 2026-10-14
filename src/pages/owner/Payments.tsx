import { useState } from "react";
import { Download, Receipt as ReceiptIcon } from "lucide-react";
import { Badge, Button, DataTable, Empty, ErrorBox, PageHeader, Spinner, Stat } from "../../components/ui";
import { ReceiptModal } from "../../components/Receipt";
import { fetchNames, must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { downloadCSV, fmtDate, inr } from "../../lib/format";
import type { Payment } from "../../lib/types";

export default function Payments() {
  const [status, setStatus] = useState("paid");
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await must<Payment[]>(supabase.from("payments").select("*, plans(name)").order("created_at", { ascending: false }).limit(500));
    return { rows, names: await fetchNames(rows.map((r) => r.member_id)) };
  }, []);

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const rows = data!.rows.filter((r) => status === "all" || r.status === status);
  const total = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.amount_inr), 0);
  const csv = () => downloadCSV("vivekfitness-payments.csv", [["Invoice", "Date", "Member", "Plan", "Mode", "Status", "Amount INR"],
    ...rows.map((r) => [r.invoice_no, fmtDate(r.paid_at ?? r.created_at), data!.names[r.member_id], r.plans?.name ?? "", r.method, r.status, Number(r.amount_inr)])]);

  return (
    <>
      <PageHeader title="Payments" sub="Invoices and receipts. Latest 500 shown."
        action={<div className="flex gap-2"><select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="all">All</option></select><Button variant="ghost" onClick={csv}><Download className="h-4 w-4" />CSV</Button></div>} />
      <div className="mb-4 grid grid-cols-2 gap-4 sm:max-w-md"><Stat label="Shown" value={rows.length} /><Stat label="Paid total" value={inr(total)} /></div>
      {!rows.length ? <Empty title="No payments" /> : (
        <DataTable head={["Invoice", "Date", "Member", "Plan", "Mode", "Status", "Amount", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td">{r.invoice_no ?? "-"}</td><td className="td">{fmtDate(r.paid_at ?? r.created_at)}</td><td className="td text-white">{data!.names[r.member_id]}</td>
              <td className="td">{r.plans?.name ?? "-"}</td><td className="td capitalize">{r.method}</td>
              <td className="td"><Badge tone={r.status === "paid" ? "green" : r.status === "pending" ? "amber" : "red"}>{r.status}</Badge></td>
              <td className="td">{inr(r.amount_inr)}</td>
              <td className="td">{r.status === "paid" && <button onClick={() => setReceipt(r)} className="flex items-center gap-1 text-lime-400 hover:underline"><ReceiptIcon className="h-4 w-4" />Invoice</button>}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <ReceiptModal payment={receipt} memberName={receipt ? data!.names[receipt.member_id] : ""} onClose={() => setReceipt(null)} />
    </>
  );
}
