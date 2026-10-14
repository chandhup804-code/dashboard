import { Printer } from "lucide-react";
import { Button, Modal } from "./ui";
import { fmtDate, fmtDateTime, inr } from "../lib/format";
import { supabase, must } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import type { GymSettings, Payment } from "../lib/types";

export function ReceiptModal({ payment, memberName, onClose }: { payment: Payment | null; memberName: string; onClose: () => void }) {
  const { data: gym } = useAsync(() => must<GymSettings>(supabase.from("gym_settings").select("*").eq("id", 1).single()), []);
  return (
    <Modal open={!!payment} onClose={onClose} title="Receipt">
      {payment && (
        <>
          <div className="print-area rounded-xl border border-ink-600 p-5 text-sm">
            <div className="mb-4 border-b border-ink-600 pb-3">
              <p className="font-display text-2xl font-bold uppercase text-white">{gym?.gym_name ?? "VivekFitness"}</p>
              {gym?.address && <p className="text-slate-400">{gym.address}</p>}
              {gym?.phone && <p className="text-slate-400">Phone: {gym.phone}</p>}
              {gym?.gstin && <p className="text-slate-400">GSTIN: {gym.gstin}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-slate-400">Invoice no.</dt><dd className="text-right font-medium text-white">{payment.invoice_no ?? "Pending"}</dd>
              <dt className="text-slate-400">Date</dt><dd className="text-right">{fmtDateTime(payment.paid_at ?? payment.created_at)}</dd>
              <dt className="text-slate-400">Member</dt><dd className="text-right">{memberName}</dd>
              <dt className="text-slate-400">Plan</dt><dd className="text-right">{payment.plans?.name ?? "-"}</dd>
              <dt className="text-slate-400">Payment mode</dt><dd className="text-right capitalize">{payment.method}</dd>
              <dt className="text-slate-400">Status</dt><dd className="text-right capitalize">{payment.status}</dd>
              <dt className="border-t border-ink-600 pt-2 text-base text-white">Amount paid</dt>
              <dd className="border-t border-ink-600 pt-2 text-right text-base font-bold text-white">{inr(payment.amount_inr)}</dd>
            </dl>
            <p className="mt-4 text-xs text-slate-500">Generated on {fmtDate(new Date())}. This is a computer-generated receipt.</p>
          </div>
          <div className="no-print mt-4 flex justify-end">
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save as PDF</Button>
          </div>
        </>
      )}
    </Modal>
  );
}
