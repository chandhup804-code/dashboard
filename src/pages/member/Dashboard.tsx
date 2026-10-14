import { Link } from "react-router-dom";
import { CalendarCheck, Flame, Timer } from "lucide-react";
import { Badge, Card, ErrorBox, PageHeader, Spinner, Stat } from "../../components/ui";
import { CheckInButton } from "../../components/CheckInButton";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { daysLeft, fmtDate, todayIST } from "../../lib/format";
import type { Attendance, Membership, WorkoutPlan } from "../../lib/types";

export default function Dashboard() {
  const { profile } = useAuth();
  const uid = profile!.id;
  const { data, loading, error, reload } = useAsync(async () => {
    const monthStart = todayIST().slice(0, 8) + "01";
    const [ms, att, wk, cnt] = await Promise.all([
      must<Membership[]>(supabase.from("memberships").select("*, plans(name)").eq("member_id", uid).order("end_date", { ascending: false }).limit(1)),
      must<Attendance[]>(supabase.from("attendance").select("*").eq("member_id", uid).eq("day", todayIST()).order("check_in", { ascending: false }).limit(1)),
      must<WorkoutPlan[]>(supabase.from("workout_plans").select("*").eq("member_id", uid).eq("active", true).order("created_at", { ascending: false }).limit(1)),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("member_id", uid).gte("day", monthStart),
    ]);
    return { membership: ms[0] ?? null, today: att[0] ?? null, workout: wk[0] ?? null, visits: cnt.count ?? 0 };
  }, [uid]);

  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const m = data!.membership;
  const left = m ? daysLeft(m.end_date) : null;
  const active = m && m.status === "active" && left !== null && left >= 0;

  return (
    <>
      <PageHeader title={`Hey ${profile?.full_name.split(" ")[0] || "there"}`} sub="Here is your day at a glance." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Membership</p>
              <p className="font-display text-3xl font-bold text-white">{m ? m.plans?.name : "No plan yet"}</p>
              {m && <p className="text-sm text-slate-400">{active ? `Valid till ${fmtDate(m.end_date)}` : `Ended on ${fmtDate(m.end_date)}`}</p>}
            </div>
            {active ? <Badge tone={left! <= 7 ? "amber" : "green"}>{left} days left</Badge> : <Badge tone="red">{m ? "Expired" : "Inactive"}</Badge>}
          </div>
          {!active && <Link to="/member/payments" className="btn btn-primary mt-4">Choose a plan</Link>}
          {active && left! <= 7 && <Link to="/member/payments" className="btn btn-ghost mt-4">Renew now</Link>}
          <div className="mt-5 border-t border-ink-600/60 pt-4">
            <p className="mb-3 text-sm font-medium text-white">Today</p>
            {active ? <CheckInButton today={data!.today} onDone={reload} /> : <p className="text-sm text-slate-400">Renew your plan to check in.</p>}
          </div>
        </Card>
        <div className="grid gap-4">
          <Stat label="Visits this month" value={data!.visits} icon={<Flame className="h-5 w-5" />} />
          <Stat label="Days left" value={active ? left : 0} icon={<Timer className="h-5 w-5" />} />
        </div>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold uppercase">Today's workout</h2>
          <Link to="/member/workouts" className="text-sm text-lime-400 hover:underline">All plans</Link>
        </div>
        {data!.workout ? (
          <>
            <p className="font-medium text-white">{data!.workout.title} <span className="text-slate-400">({data!.workout.day_label})</span></p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {data!.workout.exercises.slice(0, 6).map((e, i) => (
                <li key={i} className="flex justify-between rounded-xl bg-ink-900 px-3 py-2 text-sm"><span>{e.name}</span><span className="text-slate-400">{e.sets} x {e.reps}</span></li>
              ))}
            </ul>
          </>
        ) : <p className="text-sm text-slate-400"><CalendarCheck className="mr-1 inline h-4 w-4" />Your trainer has not assigned a workout yet.</p>}
      </Card>
    </>
  );
}
