import { Badge, Card, Empty, ErrorBox, PageHeader, Spinner } from "../../components/ui";
import { fetchNames, must, supabase } from "../../lib/supabase";
import { useAsync } from "../../lib/useAsync";
import { fmtDateTime } from "../../lib/format";

interface Log { id: number; actor_id: string | null; action: string; table_name: string; row_id: string | null; old_data: unknown; new_data: unknown; created_at: string }

export default function Audit() {
  const { data, loading, error, reload } = useAsync(async () => {
    const rows = await must<Log[]>(supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200));
    return { rows, names: await fetchNames(rows.map((r) => r.actor_id ?? "")) };
  }, []);
  if (loading && !data) return <div className="grid place-items-center p-10"><Spinner /></div>;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Audit log" sub="Latest 200 changes to members, plans, payments and settings. Read-only." />
      {!data?.rows.length ? <Empty title="No activity recorded yet" /> : (
        <div className="grid gap-2">
          {data.rows.map((r) => (
            <Card key={r.id} className="!p-3">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Badge tone={r.action === "DELETE" ? "red" : r.action === "INSERT" ? "green" : "amber"}>{r.action}</Badge>
                  <span className="text-white">{r.table_name}</span>
                  <span className="text-slate-400">by {r.actor_id ? data.names[r.actor_id] ?? "Unknown" : "System"}</span>
                  <span className="ml-auto text-xs text-slate-500">{fmtDateTime(r.created_at)}</span>
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-ink-900 p-3 text-xs text-slate-300">{JSON.stringify({ before: r.old_data, after: r.new_data }, null, 2)}</pre>
              </details>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
