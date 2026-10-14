import { Badge, Card, DataTable, Empty, ErrorBox, PageHeader, Spinner, Stat } from "../../components/ui";
import { CheckInButton } from "../../components/CheckInButton";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate, fmtTime, todayIST } from "../../lib/format";
import type { Attendance as Att } from "../../lib/types";

export default function Attendance() {
  const uid = useAuth().profile!.id;
  const { data, loading, error, reload } = useAsync(
    () => must<Att[]>(supabase.from("attendance").select("*").eq("member_id", uid).order("check_in", { ascending: false }).limit(90)), [uid]);

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const rows = data ?? [];
  const today = rows.find((r) => r.day === todayIST()) ?? null;
  const month = rows.filter((r) => r.day.slice(0, 7) === todayIST().slice(0, 7)).length;

  return (
    <>
      <PageHeader title="Attendance" sub="Check in when you arrive. Your trainer verifies visits." />
      <Card className="mb-4"><CheckInButton today={today} onDone={reload} /></Card>
      <div className="mb-4 grid grid-cols-2 gap-4"><Stat label="This month" value={month} /><Stat label="Last 90 days" value={rows.length} /></div>
      {rows.length === 0 ? <Empty title="No visits yet" sub="Your first check-in will show up here." /> : (
        <DataTable head={["Date", "In", "Out", "Verified"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="td">{fmtDate(r.day)}</td><td className="td">{fmtTime(r.check_in)}</td><td className="td">{fmtTime(r.check_out)}</td>
              <td className="td">{r.verified_at ? <Badge tone="green">Verified</Badge> : <Badge>Pending</Badge>}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
