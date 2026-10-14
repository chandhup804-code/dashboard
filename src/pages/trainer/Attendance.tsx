import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Badge, Button, DataTable, Empty, ErrorBox, Field, PageHeader, Spinner, useToast } from "../../components/ui";
import { fetchNames, must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtTime, todayIST } from "../../lib/format";
import type { Attendance as Att } from "../../lib/types";

export default function Attendance() {
  const toast = useToast();
  const [day, setDay] = useState(todayIST());
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await must<Att[]>(supabase.from("attendance").select("*").eq("day", day).order("check_in"));
    return { rows, names: await fetchNames(rows.map((r) => r.member_id)) };
  }, [day]);

  const verify = async (id: string) => {
    const { error: e } = await supabase.rpc("verify_attendance", { att_id: id });
    if (e) toast(e.message, "err"); else { toast("Verified"); reload(); }
  };
  const verifyAll = async () => {
    const pending = (data?.rows ?? []).filter((r) => !r.verified_at);
    const res = await Promise.all(pending.map((r) => supabase.rpc("verify_attendance", { att_id: r.id })));
    const failed = res.filter((r) => r.error).length;
    toast(failed ? `${failed} could not be verified` : "All verified", failed ? "err" : "ok"); reload();
  };

  const pending = (data?.rows ?? []).filter((r) => !r.verified_at).length;
  return (
    <>
      <PageHeader title="Verify attendance" sub="Confirm that members on the floor are the ones checked in."
        action={pending > 0 ? <Button onClick={verifyAll}><BadgeCheck className="h-4 w-4" />Verify all ({pending})</Button> : undefined} />
      <Field className="mb-4 max-w-xs" label="Date" type="date" max={todayIST()} value={day} onChange={(e) => setDay(e.target.value)} />
      {loading && !data ? <div className="grid place-items-center p-10"><Spinner /></div> : error ? <ErrorBox message={error} onRetry={reload} /> :
        !data?.rows.length ? <Empty title="No check-ins for this day" /> : (
          <DataTable head={["Member", "In", "Out", "Status", ""]}>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td className="td text-white">{data.names[r.member_id]}</td><td className="td">{fmtTime(r.check_in)}</td><td className="td">{fmtTime(r.check_out)}</td>
                <td className="td">{r.verified_at ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}</td>
                <td className="td">{!r.verified_at && <button onClick={() => verify(r.id)} className="text-lime-400 hover:underline">Verify</button>}</td>
              </tr>
            ))}
          </DataTable>
        )}
    </>
  );
}
