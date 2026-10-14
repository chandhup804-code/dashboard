import { Card, Empty, ErrorBox, PageHeader, Spinner } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDate } from "../../lib/format";
import type { WorkoutPlan } from "../../lib/types";

export default function Workouts() {
  const uid = useAuth().profile!.id;
  const { data, loading, error, reload } = useAsync(
    () => must<WorkoutPlan[]>(supabase.from("workout_plans").select("*").eq("member_id", uid).eq("active", true).order("created_at", { ascending: false })), [uid]);
  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Workouts" sub="Plans from your trainer." />
      {!data?.length ? <Empty title="No workout plan yet" sub="Ask your trainer to assign one." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((w) => (
            <Card key={w.id}>
              <div className="mb-3 flex items-baseline justify-between"><h2 className="text-2xl font-bold uppercase">{w.title}</h2><span className="text-sm text-lime-400">{w.day_label}</span></div>
              <ul className="divide-y divide-ink-600/50">
                {w.exercises.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="text-white">{e.name}{e.notes && <span className="block text-xs text-slate-500">{e.notes}</span>}</span>
                    <span className="shrink-0 text-slate-400">{e.sets} x {e.reps}{e.rest_sec ? `, rest ${e.rest_sec}s` : ""}</span>
                  </li>
                ))}
              </ul>
              {w.notes && <p className="mt-3 text-sm text-slate-400">{w.notes}</p>}
              <p className="mt-3 text-xs text-slate-500">Assigned {fmtDate(w.created_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
