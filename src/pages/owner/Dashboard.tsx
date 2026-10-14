import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, IndianRupee, Megaphone, UserCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, Empty, ErrorBox, PageHeader, Spinner, Stat } from "../../components/ui";
import { fetchNames, must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtTime, inr, shiftDays, todayIST } from "../../lib/format";
import type { Attendance } from "../../lib/types";

interface Stats { total_members: number; active_members: number; expiring_soon: number; checked_in_today: number; revenue_month: number; new_leads: number; pending_payments: number }
const tip = { contentStyle: { background: "#0F182C", border: "1px solid #22304F", borderRadius: 12 } };
const monthKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date(iso));

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const today = todayIST();
    const from = shiftDays(today, -13);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1);
    const [stats, att, pays] = await Promise.all([
      must<Stats>(supabase.rpc("owner_stats")),
      must<Attendance[]>(supabase.from("attendance").select("*").gte("day", from).order("check_in", { ascending: false }).limit(1000)),
      must<{ amount_inr: number; paid_at: string }[]>(supabase.from("payments").select("amount_inr,paid_at").eq("status", "paid").gte("paid_at", sixMonthsAgo.toISOString()).limit(2000)),
    ]);
    const days = Array.from({ length: 14 }, (_, i) => shiftDays(from, i));
    const attChart = days.map((d) => ({ day: d.slice(5), visits: att.filter((a) => a.day === d).length }));
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months[monthKey(d.toISOString())] = 0; }
    pays.forEach((p) => { const k = monthKey(p.paid_at); if (k in months) months[k] += Number(p.amount_inr); });
    const revChart = Object.entries(months).map(([k, v]) => ({ month: k.slice(2), revenue: v }));
    const todayRows = att.filter((a) => a.day === today).slice(0, 8);
    return { stats, attChart, revChart, todayRows, names: await fetchNames(todayRows.map((r) => r.member_id)) };
  }, []);

  // Live updates: refresh whenever attendance, payments or enquiries change.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const kick = () => { clearTimeout(t); t = setTimeout(reload, 800); };
    const ch = supabase.channel("owner-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "enquiries" }, kick)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [reload]);

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const { stats: s, attChart, revChart, todayRows, names } = data!;

  return (
    <>
      <PageHeader title="Dashboard" sub="Live numbers. Updates as members check in and pay." />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Members" value={s.total_members} icon={<Users className="h-5 w-5" />} />
        <Stat label="Active plans" value={s.active_members} icon={<UserCheck className="h-5 w-5" />} />
        <Stat label="Expiring in 7 days" value={s.expiring_soon} icon={<AlertTriangle className="h-5 w-5" />} />
        <Stat label="In gym today" value={s.checked_in_today} icon={<Activity className="h-5 w-5" />} />
        <Stat label="Revenue this month" value={inr(s.revenue_month)} icon={<IndianRupee className="h-5 w-5" />} />
        <Stat label="New enquiries" value={s.new_leads} icon={<Megaphone className="h-5 w-5" />} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-2xl font-bold uppercase">Revenue, last 6 months</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={revChart}><CartesianGrid stroke="#22304F" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#94a3b8" fontSize={11} /><YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip {...tip} formatter={(v: number) => inr(v)} /><Bar dataKey="revenue" fill="#C6FF2E" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        </Card>
        <Card>
          <h2 className="mb-3 text-2xl font-bold uppercase">Visits, last 14 days</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={attChart}><CartesianGrid stroke="#22304F" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="#94a3b8" fontSize={11} /><YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
              <Tooltip {...tip} /><Bar dataKey="visits" fill="#8FC400" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        </Card>
      </div>
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-bold uppercase">Checked in today</h2><Link to="/owner/attendance" className="text-sm text-lime-400 hover:underline">Full report</Link></div>
        {!todayRows.length ? <Empty title="No check-ins yet today" /> : (
          <ul className="divide-y divide-ink-600/50">
            {todayRows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5 text-sm"><span className="text-white">{names[r.member_id]}</span>
                <span className="flex items-center gap-3 text-slate-400">{fmtTime(r.check_in)}{r.verified_at ? <Badge tone="green">Verified</Badge> : <Badge>Pending</Badge>}</span></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
