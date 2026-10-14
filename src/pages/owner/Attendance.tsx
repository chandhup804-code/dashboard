import { useState } from "react";
import { Download } from "lucide-react";
import { Badge, Button, DataTable, Empty, ErrorBox, Field, PageHeader, Spinner, Stat } from "../../components/ui";
import { fetchNames, must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { downloadCSV, fmtDate, fmtTime, shiftDays, todayIST } from "../../lib/format";
import type { Attendance as Att } from "../../lib/types";

export default function Attendance() {
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(todayIST());
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await must<Att[]>(supabase.from("attendance").select("*").gte("day", from).lte("day", to).order("check_in", { ascending: false }).limit(2000));
    return { rows, names: await fetchNames(rows.map((r) => r.member_id)) };
  }, [from, to]);

  const rows = data?.rows ?? [];
  const unique = new Set(rows.map((r) => r.member_id)).size;
  const csv = () => downloadCSV(`attendance-${from}-to-${to}.csv`, [["Date", "Member", "Check in", "Check out", "Verified"],
    ...rows.map((r) => [r.day, data!.names[r.member_id], fmtTime(r.check_in), fmtTime(r.check_out), r.verified_at ? "Yes" : "No"])]);

  return (
    <>
      <PageHeader title="Attendance" sub="Reports by date range." action={<Button variant="ghost" onClick={csv} disabled={!rows.length}><Download className="h-4 w-4" />CSV</Button>} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From" type="date" max={to} value={from} onChange={(e) => setFrom(e.target.value)} />
        <Field label="To" type="date" min={from} max={todayIST()} value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="ghost" onClick={() => { setFrom(shiftDays(todayIST(), -6)); setTo(todayIST()); }}>Last 7 days</Button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:max-w-md"><Stat label="Visits" value={rows.length} /><Stat label="Unique members" value={unique} /></div>
      {loading && !data ? <div className="grid place-items-center p-10"><Spinner /></div> : error ? <ErrorBox message={error} onRetry={reload} /> :
        !rows.length ? <Empty title="No visits in this range" /> : (
          <DataTable head={["Date", "Member", "In", "Out", "Verified"]}>
            {rows.map((r) => (
              <tr key={r.id}><td className="td">{fmtDate(r.day)}</td><td className="td text-white">{data!.names[r.member_id]}</td><td className="td">{fmtTime(r.check_in)}</td><td className="td">{fmtTime(r.check_out)}</td>
                <td className="td">{r.verified_at ? <Badge tone="green">Verified</Badge> : <Badge>Pending</Badge>}</td></tr>
            ))}
          </DataTable>
        )}
    </>
  );
}
