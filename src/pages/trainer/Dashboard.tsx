import { Link } from "react-router-dom";
import { CalendarClock, ClipboardCheck, Users } from "lucide-react";
import { Badge, Card, Empty, ErrorBox, PageHeader, Spinner, Stat } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { loadMemberRows } from "../../lib/members";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { daysLeft, fmtDate, todayIST } from "../../lib/format";
import type { Attendance } from "../../lib/types";

export default function Dashboard() {
  const { profile } = useAuth();
  const uid = profile!.id;
  const { data, loading, error, reload } = useAsync(async () => {
    const [rows, att] = await Promise.all([
      loadMemberRows(uid),
      must<Attendance[]>(supabase.from("attendance").select("*").eq("day", todayIST())),
    ]);
    return { rows, att };
  }, [uid]);

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { rows, att } = data!;
  const expiring = rows.filter((r) => r.end && daysLeft(r.end) <= 7).sort((a, b) => a.end!.localeCompare(b.end!));
  const noPlan = rows.filter((r) => !r.end);

  return (
    <>
      <PageHeader title={`Hi ${profile?.full_name.split(" ")[0] || "coach"}`} sub="Your members and today's floor." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Assigned members" value={rows.length} icon={<Users className="h-5 w-5" />} />
        <Stat label="Checked in today" value={att.length} icon={<ClipboardCheck className="h-5 w-5" />} />
        <Stat label="Awaiting verification" value={att.filter((a) => !a.verified_at).length} icon={<CalendarClock className="h-5 w-5" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-bold uppercase">Memberships ending soon</h2></div>
          {!expiring.length ? <Empty title="No one is expiring this week" /> : (
            <ul className="divide-y divide-ink-600/50">
              {expiring.map((r) => (
                <li key={r.m.profile_id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link className="text-white hover:text-lime-300" to={`/trainer/members/${r.m.profile_id}`}>{r.p.full_name || r.p.email || r.p.phone}</Link>
                  <Badge tone={daysLeft(r.end!) < 0 ? "red" : "amber"}>{daysLeft(r.end!) < 0 ? "Expired" : `${daysLeft(r.end!)}d left`} · {fmtDate(r.end)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-2xl font-bold uppercase">Without an active plan</h2>
          {!noPlan.length ? <Empty title="Everyone has an active plan" /> : (
            <ul className="divide-y divide-ink-600/50">
              {noPlan.map((r) => <li key={r.m.profile_id} className="py-2.5 text-sm"><Link className="text-white hover:text-lime-300" to={`/trainer/members/${r.m.profile_id}`}>{r.p.full_name || r.p.email || r.p.phone}</Link></li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
