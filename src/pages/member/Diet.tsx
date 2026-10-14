import { Card, Empty, ErrorBox, PageHeader, Spinner } from "../../components/ui";
import { useAuth } from "../../auth/AuthProvider";
import { must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import type { DietPlan } from "../../lib/types";

export default function Diet() {
  const uid = useAuth().profile!.id;
  const { data, loading, error, reload } = useAsync(
    () => must<DietPlan[]>(supabase.from("diet_plans").select("*").eq("member_id", uid).eq("active", true).order("created_at", { ascending: false })), [uid]);
  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Diet" sub="Meals planned by your trainer." />
      {!data?.length ? <Empty title="No diet plan yet" sub="Ask your trainer to assign one." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((d) => (
            <Card key={d.id}>
              <div className="mb-3 flex items-baseline justify-between"><h2 className="text-2xl font-bold uppercase">{d.title}</h2>{d.calories && <span className="text-sm text-lime-400">{d.calories} kcal</span>}</div>
              <ul className="divide-y divide-ink-600/50">
                {d.meals.map((m, i) => (
                  <li key={i} className="py-2.5 text-sm"><div className="flex justify-between"><span className="font-medium text-white">{m.name}</span><span className="text-slate-400">{m.time}</span></div><p className="text-slate-400">{m.items}</p></li>
                ))}
              </ul>
              {d.notes && <p className="mt-3 text-sm text-slate-400">{d.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
